import dotenv = require('dotenv')
import { prisma } from './db'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { waitForEnter } from './util'

// grab local fs images and upload them as empty annotations
// for manual labelling on the frontend viewer
dotenv.config()

;(async function main() {
  const targetPath = process.env.LOCAL_PATH
  // only support one for now, this may be good enough
  const extensionType = process.env.LOCAL_EXTENSION

  // what these shall be tagged as in the db
  const localTag = process.env.LOCAL_TAG

  if (!targetPath || !extensionType || !localTag) {
    throw Error('missing env vars')
  }

  console.log('running local scraper with the following variables:')
  console.log('target dir: ', targetPath)
  console.log('extension type ', extensionType)
  console.log('annotation tag', localTag)
  console.log('\ncontinue?')
  await waitForEnter()

  // for now recursion not needed.  Just gets all the files with the
  // intended extension from the root of the directory
  // quite primitive
  const imagePaths = fs.readdirSync(targetPath)
    .filter(s => s.endsWith(extensionType))
    .map(s => path.join(targetPath, s))


  const currentDate = new Date().toISOString()
  let errors: number = 0
  let batchedAnnotations: Array<{
    screenshot: Buffer<ArrayBufferLike>
    tag: string
    scrollY: number
    url: string
    date: string
    payload: { annotations: [] }
    viewWidth: number
    viewHeight: number
  }> = []

  for(const imgPath of imagePaths) {
    console.log('processing', imgPath)
    try {
      const img = sharp(imgPath)
      const { width: imgW, height: imgH } = await img.metadata()
      batchedAnnotations.push({
        screenshot: await img.toBuffer(),
        tag: localTag,
        scrollY: 0,
        url: imgPath,
        date: currentDate,
        viewWidth: imgW,
        viewHeight: imgH,
        payload: {
          annotations: []
        }
      })
    } catch(e) {
      console.error('could not process', imgPath)
      errors += 1
    }
  }

  await prisma.annotation.createMany({
    data: batchedAnnotations
  })

  console.log(`uploaded ${batchedAnnotations.length} annotations, with ${errors} errors`)
  process.exit(0)
})()
