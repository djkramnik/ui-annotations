import { PrismaClient } from '@prisma/client';
import fs from 'fs'
import path from 'path'
import { trainTestSplit } from './utils/split_data';
import { detectImageExt } from './utils/raster';
// read from the ocr table and prepare the following:
// folder in dist named paddleocr
// within this folder, images subfolder containing all the ocr image files
// train.txt containing image + text pairing per line {pathToImg}\t{text}
// valid.txt containing image + text pairing per line {pathToImg}\t{text}
// ppocr_char.txt.  One character per line

const prisma = new PrismaClient();
main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  })

async function main() {
  const PADDLE_DIR = path.join(__dirname, 'paddleocr')
  if (fs.existsSync(PADDLE_DIR)) {
    fs.unlinkSync(PADDLE_DIR)
  }
  fs.mkdirSync(PADDLE_DIR)
  const IMG_DIR = path.join(PADDLE_DIR, 'images')
  const TRAIN_LABELS = path.join(PADDLE_DIR, 'train.txt')
  const VAL_LABELS = path.join(PADDLE_DIR, 'val.txt')
  const DICT_CHARS = path.join(PADDLE_DIR, 'ppocr_char.txt')

  const ocrRows = await prisma.ocr.findMany({})
  const ocrIds = ocrRows.map(r => r.id)
  const { train: trainSet } = trainTestSplit(ocrIds)

  const writeImage = (id: number, buf: Buffer) => {
    const ext = detectImageExt(buf)
    const imgPath = path.join(IMG_DIR, `${id}.${ext}`)
    fs.writeFileSync(imgPath, buf)
    return imgPath
  }

  const trainLabels: string[] = []
  const valLabels: string[] = []
  const bagOfCharacters = new Set<string>()

  console.log('train_label_path', TRAIN_LABELS)
  console.log('train length', trainSet.length)
  console.log('ocr length', ocrIds.length)

  for(const row of ocrRows) {
    const buf = row.screenshot
    console.log('processing ', row.id)
    const imgPath = writeImage(row.id, buf as Buffer)
    const label = `./${imgPath.slice(imgPath.lastIndexOf('images/'))}\t${row.text.replace(/\s+/g, ' ')}`

    ;(trainSet.includes(row.id)
      ? trainLabels
      : valLabels).push(label)

    const chars = row.text.replace(/\s/g, '')
    ;[...chars].forEach(c => bagOfCharacters.add(c))
  }

  fs.writeFileSync(TRAIN_LABELS, trainLabels.join('\n'), 'utf-8')
  fs.writeFileSync(VAL_LABELS, valLabels.join('\n'), 'utf-8')
  const uniqChars = Array.from(bagOfCharacters).join('\n')
  fs.writeFileSync(DICT_CHARS, uniqChars)
}