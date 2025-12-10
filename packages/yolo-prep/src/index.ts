import * as path from 'node:path'
import fs from 'fs'
import { getScreenIds, saveScreensToFs } from './util/screen';
import { getDbClient } from './util/db';
import { trainTestSplit, TrainTestSplit } from './util/split';


// reserve this for actual full one click yolo train pipeline plz
// script vars here plz
const screenTag = process.env.SCREEN_TAG ?? 'service_manual'

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
  const OUTPUT_ROOT = path.resolve('dist', process.env.OUTPUT_ROOT ?? 'yolo')
  const IMAGES_DIR = path.resolve(OUTPUT_ROOT, 'images')
  const LABELS_DIR = path.resolve(OUTPUT_ROOT, 'labels')

  // start by deleting output_root would ya
  // can maybe make this more flexible later
  if (fs.existsSync(OUTPUT_ROOT)) {
    console.log('existing output dir..')
    // scary shit?
    fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true })
  }

  // get screen ids for processing
  // hardcoded to only get published screens bro
  const screenIds = (await getScreenIds({ tag: screenTag })).slice(0, 10)

  // train test split
  const split: TrainTestSplit = trainTestSplit(screenIds)

  // convert screen ids to actual files on local FS
  await saveScreensToFs({
    screenIds,
    testDir: path.resolve(IMAGES_DIR, 'val'),
    trainDir: path.resolve(IMAGES_DIR, 'train'),
    split
  })

}


