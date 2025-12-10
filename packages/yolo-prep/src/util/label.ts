import sharp from 'sharp'
import { Annotation } from "ui-labelling-shared"
import  fs from 'fs'
import path from 'path'
import { getDbClient } from './db'

// this relies on the fact that the image files within the imageDir
// are of the format {screenId}.{ext}.  If this is not true this whole thing breaks.
// we hardcode the logic that for a given image, {name}.{ext} the corresponding label file is {name}.txt
export const writeLabelsForImages = async ({
  labels,
  imageDir,
  labelDir,
}: {
  labels: string[]
  imageDir: string
  labelDir: string
}) => {
  const prisma = getDbClient()
  const imgPaths = await getFiles(imageDir)

  fs.mkdirSync(labelDir, { recursive: true })

  for (const imgPath of imgPaths) {
    // this is the screen id
    const base = path.parse(imgPath).name

    const screenId = Number(base)
    const screen = await prisma.screenshot.findFirst({
      where: {
        id: screenId
      },
      select: {
        annotation: true,
        view_height: true,
        view_width: true
      }
    })

    if (!screen) {
      console.log('[getLabelsForImages] failed to find screen with id ', screenId)
      continue
    }
    const yoloEntries = await buildYoloEntries({
      imgPath,
      viewWidthCss: screen.view_width,
      viewHeightCss: screen.view_height,
      labels,
      annotations: screen.annotation.map(a => ({
        ...a,
        text_content: a.text_content ?? undefined,
        rect: {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        }
      }))
    })
    // write a file with the entries would you
    fs.writeFileSync(
      path.join(labelDir, `${screenId}.txt`),
      yoloEntries.join('\n'),
    )
  }
}

async function getFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile())
    .map(entry => path.join(dir, entry.name));
}

/**
 * Given an image path, CSS viewport size, labels, and annotations,
 * return YOLO label lines (normalized cx, cy, w, h).
 */
async function buildYoloEntries({
  imgPath,
  viewWidthCss,
  viewHeightCss,
  labels,
  annotations,
}: {
  imgPath: string
  viewWidthCss: number
  viewHeightCss: number
  labels: string[]
  annotations: Annotation[]
}): Promise<string[]> {
  const meta = await sharp(imgPath).metadata();
  const imgWidth = meta.width;
  const imgHeight = meta.height;

  if (!imgWidth || !imgHeight) {
    throw new Error(`[buildYoloEntries] Could not determine image size for ${imgPath}`);
  }

  const scaleX = imgWidth / viewWidthCss;
  const scaleY = imgHeight / viewHeightCss;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const lines: string[] = [];

  for (const ann of annotations) {
    const classId = labels.indexOf(ann.label);
    if (classId === -1) {
      // Unknown label, skip (or throw if you prefer)
      continue;
    }

    const { x, y, width, height } = ann.rect;

    // center in CSS pixels
    const cxCss = x + width / 2;
    const cyCss = y + height / 2;

    // convert to image pixels
    const cxPx = cxCss * scaleX;
    const cyPx = cyCss * scaleY;
    const wPx = width * scaleX;
    const hPx = height * scaleY;

    // normalize for YOLO
    const xNorm = clamp01(cxPx / imgWidth);
    const yNorm = clamp01(cyPx / imgHeight);
    const wNorm = clamp01(wPx / imgWidth);
    const hNorm = clamp01(hPx / imgHeight);

    lines.push(
      [
        classId,
        xNorm.toFixed(6),
        yNorm.toFixed(6),
        wNorm.toFixed(6),
        hNorm.toFixed(6),
      ].join(' '),
    );
  }

  return lines;
}
