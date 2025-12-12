import { getScreenIds, saveScreensToS3 } from './util/screen';
import { getDbClient } from './util/db';
import { trainTestSplit, TrainTestSplit } from './util/split';
import { ServiceManualLabel } from 'ui-labelling-shared';
import dotenv = require('dotenv')
import { gmtTimestamp, sagemakerGmtTimestamp } from './util/date';
import { startYoloTrainingJob } from './util/sagemaker';
import { Config, configSchema } from './util/types';

dotenv.config()

const screenTag = process.env.SCREEN_TAG ?? 'service_manual'

const parsedConfig = configSchema.safeParse({
  screenTag: process.env.SCREEN_TAG ?? 'service_manual',
  labels: typeof process.env.LABELS === 'string'
  ? process.env.LABELS.split(',')
  : [
    ServiceManualLabel.logo,
    ServiceManualLabel.text_block,
    ServiceManualLabel.heading,
    ServiceManualLabel.bulletpoint,
    ServiceManualLabel.image,
    ServiceManualLabel.caption,
    ServiceManualLabel.image_id,
    ServiceManualLabel.diagram,
    ServiceManualLabel.diagram_number,
    ServiceManualLabel.diagram_label,
    ServiceManualLabel.icon_warn,
    ServiceManualLabel.icon,
    ServiceManualLabel.section_number,
    ServiceManualLabel.page_num,
    ServiceManualLabel.toc,
    ServiceManualLabel.toc_section,
    ServiceManualLabel.toc_entry,
    ServiceManualLabel.qr_code,
    ServiceManualLabel.barcode,
    ServiceManualLabel.url,
    ServiceManualLabel.phone,
    ServiceManualLabel.page_context,
    ServiceManualLabel.box,
    ServiceManualLabel.table,
    ServiceManualLabel.page_frame
  ] as string[],
  runName: process.env.YOLO_RUN_NAME ?? `${screenTag}_${gmtTimestamp()}`,

  // optional sagemaker
  datasetS3Uri: process.env.AWS_SAGEMAKER_DATASET_URI,
  outputS3Uri: process.env.AWS_SAGEMAKER_OUTPUT_URI,

  // non-negotiable env vars
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  sagemakerRoleArn: process.env.AWS_SAGEMAKER_ROLE_ARN,
  imageUri: process.env.AWS_SAGEMAKER_IMAGE_URI,
})

if (parsedConfig.error) {
  console.error('invalid config. check yo env vars!\n', parsedConfig.error)
  process.exit(1)
}

// todo: incorporate the docker file build and optionally build and push the image.
// labels in particular is part of the docker build
main(parsedConfig.data)
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getDbClient()
    await prisma.$disconnect();
  });

async function main({
  screenTag,
  labels,
  bucket,
  region,
  sagemakerRoleArn,
  runName,
  imageUri,
  datasetS3Uri,
  outputS3Uri,
}: Config) {

  console.log('config:', {
    screenTag,
    labels,
    bucket,
    region,
    sagemakerRoleArn,
    runName,
    imageUri,
    datasetS3Uri,
    outputS3Uri,
  })

  // secret debug flag
  if (process.env.SKIP_DATA_UPLOAD !== 'true') {
    // get screen ids for processing
    // hardcoded to only get published screens bro
    const screenIds = (await getScreenIds({ tag: screenTag, labels }))

    // train test split
    const split: TrainTestSplit = trainTestSplit(screenIds)

    await saveScreensToS3({
      screenIds,
      prefix: `yolo/${runName}`,
      split,
      bucket,
      labels
    })
  }

  // kick off a new sagemaker job, using the runName and prefix
  await startYoloTrainingJob({
    region,
    sagemakerRoleArn,
    datasetS3Uri: datasetS3Uri ?? `s3://${bucket}/yolo/${runName}`,
    outputS3Uri: outputS3Uri ?? `s3://${bucket}/yolo-models/${runName}`,
    jobName: `${screenTag.replace(/_/g, '-')}-${sagemakerGmtTimestamp()}`, // need to enforce rules on screentag
    imageUri
  })
}


