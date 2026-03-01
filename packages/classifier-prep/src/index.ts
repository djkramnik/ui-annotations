import {
  CreateTrainingJobCommand,
  CreateTrainingJobCommandInput,
  SageMakerClient,
  TrainingInstanceType,
} from '@aws-sdk/client-sagemaker';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from 'annotation_schema';
import dotenv = require('dotenv');

dotenv.config();

type InteractiveRow = {
  id: number;
  label: string | null;
  image_data: Buffer;
};

type Config = {
  screenTag?: string;
  labels?: string[];
  trainSplit: number;
  runName: string;
  region: string;
  bucket: string;
  datasetS3Uri: string;
  outputS3Uri: string;
  sagemakerRoleArn: string;
  imageUri: string;
  jobName: string;
  instanceType: TrainingInstanceType;
  instanceCount: number;
  volumeSizeGb: number;
  maxRuntimeSeconds: number;
  skipDataUpload: boolean;
  skipTrainingJob: boolean;
};

const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

function utcTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(
    d.getUTCHours(),
  )}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseConfig(): Config {
  const screenTag = process.env.SCREEN_TAG;
  const labels = process.env.LABELS?.split(',').map(s => s.trim()).filter(Boolean);
  const runName = process.env.CLASSIFIER_RUN_NAME ?? `classifier-${utcTimestamp()}`;
  const region = required('AWS_REGION');
  const bucket = required('AWS_S3_BUCKET');
  const datasetS3Uri = process.env.AWS_SAGEMAKER_DATASET_URI ?? `s3://${bucket}/classifier/${runName}`;
  const outputS3Uri =
    process.env.AWS_SAGEMAKER_OUTPUT_URI ?? `s3://${bucket}/classifier-models/${runName}`;
  const sagemakerRoleArn = required('AWS_SAGEMAKER_ROLE_ARN');
  const imageUri = required('AWS_SAGEMAKER_IMAGE_URI');
  const trainSplitRaw = Number(process.env.TRAIN_SPLIT ?? '0.8');
  const trainSplit = Number.isFinite(trainSplitRaw) ? Math.min(Math.max(trainSplitRaw, 0.1), 0.95) : 0.8;
  const skipDataUpload = process.env.SKIP_DATA_UPLOAD === 'true';
  const skipTrainingJob = process.env.SKIP_TRAINING_JOB === 'true';
  const instanceType = (process.env.AWS_SAGEMAKER_INSTANCE_TYPE ??
    'ml.g5.xlarge') as TrainingInstanceType;
  const instanceCount = Number(process.env.AWS_SAGEMAKER_INSTANCE_COUNT ?? '1');
  const volumeSizeGb = Number(process.env.AWS_SAGEMAKER_VOLUME_SIZE_GB ?? '100');
  const maxRuntimeSeconds = Number(process.env.AWS_SAGEMAKER_MAX_RUNTIME_SECONDS ?? '7200');

  return {
    screenTag,
    labels,
    trainSplit,
    runName,
    region,
    bucket,
    datasetS3Uri,
    outputS3Uri,
    sagemakerRoleArn,
    imageUri,
    jobName: `${(screenTag ?? 'classifier').replace(/_/g, '-')}-${utcTimestamp()}`.slice(0, 63),
    instanceType,
    instanceCount,
    volumeSizeGb,
    maxRuntimeSeconds,
    skipDataUpload,
    skipTrainingJob,
  };
}

function parseS3Uri(s3Uri: string): { bucket: string; prefix: string } {
  const match = s3Uri.match(/^s3:\/\/([^/]+)\/?(.*)$/);
  if (!match) {
    throw new Error(`Invalid S3 URI: ${s3Uri}`);
  }
  return {
    bucket: match[1],
    prefix: (match[2] ?? '').replace(/^\/+|\/+$/g, ''),
  };
}

function sanitizeLabel(value: string): string {
  const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'unknown';
}

function buildLabelMap(labels: string[]): Map<string, string> {
  const seen = new Set<string>();
  const out = new Map<string, string>();

  for (const label of labels.sort()) {
    const base = sanitizeLabel(label);
    let candidate = base;
    let i = 1;
    while (seen.has(candidate)) {
      candidate = `${base}-${i}`;
      i += 1;
    }
    seen.add(candidate);
    out.set(label, candidate);
  }
  return out;
}

function detectImageType(bytes: Buffer): { contentType: string; ext: string } {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return { contentType: 'application/octet-stream', ext: 'bin' };
}

function splitRows(rows: InteractiveRow[], ratio: number): { train: InteractiveRow[]; validation: InteractiveRow[] } {
  const byLabel = new Map<string, InteractiveRow[]>();
  for (const row of rows) {
    if (!row.label) continue;
    if (!byLabel.has(row.label)) byLabel.set(row.label, []);
    byLabel.get(row.label)!.push(row);
  }

  const train: InteractiveRow[] = [];
  const validation: InteractiveRow[] = [];

  for (const labelRows of byLabel.values()) {
    labelRows.sort((a, b) => a.id - b.id);
    const splitAt = Math.max(1, Math.floor(labelRows.length * ratio));
    train.push(...labelRows.slice(0, splitAt));
    validation.push(...labelRows.slice(splitAt));
  }

  if (validation.length === 0 && train.length > 1) {
    validation.push(train.pop()!);
  }

  return { train, validation };
}

