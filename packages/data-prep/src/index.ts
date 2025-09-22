/* src/index.ts */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { getRasterSize } from './utils/raster';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { trainTestSplit } from './utils/split_data';

const prisma = new PrismaClient();

/* =========================
   Config
   ========================= */
const OUTPUT_ROOT = path.resolve('dist', process.env.OUTPUT_ROOT ?? 'coco');           // dist/coco
const IMG_DIR = path.join(OUTPUT_ROOT, 'images');           // dist/coco/images
const TRAIN_JSON = path.join(OUTPUT_ROOT, 'train.json');
const VAL_JSON = path.join(OUTPUT_ROOT, 'val.json');

// Your class set (contiguous 1..N in COCO)
const CLASS_NAMES = typeof process.env.CLASS_NAMES === 'string'
  ? (process.env.CLASS_NAMES as string).split(',')
  : ['button', 'heading', 'input'] as const;
type UiLabel = (typeof CLASS_NAMES)[number];
const CAT_ID_BY_NAME = new Map<UiLabel, number>(
  CLASS_NAMES.map((n, i) => [n, i + 1])
);

/* =========================
   Types for payload
   ========================= */
type Payload = {
  annotations?: Array<{
    id: string;
    rect: { x: number; y: number; width: number; height: number };
    label: UiLabel;
  }>;
};

/* =========================
   COCO types
   ========================= */
type CocoImage = {
  id: number;
  file_name: string;  // relative path
  width: number;
  height: number;
};
type CocoAnnotation = {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  iscrowd: 0 | 1;
  area: number;
};
type CocoCategory = { id: number; name: string };
type CocoDoc = {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
  licenses: string[]
  info: { description: string, version: string }
};

async function ensureDirs() {
  await fs.mkdir(path.join(IMG_DIR, 'train'), { recursive: true });
  await fs.mkdir(path.join(IMG_DIR, 'val'), { recursive: true });
}

async function readRows(tag?: string) {
  return prisma.annotation.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      viewWidth: true,
      viewHeight: true,
      screenshot: true,
      payload: true
    },
    where: {
      published: 1,
      ...(
        tag
          ? { tag }
          : {}
      )
    },
  });
}

function getCocoTemplate(categories: CocoCategory[]) {
  return {
    images: [],
    annotations: [],
    categories,
    licenses: [],
    info: {
      description: 'UI dataset',
      version: '1.0'
    }
  }
}

async function main() {
  await ensureDirs();

  console.log('Customization env variables:')
  console.log('OUTPUT_ROOT:', process.env.OUTPUT_ROOT, OUTPUT_ROOT)
  console.log('TAG:', process.env.TAG)
  console.log('CLASS_NAMES:', process.env.CLASS_NAMES, CLASS_NAMES)

  const rows = await readRows(process.env.TAG);

  console.log(`Received ${rows.length} rows`)
  // Normalize to internal structure
  const items = rows.map(r => ({
    id: r.id,
    width: r.viewWidth,
    height: r.viewHeight,
    screenshot: r.screenshot as Buffer | null,
    payload: r.payload as Payload | null
  }));

  // Keep rows with at least one box of our known labels AND a screenshot
  const usable = items.filter(it => {
    const anns = (it.payload as any)?.annotations;
    const hasArray = Array.isArray(anns);
    return hasArray && !!it.screenshot && it.width > 0 && it.height > 0;
  });
  console.log(`Counted ${usable.length} usable rows`)

  if (usable.length === 0) {
    console.warn('No usable rows with screenshots and known labels. Nothing to export.');
    return;
  }

  // Split by image id (deterministic)

  const ids = usable.map(x => x.id);

  // const valSet = new Set(ids.slice(trainCount));
  const { train: trainSet } = trainTestSplit(ids)

  // COCO docs
  const categories: CocoCategory[] = CLASS_NAMES.map((n, i) => ({ id: i + 1, name: n }));
  const train: CocoDoc = getCocoTemplate(categories)
  const val: CocoDoc = getCocoTemplate(categories)

  let annId = 1;

  for (const it of usable) {
    const split: 'train' | 'val' = trainSet.includes(it.id) ? 'train' : 'val';

    // Write image
    const buf = it.screenshot!;
    const ext = detectImageExt(buf);
    if (ext === 'bin') {
      console.warn(`Skipping id=${it.id}: unknown image format`);
      continue;
    }
    const fileBase = `${it.id}.${ext}`;
    const absImgPath = path.join(IMG_DIR, split, fileBase);
    await fs.writeFile(absImgPath, buf);

    // SCALING CRAP
    const size = getRasterSize(buf);
    if (!size) {
      console.warn(`Skipping id=${it.id}: could not read raster size`);
      continue;
    }
    const W_img = size.width;
    const H_img = size.height;

    // Your previous meta dims (likely CSS px you saved as viewWidth/viewHeight)
    const W_meta = it.width;
    const H_meta = it.height;

    // Scale factors from meta coords → raster coords
    const sx = W_meta ? (W_img / W_meta) : 1.0;
    const sy = H_meta ? (H_img / H_meta) : 1.0;
    // END SCALING CRAP

    const image: CocoImage = {
      id: it.id,
      file_name: path.posix.join('images', split, fileBase), // relative to dist/coco
      width: W_img,
      height: H_img
    };

    // Build annotations
    const rawAnns = it.payload?.annotations ?? [];
    const anns: CocoAnnotation[] = [];
    for (const a of rawAnns) {
      if (!a?.rect || !CAT_ID_BY_NAME.has(a.label)) continue;
      const { x, y, width, height } = a.rect;
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        typeof width !== 'number' ||
        typeof height !== 'number' ||
        width <= 0 ||
        height <= 0
      ) {
        console.error('WACK ANNOTATION DETECTED', JSON.stringify(a))
        continue
      }

      const bx = x * sx;
      const by = y * sy;
      const bw = width * sx;
      const bh = height * sy;

      anns.push({
        id: annId++,
        image_id: image.id,
        category_id: CAT_ID_BY_NAME.get(a.label)!,
        bbox: [bx, by, bw, bh],
        iscrowd: 0,
        area: bw * bh
      });
    }

    if (anns.length === 0) {
      // If no valid boxes remain for this image, drop the image file too
      await fs.rm(absImgPath, { force: true });
      continue;
    }

    if (split === 'train') {
      train.images.push(image);
      train.annotations.push(...anns);
    } else {
      val.images.push(image);
      val.annotations.push(...anns);
    }
  }

  // Write JSON
  await fs.writeFile(TRAIN_JSON, JSON.stringify(train, null, 2));
  await fs.writeFile(VAL_JSON, JSON.stringify(val, null, 2));

  console.log('COCO export complete:');
  console.log(`  Train: ${train.images.length} images, ${train.annotations.length} boxes -> ${path.relative(process.cwd(), TRAIN_JSON)}`);
  console.log(`  Val:   ${val.images.length} images, ${val.annotations.length} boxes -> ${path.relative(process.cwd(), VAL_JSON)}`);
  console.log(`  Images: ${path.relative(process.cwd(), IMG_DIR)}/{train,val}/`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
