import type { Msg } from "./types";
import type { Annotation, Rect, ScreenshotRequest } from 'ui-labelling-shared'

/** Small utils */
const raf = () => new Promise<void>(r => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Quota-safe capture with light backoff */
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

async function captureVisibleThrottled(limiter: RateLimiter): Promise<string> {
  await limiter.wait();
  let delay = MIN_INTERVAL_MS;
  while (true) {
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" } as Msg, (res: any) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (!res?.ok || !res?.dataUrl) return reject(new Error(res?.error || "capture failed"));
          resolve(res.dataUrl as string);
        });
      });
      return dataUrl;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes(QUOTA_ERR)) {
        const jitter = Math.floor(Math.random() * 80);
        await sleep(Math.min(1500, delay + jitter));
        delay = Math.min(1500, Math.floor(delay * 1.6) + 50);
        continue;
      }
      throw e;
    }
  }
}

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

/**
 * Scroll-and-stitch the container into a PNG.
 * Canvas is sized in **CSS pixels** (no DPR) to match container width/height.
 * We resample each captured tile into that CSS-px canvas.
 */
async function stitchElementPNG(el: HTMLElement, limiter: RateLimiter): Promise<{
  base64: string;                 // PNG base64 (no prefix)
  containerCssRect: DOMRect;      // CSS px
  originalScroll: { x: number; y: number };
}> {
  const originalScroll = { x: window.scrollX, y: window.scrollY };

  // Measure container and page viewport in CSS px
  const r0 = el.getBoundingClientRect();
  const compAbs: AbsRect = { x: r0.left + originalScroll.x, y: r0.top + originalScroll.y, w: r0.width, h: r0.height };

  const vpW = document.documentElement.clientWidth;
  const vpH = document.documentElement.clientHeight;

  // Tile steps (95% stride to keep a small overlap)
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

  // Disable smooth scroll during capture to avoid drift
  const prevSB = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";

  // Canvas in **CSS pixel units** (bitmap pixels = CSS px)
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(compAbs.w);
  canvas.height = Math.round(compAbs.h);
  const ctx = canvas.getContext("2d")!;
  let tilesDrawn = 0;

  try {
    for (let yi = 0; yi < yStops.length; yi++) {
      for (let xi = 0; xi < xStops.length; xi++) {
        const sy = yStops[yi], sx = xStops[xi];
        window.scrollTo({ left: sx, top: sy });
        await raf();

        const dataUrl = await captureVisibleThrottled(limiter);
        const img = await dataUrlToImage(dataUrl);

        // Compute this tile's capture scale (image px per CSS px) for correct sampling
        const tileScaleX = img.naturalWidth / vpW;
        const tileScaleY = img.naturalHeight / vpH;

        const vpRect: AbsRect = { x: window.scrollX, y: window.scrollY, w: vpW, h: vpH };
        const over = overlap(vpRect, compAbs);
        if (!over) continue;

        // Source in image pixels
        const srcX = (over.x - vpRect.x) * tileScaleX;
        const srcY = (over.y - vpRect.y) * tileScaleY;
        const srcW = over.w * tileScaleX;
        const srcH = over.h * tileScaleY;

        // Destination in canvas pixels (which we are treating as CSS px)
        const dstX = (over.x - compAbs.x);
        const dstY = (over.y - compAbs.y);
        const dstW = over.w;
        const dstH = over.h;

        ctx.drawImage(
          img,
          Math.round(srcX), Math.round(srcY), Math.round(srcW), Math.round(srcH),
          Math.round(dstX), Math.round(dstY), Math.round(dstW), Math.round(dstH)
        );
        tilesDrawn++;
      }
    }
  } finally {
    // Restore scroll and behavior, let layout settle
    document.documentElement.style.scrollBehavior = prevSB;
    window.scrollTo({ left: originalScroll.x, top: originalScroll.y });
    await raf(); await raf();
  }

  if (!tilesDrawn) throw new Error("No tiles drawn — component never intersected viewport during capture.");

  const base64 = canvas.toDataURL("image/png").split(",")[1];
  return { base64, containerCssRect: el.getBoundingClientRect(), originalScroll };
}

/** Build annotations in **pure CSS pixels** relative to the container (no DPR or scale) */
function buildAnnotations(container: HTMLElement): Annotation[] {
  const c = container.getBoundingClientRect();
  const nodes = container.querySelectorAll<HTMLElement>('[id^="label_"]');
  const anns: Annotation[] = [];

  nodes.forEach((el) => {
    const r = el.getBoundingClientRect();
    const relX = r.left - c.left;
    const relY = r.top - c.top;
    const text = el.innerText?.trim() || undefined;
    const [prefix, ...rest] = el.id.split('_')

    anns.push({
      id: crypto.randomUUID(),
      label: rest.join('_'),
      rect: {
        x: Math.round(relX),
        y: Math.round(relY),
        width: Math.round(r.width),
        height: Math.round(r.height),
      } as Rect,
      text_content: text,
      clean: false,
    });
  });

  return anns;
}

/** Main */
let exporting = false;

async function runExport(): Promise<void> {
  if (exporting) return;
  exporting = true;

  const limiter = new RateLimiter(MIN_INTERVAL_MS);

  try {
    const container = document.querySelector<HTMLElement>("#synth-container");
    if (!container) { console.warn("No #synth-container found, noop."); return; }

    const parentTag = container.getAttribute('data-parent-tag')
    const parentId = container.getAttribute('data-parent-id')

    if (parentId === null) {
      console.warn('no parent id found.  opting to sit this one out')
      return
    }
    const parentIdN = Number(String(parentId))

    if (Number.isNaN(parentIdN)) {
      console.warn('no parent id found.  opting to sit this one out')
      return
    }

    // Stitch image (PNG) — independent of annotation units
    const { base64, containerCssRect } = await stitchElementPNG(container, limiter);

    // Annotations strictly in CSS px relative to container
    const annotations = buildAnnotations(container);

    const payload: ScreenshotRequest = {
      annotations,
      image_data: base64,
      url: location.href,
      date: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
      window: {
        scrollY: 0,
        width: Math.round(containerCssRect.width),
        height: Math.round(containerCssRect.height),
      },
      tag: parentTag ?? "synthetic",
      synthetic_parent_id: parentIdN!
    };

    // POST via background to avoid CORS
    await new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "POST_SCREENSHOT", payload } as Msg, (res: any) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
        if (!res?.ok) return reject(res?.error || "POST failed");
        resolve();
      });
    });

    console.log("✅ ScreenshotRequest sent.", { anns: annotations.length, w: payload.window.width, h: payload.window.height });
  } catch (e) {
    console.error("Export failed:", e);
  } finally {
    exporting = false;
  }
}

/** Listen from popup */
chrome.runtime.onMessage.addListener((msg: Msg) => {
  if (msg?.type === "START_EXPORT") {
    runExport().catch((err) => console.error("Export failed:", err));
  }
});
