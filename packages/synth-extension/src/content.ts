import type { Annotation, Rect, ScreenshotRequest} from "ui-labelling-shared";
import type { Msg } from './types'

/** Utility: next animation frame */
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

/** Ask background to screenshot visible tab */
function captureVisible(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" } as Msg, (res: any) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
      if (!res?.ok || !res?.dataUrl) return reject(res?.error || "capture failed");
      resolve(res.dataUrl as string);
    });
  });
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

/** Scroll-and-stitch screenshot of a single element. Returns PNG base64 (no prefix) + DPR + component rects. */
async function stitchElementPNG(el: Element): Promise<{ base64: string; dpr: number; compAbs: AbsRect; cssSize: { w: number; h: number } }> {
  const dpr = window.devicePixelRatio || 1;
  const r = (el as HTMLElement).getBoundingClientRect();
  const compAbs: AbsRect = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  const cssSize = { w: r.width, h: r.height };

  const vpW = document.documentElement.clientWidth;
  const vpH = document.documentElement.clientHeight;

  // 10% overlap to avoid seams
  const stepX = Math.max(1, Math.floor(vpW * 0.9));
  const stepY = Math.max(1, Math.floor(vpH * 0.9));

  const xStops: number[] = [];
  for (let x = compAbs.x; x < compAbs.x + compAbs.w; x += stepX) {
    const end = Math.min(x + vpW, compAbs.x + compAbs.w);
    const start = Math.max(compAbs.x, end - vpW);
    xStops.push(start);
    if (end >= compAbs.x + compAbs.w) break;
  }

  const yStops: number[] = [];
  for (let y = compAbs.y; y < compAbs.y + compAbs.h; y += stepY) {
    const end = Math.min(y + vpH, compAbs.y + compAbs.h);
    const start = Math.max(compAbs.y, end - vpH);
    yStops.push(start);
    if (end >= compAbs.y + compAbs.h) break;
  }

  const outW = Math.round(compAbs.w * dpr);
  const outH = Math.round(compAbs.h * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  // Optional: hide sticky headers/footers if they overlap. (Left as-is; add selectors if needed.)

  for (const sy of yStops) {
    for (const sx of xStops) {
      window.scrollTo({ left: sx, top: sy, behavior: "instant" as ScrollBehavior });
      await nextFrame();

      const dataUrl = await captureVisible();
      const img = await dataUrlToImage(dataUrl);

      const vpRect: AbsRect = { x: window.scrollX, y: window.scrollY, w: vpW, h: vpH };
      const over = overlap(vpRect, compAbs);
      if (!over) continue;

      // source on screenshot in *device px*
      const srcX = (over.x - vpRect.x) * dpr;
      const srcY = (over.y - vpRect.y) * dpr;
      const srcW = over.w * dpr;
      const srcH = over.h * dpr;

      // destination in output canvas in *device px*
      const dstX = (over.x - compAbs.x) * dpr;
      const dstY = (over.y - compAbs.y) * dpr;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, Math.round(dstX), Math.round(dstY), Math.round(srcW), Math.round(srcH));
    }
  }

  const data = canvas.toDataURL("image/png");
  const base64 = data.split(",")[1]; // strip prefix
  return { base64, dpr, compAbs, cssSize };
}

/** Build annotations for elements with id^="label_" inside container. Rects in *device px*, relative to container origin. */
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

    const ann: Annotation = {
      id: crypto.randomUUID(),
      label: el.id || "label", // keep full id; change to el.id.replace(/^label_/, '') if you prefer
      rect: { x: Math.round(relX), y: Math.round(relY), width: Math.round(w), height: Math.round(h) } as Rect,
      text_content: text,
      clean: false,
    };
    anns.push(ann);
  });

  return anns;
}

/** Main export flow */
async function runExport(): Promise<void> {
  const container = document.querySelector<HTMLElement>("#synth-container");
  if (!container) return; // no-op

  // Stitch screenshot
  const { base64, dpr, compAbs, cssSize } = await stitchElementPNG(container);

  // Annotations
  const annotations = buildAnnotations(container, dpr, compAbs);

  // Payload
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

  // POST
  await fetch("http://localhost:4000/api/screenshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // credentials: "include" // if you need cookies
  });
}

// Listen from popup
chrome.runtime.onMessage.addListener((msg: Msg) => {
  if (msg?.type === "START_EXPORT") {
    runExport().catch(err => console.error("Export failed:", err));
  }
});
