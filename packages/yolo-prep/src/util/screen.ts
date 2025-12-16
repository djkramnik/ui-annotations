
import { getDbClient } from './db';
import { detectImageExt } from './raster';
import { TrainTestSplit } from './split';
import path from 'path'
import fs from 'fs'
import { getS3Client } from './s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { genAndSaveLabelsToS3 } from './label';

export const getScreenIds = ({
  tag,
  labels,
  removeSynthetic
}: {
  tag?: string
  labels: string[]
  removeSynthetic?: boolean
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
      published: 1,
      ...(removeSynthetic ? { synthetic_parent_id : null } : {})
    }
  }).then((rows) => {
    return rows
      .filter(r => r.annotation.some(a => labels.includes(a.label))) // todo: support empty label file.  get rid of this
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

export const saveScreensToS3 = async ({
  screenIds,
  prefix,
  split,
  bucket,
  labels,
  log = true
}: {
  screenIds: number[]
  prefix: string // root prefix, e.g. "yolo-dataset"
  split: TrainTestSplit
  bucket: string
  labels: string[]
  log?: boolean
}) => {
  const s3 = getS3Client()
  const prisma = getDbClient()

  const normalizePrefix = (p: string) =>
    p.replace(/^\/+/, '').replace(/\/+$/, '')

  const rootPrefix = normalizePrefix(prefix)

  const prefixForPartition = (partition: 'train' | 'val') => {
    const base = rootPrefix ? `${rootPrefix}/` : ''
    return {
      imagePrefix: `${base}images/${partition}`,
      labelPrefix: `${base}labels/${partition}`,
    }
  }

  for (const id of screenIds) {
    const screen = await prisma.screenshot.findFirst({
      where: {
        id,
        image_data: {
          not: null,
        },
      },
      select: {
        image_data: true,
        annotation: true,
        view_height: true,
        view_width: true,
      },
    })

    if (!screen) {
      console.warn('missing screen with id', id)
      continue
    }

    const { image_data, annotation, view_width, view_height } = screen

    if (!image_data) {
      console.log('somehow we have no image_data', id)
      continue
    }

    const ext = detectImageExt(image_data as Buffer)
    if (ext === 'bin') {
      console.warn('skipping id', id, ': unknown image format')
      continue
    }

    const isTrain = split.train.includes(id)
    const partition: 'train' | 'val' = isTrain ? 'train' : 'val'

    const { imagePrefix, labelPrefix } = prefixForPartition(partition)

    const imageKey = `${imagePrefix}/${id}.${ext}`

    // Try to set a reasonable ContentType
    let contentType: string | undefined
    if (ext === 'png') {
      contentType = 'image/png'
    }
    else if (ext === 'jpg') {
      contentType = 'image/jpeg'
    }

    // todo: support empty annotations for image
    if (annotation.length < 1) {
      console.log(`screen with id ${id} has no annotations`)
      continue
    }

    try {
      // 1) Upload image
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: imageKey,
          Body: image_data as Buffer,
          ContentType: contentType,
        }),
      )

      await genAndSaveLabelsToS3({
        screenId: id,
        image_data: image_data as Buffer,
        annotations: annotation as any,
        viewWidthCss: view_width,
        viewHeightCss: view_height,
        labels,
        bucket,
        labelPrefix,
      })
      if (log) {
        console.log('uploaded annotations ' + imageKey)
      }
    } catch (err) {
      console.error(
        `failed to upload screenshot ${id} to s3://${bucket}/${imageKey}`,
        err,
      )
    }
  }
}