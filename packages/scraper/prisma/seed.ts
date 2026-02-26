import { PrismaClient } from 'annotation_schema'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { imageSize } from 'image-size'

const prisma = new PrismaClient()

const ALLOWED_EXTS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif'])

function isAllowedImage(filePath: string) {
  return ALLOWED_EXTS.has(path.extname(filePath).toLowerCase())
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...(await listFilesRecursive(full)))
    } else if (e.isFile() && isAllowedImage(full)) {
      out.push(full)
    }
  }

  return out
}

async function main() {
  const imagesDir =
    process.env.SEED_IMAGES_DIR ??
    path.resolve(process.cwd(), 'prisma', 'seed_images')

  // Ensure folder exists
  const stat = await fs.stat(imagesDir).catch(() => null)
  if (!stat?.isDirectory()) {
    throw new Error(
      `SEED_IMAGES_DIR folder not found (got: ${imagesDir}). Create it or set SEED_IMAGES_DIR.`
    )
  }

  const files = await listFilesRecursive(imagesDir)
  if (files.length === 0) {
    console.log(`No images found in ${imagesDir}`)
    return
  }

  console.log(`Found ${files.length} image(s) in ${imagesDir}`)

  let created = 0
  let failed = 0

  for (const filePath of files) {
    try {
      const buf = await fs.readFile(filePath)

      const dim = imageSize(buf)
      const width = dim.width
      const height = dim.height

      if (!width || !height) {
        throw new Error(`Could not determine dimensions for: ${filePath}`)
      }

      await prisma.screenshot.create({
        data: {
          scroll_y: 0,
          view_width: width,
          view_height: height,
          date: new Date(),
          url: 'https://google.com',
          annotations: {}, // must be valid JSON
          image_data: buf, // <-- Bytes = Buffer (NOT base64)
          published: 0,
          tag: 'logo',
          synthetic_parent_id: null,
        },
      })

      created++
      if (created % 25 === 0) {
        console.log(`Inserted ${created}/${files.length}...`)
      }
    } catch (err: any) {
      failed++
      console.warn(`Failed: ${filePath}\n  ${err?.message ?? err}`)
    }
  }

  console.log(`Done. Created=${created}, Failed=${failed}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
