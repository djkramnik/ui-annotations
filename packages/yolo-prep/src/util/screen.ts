
import { getDbClient } from './db';
import { detectImageExt } from './raster';
import { TrainTestSplit } from './split';
import path from 'path'
import fs from 'fs'

export const getScreenIds = ({
  tag,
  labels,
}: {
  tag?: string
  labels: string[]
}): Promise<number[]> => {
  const prisma = getDbClient()
  return prisma.screenshot.findMany({
    select: {
      id: true,
      annotation: true
    },
    where: {
      tag,
      image_data: {
        not: null
      },
      published: 1
    }
  }).then((rows) => {
    return rows
      .filter(r => r.annotation.some(a => labels.includes(a.label)))
      .map(s => s.id)
  })
}

// note: we save the file simply as the {screenId}.jpg, and later lean on this fact
// when writing the labels
export const saveScreensToFs = async ({
  screenIds,
  trainDir,
  testDir,
  split
}: {
  screenIds: number[]
  trainDir: string
  testDir: string
  split: TrainTestSplit
}) => {
  const prisma = getDbClient()
  for(const id of screenIds) {
    const screen = await prisma.screenshot.findFirst({
      where: {
        id,
        image_data: {
          not: null
        }
      },
      select: {
        image_data: true
      }
    })
    if (!screen) {
      console.warn('missing screen with id ', id)
      continue
    }

    const { image_data } = screen
    if (!image_data) {
      console.log('somehow we have no image_data', id)
      continue
    }
    const ext = detectImageExt(image_data as Buffer)
    if (ext === 'bin') {
      console.warn('skipping id', id, ': unknown image format')
      continue
    }

    const dir = split.train.includes(id)
      ? trainDir
      : testDir

    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `${id}.${ext}`), image_data)
  }
}