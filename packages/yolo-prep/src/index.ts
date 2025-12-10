import * as path from 'node:path'
import fs from 'fs'
import { getScreenIds, saveScreensToFs } from './util/screen';
import { getDbClient } from './util/db';
import { trainTestSplit, TrainTestSplit } from './util/split';
import { writeLabelsForImages } from './util/label';
import { ServiceManualLabel } from 'ui-labelling-shared';
import { uploadDirectoryToS3 } from './util/s3';
import dotenv = require('dotenv')

dotenv.config()

// reserve this for actual full one click yolo train pipeline plz
// env vars here plz
const bucket = process.env.AWS_S3_BUCKET
const screenTag = process.env.SCREEN_TAG ?? 'service_manual'
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
  screenTag
})
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getDbClient()
    await prisma.$disconnect();
  });

async function main({
  screenTag
}: {
  screenTag: string
}) {
  const outRoot = process.env.OUT_ROOT ?? 'yolo'
  const OUTPUT_ROOT = path.resolve('dist', outRoot)
  const IMAGES_DIR = path.resolve(OUTPUT_ROOT, 'images')
  const LABELS_DIR = path.resolve(OUTPUT_ROOT, 'labels')
  const TRAIN_IMAGES_DIR = path.resolve(IMAGES_DIR, 'train')
  const VAL_IMAGES_DIR = path.resolve(IMAGES_DIR, 'val')
  const TRAIN_LABELS_DIR = path.resolve(LABELS_DIR, 'train')
  const VAL_LABELS_DIR = path.resolve(LABELS_DIR, 'val')

  // start by deleting output_root would ya
  // can maybe make this more flexible later
  if (fs.existsSync(OUTPUT_ROOT)) {
    console.log('existing output dir..')
    // scary shit?
    fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true })
  }

  // get screen ids for processing
  // hardcoded to only get published screens bro
  const screenIds = (await getScreenIds({ tag: screenTag, labels })).slice(0, 10)

  // train test split
  const split: TrainTestSplit = trainTestSplit(screenIds)

  // convert screen ids to actual files on local FS
  await saveScreensToFs({
    screenIds,
    testDir: VAL_IMAGES_DIR,
    trainDir: TRAIN_IMAGES_DIR,
    split
  })

  // generate the label files for each image
  await writeLabelsForImages({
    imageDir: TRAIN_IMAGES_DIR,
    labelDir: TRAIN_LABELS_DIR,
    labels,
  })

  await writeLabelsForImages({
    imageDir: VAL_IMAGES_DIR,
    labelDir: VAL_LABELS_DIR,
    labels,
  })

  // write directory to s3 bucket
  if (!bucket) {
    console.error('no bucket specified')
    return
  }
  await uploadDirectoryToS3({
    localDir: OUTPUT_ROOT,
    bucket,
    prefix: outRoot,
  })
}


