import type { Msg } from "./types";
import type { Annotation, Rect, ScreenshotRequest } from 'ui-labelling-shared'

/** Utility: wait helpers */
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** --- Rate limit handling for captureVisibleTab --- */
const MAX_CALLS_PER_SEC = 2;
const MIN_INTERVAL_MS = Math.ceil(1000 / MAX_CALLS_PER_SEC);
const QUOTA_ERR = "This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.";

class RateLimiter {
  private last = 0;
  constructor(private minIntervalMs: number) {}
  async wait() {
    const now = Date.now();
    const delta = now - this.last;
    if (delta < this.minIntervalMs) {
      await sleep(this.minIntervalMs - delta);
    }
    this.last = Date.now();
  }
}

const limiter = new RateLimiter(MIN_INTERVAL_MS);

async function captureVisibleThrottled(): Promise<string> {
  await limiter.wait();
  let attempt = 0;
  let delay = MIN_INTERVAL_MS;
  while (true) {
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" } as Msg, (res: any) => {
          if (chrome.runtime.lastError)
            return reject(new Error(chrome.runtime.lastError.message));
          if (!res?.ok || !res?.dataUrl)
            return reject(new Error(res?.error || "capture failed"));
          resolve(res.dataUrl as string);
        });
      });
      return dataUrl;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes(QUOTA_ERR)) {
        attempt++;
        const jitter = Math.floor(Math.random() * 80);
        await sleep(Math.min(1500, delay + jitter));
        delay = Math.min(1500, Math.floor(delay * 1.6) + 50);
        continue;
      }
      throw e;
    }
  }
}

/** Helpers */
function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

type AbsRect = { x: number; y: number; w: number; h: number };
function overlap(a: AbsRect, b: AbsRect): AbsRect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Scroll-and-stitch screenshot of element */
async function stitchElementPNG(el: HTMLElement): Promise<{
  base64: string;
  dpr: number;
  compAbs: AbsRect;
  cssSize: { w: number; h: number };
}> {
  const dpr = window.devicePixelRatio || 1;
  const r = el.getBoundingClientRect();
  const compAbs: AbsRect = {
    x: r.left + window.scrollX,
    y: r.top + window.scrollY,
    w: r.width,
    h: r.height,
  };
  const cssSize = { w: r.width, h: r.height };

  const vpW = document.documentElement.clientWidth;
  const vpH = document.documentElement.clientHeight;

  // Reduce tile count to minimize quota hits
  const stepX = Math.max(1, Math.floor(vpW * 0.95));
  const stepY = Math.max(1, Math.floor(vpH * 0.95));

  const xStops: number[] = compAbs.w <= vpW ? [compAbs.x] : [];
  const yStops: number[] = compAbs.h <= vpH ? [compAbs.y] : [];

  if (xStops.length === 0) {
    for (let x = compAbs.x; x < compAbs.x + compAbs.w; x += stepX) {
      const end = Math.min(x + vpW, compAbs.x + compAbs.w);
      const start = Math.max(compAbs.x, end - vpW);
      xStops.push(start);
      if (end >= compAbs.x + compAbs.w) break;
    }
  }

  if (yStops.length === 0) {
    for (let y = compAbs.y; y < compAbs.y + compAbs.h; y += stepY) {
      const end = Math.min(y + vpH, compAbs.y + compAbs.h);
      const start = Math.max(compAbs.y, end - vpH);
      yStops.push(start);
      if (end >= compAbs.y + compAbs.h) break;
    }
  }

  const outW = Math.round(compAbs.w * dpr);
  const outH = Math.round(compAbs.h * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  for (const sy of yStops) {
    for (const sx of xStops) {
      window.scrollTo({ left: sx, top: sy, behavior: "instant" as ScrollBehavior });
      await nextFrame();

      const dataUrl = await captureVisibleThrottled();
      const img = await dataUrlToImage(dataUrl);

      const vpRect: AbsRect = { x: window.scrollX, y: window.scrollY, w: vpW, h: vpH };
      const over = overlap(vpRect, compAbs);
      if (!over) continue;

      const srcX = (over.x - vpRect.x) * dpr;
      const srcY = (over.y - vpRect.y) * dpr;
      const srcW = over.w * dpr;
      const srcH = over.h * dpr;

      const dstX = (over.x - compAbs.x) * dpr;
      const dstY = (over.y - compAbs.y) * dpr;

      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        Math.round(dstX),
        Math.round(dstY),
        Math.round(srcW),
        Math.round(srcH)
      );
    }
  }

  const data = canvas.toDataURL("image/png");
  const base64 = data.split(",")[1];
  return { base64, dpr, compAbs, cssSize };
}

/** Build annotations from id^="label_" children */
function buildAnnotations(container: HTMLElement, dpr: number, compAbs: AbsRect): Annotation[] {
  const nodes = container.querySelectorAll<HTMLElement>('[id^="label_"]');
  const anns: Annotation[] = [];

  nodes.forEach((el) => {
    const rr = el.getBoundingClientRect();
    const abs = { x: rr.left + window.scrollX, y: rr.top + window.scrollY };
    const relX = (abs.x - compAbs.x) * dpr;
    const relY = (abs.y - compAbs.y) * dpr;
    const w = rr.width * dpr;
    const h = rr.height * dpr;
    const text = el.innerText?.trim() || undefined;

    anns.push({
      id: crypto.randomUUID(),
      label: el.id || "label",
      rect: {
        x: Math.round(relX),
        y: Math.round(relY),
        width: Math.round(w),
        height: Math.round(h),
      } as Rect,
      text_content: text,
      clean: false,
    });
  });

  return anns;
}

/** Main export flow */
async function runExport(): Promise<void> {
  const container = document.querySelector<HTMLElement>("#synth-container");
  if (!container) {
    console.warn("No #synth-container found, noop.");
    return;
  }

  const { base64, dpr, compAbs, cssSize } = await stitchElementPNG(container);
  const annotations = buildAnnotations(container, dpr, compAbs);

  const payload: ScreenshotRequest = {
    annotations,
    image_data: base64,
    url: location.href,
    date: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
    window: {
      scrollY: 0,
      width: Math.round(cssSize.w),
      height: Math.round(cssSize.h),
    },
    tag: "synthetic",
  };
  console.log('synth export payload', payload)

  return new Promise<void>((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "POST_SCREENSHOT", payload }, (res: any) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
      if (!res?.ok) return reject(res?.error || "POST failed");
      resolve();
    });
  }).then(() => {
    console.log("✅ ScreenshotRequest sent:", payload);
  })
}

/** Message listener */
chrome.runtime.onMessage.addListener((msg: Msg) => {
  if (msg?.type === "START_EXPORT") {
    runExport().catch((err) => console.error("Export failed:", err));
  }
});
