import { getScreenIds, saveScreensToS3 } from './util/screen';
import { getDbClient } from './util/db';
import { trainTestSplit, TrainTestSplit } from './util/split';
import { ServiceManualLabel } from 'ui-labelling-shared';
import dotenv = require('dotenv')
import { gmtTimestamp } from './util/date';

dotenv.config()

// reserve this for actual full one click yolo train pipeline plz
// env vars here plz
const bucket = process.env.AWS_S3_BUCKET ?? 'apexify-s3-milvus'
const screenTag = process.env.SCREEN_TAG ?? 'service_manual'
const runName = process.env.YOLO_RUN_NAME ?? `${screenTag}_${gmtTimestamp()}`
const labels: string[] = typeof process.env.LABELS === 'string'
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
  ] as string[]

main({
  screenTag,
  labels
})
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getDbClient()
    await prisma.$disconnect();
  });


// given a tag and label set,
async function main({
  screenTag,
  labels,
}: {
  screenTag: string
  labels: string[]
}) {

  // get screen ids for processing
  // hardcoded to only get published screens bro
  const screenIds = (await getScreenIds({ tag: screenTag, labels })).slice(0, 10)

  // train test split
  const split: TrainTestSplit = trainTestSplit(screenIds)

  saveScreensToS3({
    screenIds,
    prefix: `yolo/${runName}`,
    split,
    bucket,
    labels
  })

  // kick off a new sagemaker job, using the runName and prefix

}


