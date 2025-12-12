// src/aws/startYoloTrainingJob.ts
import {
  SageMakerClient,
  CreateTrainingJobCommand,
  CreateTrainingJobCommandInput,
  TrainingInstanceType,
} from '@aws-sdk/client-sagemaker'

export interface YoloTrainingJobConfig {
  region: string
  sagemakerRoleArn: string
  datasetS3Uri: string
  outputS3Uri: string
  imageUri: string
  jobName: string
  // Optional overrides (previously env vars)
  epochs?: number // default 30
  imgSize?: number // default 640

  instanceType?: TrainingInstanceType // default "ml.g5.xlarge"
  instanceCount?: number // default 1
  volumeSizeGb?: number // default 100
  maxRuntimeSeconds?: number // default 7200
}


export async function startYoloTrainingJob(
  cfg: YoloTrainingJobConfig,
): Promise<{ jobName: string; response: any }> {
  console.log('config for sagemaker:', cfg)
  const {
    region,
    sagemakerRoleArn,
    datasetS3Uri,
    outputS3Uri,
    epochs = 30,
    imgSize = 640,
    instanceType = 'ml.g5.xlarge',
    instanceCount = 1,
    volumeSizeGb = 100,
    maxRuntimeSeconds = 7200,
    imageUri,
    jobName,
  } = cfg

  // Environment variables for the container
  const environment: Record<string, string> = {
    DATASET_S3_URI: datasetS3Uri,
    LABELS_JSON_PATH: '/opt/ml/code/labels.json', // danger: coupling.
    EPOCHS: String(epochs),
    IMG_SIZE: String(imgSize),
    MODEL_DIR: '/opt/ml/model',
  }

  // Equivalent to INPUT_DATA_CONFIG JSON blob in the bash script
  const inputDataConfig: CreateTrainingJobCommandInput['InputDataConfig'] = [
    {
      ChannelName: 'dataset',
      DataSource: {
        S3DataSource: {
          S3DataType: 'S3Prefix',
          S3Uri: datasetS3Uri,
          S3DataDistributionType: 'FullyReplicated',
        },
      },
    },
  ]

  console.log('Starting SageMaker training job:')
  console.log(`  Job Name:        ${jobName}`)
  console.log(`  Region:          ${region}`)
  console.log(`  Image:           ${imageUri}`)
  console.log(`  Role:            ${sagemakerRoleArn}`)
  console.log(`  Dataset S3 URI:  ${datasetS3Uri}`)
  console.log(`  Output S3 URI:   ${outputS3Uri}`)
  console.log(`  Instance Type:   ${instanceType}`)
  console.log(`  Instance Count:  ${instanceCount}`)
  console.log(`  Volume Size GB:  ${volumeSizeGb}`)
  console.log(`  Max Runtime (s): ${maxRuntimeSeconds}`)
  console.log(`  Epochs:          ${epochs}`)
  console.log(`  Img Size:        ${imgSize}`)
  console.log()

  const client = new SageMakerClient({ region })

  const params: CreateTrainingJobCommandInput = {
    TrainingJobName: jobName,
    RoleArn: sagemakerRoleArn,
    AlgorithmSpecification: {
      TrainingImage: imageUri,
      TrainingInputMode: 'File',
    },
    InputDataConfig: inputDataConfig,
    OutputDataConfig: {
      S3OutputPath: outputS3Uri,
    },
    ResourceConfig: {
      InstanceType: instanceType,
      InstanceCount: instanceCount,
      VolumeSizeInGB: volumeSizeGb,
    },
    StoppingCondition: {
      MaxRuntimeInSeconds: maxRuntimeSeconds,
    },
    Environment: environment,
  }

  const response = await client.send(new CreateTrainingJobCommand(params))

  console.log()
  console.log(`Submitted training job: ${jobName}`)
  console.log('Check status with:')
  console.log(
    `  aws sagemaker describe-training-job --region ${region} --training-job-name ${jobName} | jq .TrainingJobStatus`,
  )

  return { jobName, response }
}
