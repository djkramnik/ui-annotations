import * as readline from 'readline'
import { AnnotationPayload, AnnotationRequest } from 'ui-labelling-shared'

export interface CliOptions {
  handleInput: (s: string) => any
  inputPrefix?: string
  prompt?: string
}

export interface CliMethods {
  start: (options: CliOptions) => Promise<void>
}

export const getCli = (): CliMethods => {
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })
  const getInput = (promptText: string): Promise<string> => {
    return new Promise(resolve => {
      prompt.question(promptText, input => {
        resolve(input)
      })
    })
  }
  const start = async ({
    handleInput,
    inputPrefix = '',
    prompt = 'Enter cmd:'
  }: CliOptions) => {
    while(true) {
      const input = await getInput(prompt)
      if ([
        'q',
        'quit',
        'exit'
      ].includes(input.toLowerCase())) {
        break
      }
      await handleInput(`${inputPrefix}${input}`)
    }
  }
  return { start }
}

export const waitForEnter = (): Promise<void> => {
  return new Promise(resolve => {
    process.stdin.once('data', function () {
      resolve()
    })
  })
}

export const postAnnotations = (payload: AnnotationRequest) => {
  return fetch('http://localhost:4000/api/annotation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

type YoloPredictRequest = {
  image_base64: string
  conf?: number
  iou?: number
  imgsz?: number
}

type XyXy = [number, number, number, number]

type YoloPredictResponse = {
  width: number
  height: number
  detections: {
    box: XyXy,
    conf: number
    label: string
  }[]
}

// fetch yolo predictions
export const getYoloPredictions = (payload: YoloPredictRequest) => {
  return fetch('http://localhost:8000/predict_textregions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

type ScaledYoloPred = {
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  conf: number
  label: string
}

// scale yolo predictions
export const scaleYoloPreds = (data: YoloPredictResponse, vw: number, vh: number): ScaledYoloPred[] => {
  const { width, height, detections } = data
  const sx = vw / width
  const sy = vh / height

  const scaledDetections = detections.map(d => ({
    ...d,
    box: d.box.map((n, i) => n * (i % 2 ? sy : sx)) as XyXy,
  }))

  return scaledDetections.map(({ box, conf, label }) => ({
    rect: {
      x: box[0],
      y: box[1],
      width: box[2] - box[0],
      height: box[3] - box[1]
    },
    conf,
    label,
  }))
}

// papa gpt mostly

type Rect = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>

type FilterOpts = { minConf?: number; overlapPct: number; matchLabel?: string };

/* ---- helpers ---- */
const area = (r: Rect) => Math.max(0, r.width) * Math.max(0, r.height);

const intersectArea = (a: Rect, b: Rect) => {
  const ax2 = a.x + a.width, ay2 = a.y + a.height;
  const bx2 = b.x + b.width, by2 = b.y + b.height;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  return ix * iy;
};

/** IoU in [0,1] for XYWH rects */
const iouXYWH = (a: Rect, b: Rect) => {
  const inter = intersectArea(a, b);
  const uni = area(a) + area(b) - inter;
  return uni > 0 ? inter / uni : 0;
};

export function filterByOverlap(
  annotations: AnnotationPayload['annotations'],
  preds: ScaledYoloPred[],
  options: FilterOpts
): AnnotationPayload['annotations'] {
  const { overlapPct, minConf = 0.6, matchLabel } = options;

  // 1) pre-filter preds by conf / label if provided
  const filteredPreds = preds.filter(
    p => p.conf >= minConf && (matchLabel ? p.label === matchLabel : true)
  );
  if (filteredPreds.length === 0) return [];

  // 2) keep annotations that overlap (IoU) with at least one filtered pred
  return annotations.filter(a =>
    filteredPreds.some(p => iouXYWH(a.rect, p.rect) >= overlapPct)
  );
}