async function getInteractiveRows(config: Config): Promise<InteractiveRow[]> {
  const rows = await prisma.interactive.findMany({
    where: {
      label: {
        not: null,
        ...(config.labels?.length ? { in: config.labels } : {}),
      },
      ...(config.screenTag ? { screenshot: { is: { tag: config.screenTag } } } : {}),
    },
    select: {
      id: true,
      label: true,
      image_data: true,
    },
  });
  return rows as InteractiveRow[];
}

async function uploadDataset(rows: InteractiveRow[], config: Config): Promise<void> {
  const { bucket, prefix } = parseS3Uri(config.datasetS3Uri);
  const labels = Array.from(new Set(rows.map(r => r.label).filter((x): x is string => !!x)));
  const labelMap = buildLabelMap(labels);
  const split = splitRows(rows, config.trainSplit);

  const uploadConcurrency = Math.max(1, Number(process.env.UPLOAD_CONCURRENCY ?? '20'));
  const pending: Array<Promise<void>> = [];

  const queueUpload = async (channel: 'training' | 'validation', row: InteractiveRow) => {
    const label = row.label!;
    const mappedLabel = labelMap.get(label)!;
    const imageType = detectImageType(row.image_data);
    const key = `${prefix}/${channel}/${mappedLabel}/${row.id}.${imageType.ext}`.replace(/^\/+/, '');
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: row.image_data,
        ContentType: imageType.contentType,
      }),
    );
  };

  const enqueue = async (channel: 'training' | 'validation', row: InteractiveRow) => {
    const p = queueUpload(channel, row);
    pending.push(p);
    if (pending.length >= uploadConcurrency) {
      await Promise.all(pending);
      pending.length = 0;
    }
  };

  for (const row of split.train) {
    await enqueue('training', row);
  }
  for (const row of split.validation) {
    await enqueue('validation', row);
  }
  if (pending.length > 0) {
    await Promise.all(pending);
  }

  const labelsJsonKey = `${prefix}/labels.json`;
  const labelMapObject = Object.fromEntries(labelMap.entries());
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: labelsJsonKey,
      Body: JSON.stringify(labelMapObject, null, 2),
      ContentType: 'application/json',
    }),
  );

  console.log(`Uploaded dataset to s3://${bucket}/${prefix}`);
  console.log(`training examples: ${split.train.length}`);
  console.log(`validation examples: ${split.validation.length}`);
}

async function startTrainingJob(config: Config): Promise<void> {
  const client = new SageMakerClient({ region: config.region });

  const params: CreateTrainingJobCommandInput = {
    TrainingJobName: config.jobName,
    RoleArn: config.sagemakerRoleArn,
    AlgorithmSpecification: {
      TrainingImage: config.imageUri,
      TrainingInputMode: 'File',
    },
    InputDataConfig: [
      {
        ChannelName: 'training',
        DataSource: {
          S3DataSource: {
            S3DataType: 'S3Prefix',
            S3Uri: `${config.datasetS3Uri}/training`,
            S3DataDistributionType: 'FullyReplicated',
          },
        },
      },
      {
        ChannelName: 'validation',
        DataSource: {
          S3DataSource: {
            S3DataType: 'S3Prefix',
            S3Uri: `${config.datasetS3Uri}/validation`,
            S3DataDistributionType: 'FullyReplicated',
          },
        },
      },
    ],
    OutputDataConfig: {
      S3OutputPath: config.outputS3Uri,
    },
    ResourceConfig: {
      InstanceType: config.instanceType,
      InstanceCount: config.instanceCount,
      VolumeSizeInGB: config.volumeSizeGb,
    },
    StoppingCondition: {
      MaxRuntimeInSeconds: config.maxRuntimeSeconds,
    },
    Environment: {
      MODEL_DIR: '/opt/ml/model',
      MODEL_NAME: process.env.MODEL_NAME ?? 'vit_base_patch16_224',
      EPOCHS: process.env.EPOCHS ?? '5',
      BATCH_SIZE: process.env.BATCH_SIZE ?? '32',
      LEARNING_RATE: process.env.LEARNING_RATE ?? '0.0003',
      WEIGHT_DECAY: process.env.WEIGHT_DECAY ?? '0.01',
      IMAGE_SIZE: process.env.IMAGE_SIZE ?? '224',
      NUM_WORKERS: process.env.NUM_WORKERS ?? '4',
    },
  };

  console.log('Submitting SageMaker training job:', {
    trainingJobName: config.jobName,
    datasetS3Uri: config.datasetS3Uri,
    outputS3Uri: config.outputS3Uri,
    imageUri: config.imageUri,
    instanceType: config.instanceType,
  });

  await client.send(new CreateTrainingJobCommand(params));
}

async function main(): Promise<void> {
  const config = parseConfig();
  console.log('classifier-prep config:', config);

  if (!config.skipDataUpload) {
    const rows = await getInteractiveRows(config);
    if (rows.length === 0) {
      throw new Error('No interactive rows found with non-null label for current filters.');
    }
    await uploadDataset(rows, config);
  }

  if (config.skipTrainingJob) {
    console.log('SKIP_TRAINING_JOB=true; skipping SageMaker training job submission.');
    return;
  }

  await startTrainingJob(config);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
