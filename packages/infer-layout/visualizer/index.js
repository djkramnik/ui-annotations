// ---------- Sample Data (you can paste your own into the textarea) ----------
const SAMPLE = {
  page: { width: 612, height: 792 }, // PDF points
  elements: [
    { id: "h1", type: "heading", bbox: [54, 54, 558, 96], text: "Airbag System Overview" },
    { id: "p1", type: "text", bbox: [54, 110, 350, 170], text: "Disconnect the battery negative cable." },
    { id: "p2", type: "text", bbox: [54, 176, 350, 230], text: "Wait 3 minutes before servicing the SRS." },
    { id: "warn", type: "warning", bbox: [360, 110, 558, 190], text: "Risk of accidental deployment.\nFollow SRS precautions." },
    { id: "fig", type: "figure", bbox: [54, 360, 558, 620] },
    { id: "cap", type: "text", bbox: [54, 622, 558, 650], text: "Figure 1. Steering wheel airbag module." },
  ]
};

// ---------- Utilities ----------
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const median = (arr) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x,y) => x-y);
  const m = Math.floor(a.length/2);
  return a.length % 2 ? a[m] : 0.5*(a[m-1]+a[m]);
};
const overlap1D = (a0,a1,b0,b1) => Math.max(0, Math.min(a1,b1) - Math.max(a0,b0));

// ---------- Minimal Inference (JS) ----------
function normalize(elements, page) {
  const {width: W, height: H} = page;
  return elements.map(e => {
    const [x0,y0,x1,y1] = e.bbox;
    const nx0 = clamp01(x0/W), nx1 = clamp01(x1/W);
    const ny0 = clamp01(y0/H), ny1 = clamp01(y1/H);
    const w = Math.max(0,nx1-nx0), h = Math.max(0,ny1-ny0);
    return {...e, nx0, ny0, nx1, ny1, w, h, cx:(nx0+nx1)/2, cy:(ny0+ny1)/2};
  });
}

function estimateUnit(elems) {
  const heights = elems.map(e => e.h);
  const u = median(heights);
  return Math.max(0.003, Math.min(u, 0.08));
}

function clusterColumns(elems, cxGapThreshold=0.08) {
  if (!elems.length) return [];
  const sorted = [...elems].sort((a,b)=>a.cx-b.cx);
  const clusters = [];
  let cur = [0];
  for (let i=1;i<sorted.length;i++){
    const gap = Math.abs(sorted[i].cx - sorted[i-1].cx);
    if (gap > cxGapThreshold) { clusters.push(cur); cur = [i]; }
    else cur.push(i);
  }
  clusters.push(cur);
  // Map back to original indices
  const id2idx = new Map();
  elems.forEach((e,i)=>id2idx.set(e.id,i));
  return clusters.map(c => c.map(i => id2idx.get(sorted[i].id)));
}

function groupRowsInColumn(blocks, u) {
  if (!blocks.length) return [];
  const sorted = [...blocks].sort((a,b)=>a.ny0-b.ny0 || a.nx0-b.nx0);
  const rows = [];
  let cur = [sorted[0].id];
  for (let i=1;i<sorted.length;i++){
    const prev = sorted[i-1], curB = sorted[i];
    const vgap = Math.max(0, curB.ny0 - prev.ny1);
    const yOv = overlap1D(prev.ny0, prev.ny1, curB.ny0, curB.ny1);
    const yOvRatio = yOv / Math.max(1e-6, Math.min(prev.h, curB.h));
    const sameRow = vgap <= 1.5*u || yOvRatio > 0.1;
    if (sameRow) cur.push(curB.id);
    else { rows.push({blockIds:[...cur]}); cur=[curB.id]; }
  }
  if (cur.length) rows.push({blockIds:[...cur]});
  return rows;
}

function buildLayoutTree(norm, page) {
  const u = estimateUnit(norm);
  const clustIdx = clusterColumns(norm, 0.08);
  const columns = clustIdx.map(idxs => {
    const blocks = idxs.map(i => norm[i]).sort((a,b)=>a.ny0-b.ny0 || a.nx0-b.nx0);
    const x0 = Math.min(...blocks.map(b=>b.nx0));
    const x1 = Math.max(...blocks.map(b=>b.nx1));
    const rows = groupRowsInColumn(blocks, u);
    return { xRange:[x0,x1], rowGroups: rows, blockIdsInColumn: blocks.map(b=>b.id) };
  }).sort((a,b)=>a.xRange[0]-b.xRange[0]);
  const aspect = page.width / Math.max(1e-6, page.height);
  return { page:{...page, aspect}, columns, relations:[], unit:u };
}

// ---------- Style Kits ----------
const STYLE_KITS = {
  classic: (seed) => ({
    baseFont: "Georgia, 'Times New Roman', serif",
    headingFont: "Georgia, 'Times New Roman', serif",
    size: { h1: 22, body: 12, caption: 11 },
    color: { ink:"#222", muted:"#667085", warnBg:"#fff8e6", warnBorder:"#f39c12" },
    lineHeight: { h1:1.2, body:1.3 }
  }),
  modern: (seed) => ({
    baseFont: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    headingFont: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    size: { h1: 24, body: 13, caption: 11.5 },
    color: { ink:"#1b1f24", muted:"#6b7280", warnBg:"#fff6e8", warnBorder:"#f59e0b" },
    lineHeight: { h1:1.1, body:1.35 }
  }),
  industrial: (seed) => ({
    baseFont: "'IBM Plex Sans', Inter, system-ui",
    headingFont: "'IBM Plex Sans', Inter, system-ui",
    size: { h1: 21, body: 12.5, caption: 11 },
    color: { ink:"#1f2937", muted:"#64748b", warnBg:"#fff4db", warnBorder:"#f59e0b" },
    lineHeight: { h1:1.15, body:1.32 }
  }),
  sport: (seed) => ({
    baseFont: "'Montserrat', Inter, system-ui",
    headingFont: "'Montserrat', Inter, system-ui",
    size: { h1: 26, body: 12.5, caption: 11 },
    color: { ink:"#111827", muted:"#6b7280", warnBg:"#fff3e0", warnBorder:"#fb923c" },
    lineHeight: { h1:1.05, body:1.28 }
  }),
};

// ---------- DOM Rendering ----------
function px(n){ return `${n|0}px`; }

function renderPage({elements, page, styleKey, seed, aspectKey, dpi}) {
  // size stage by aspect + dpi
  const stage = document.getElementById("stage");
  const root = document.getElementById("pageRoot");
  root.innerHTML = "";

  const aspect = aspectKey === "a4" ? (210/297) : (8.5/11);
  const widthInches = aspectKey === "a4" ? 8.27 : 8.5;
  const heightInches = widthInches / aspect;
  const W = Math.round(widthInches * dpi);
  const H = Math.round(heightInches * dpi);

  stage.style.width = px(W);
  stage.style.height = px(H);

  document.getElementById("pageInfo").textContent =
    `Canvas: ${W}×${H}px  |  Aspect ~ ${aspect.toFixed(3)}  |  DPI ${dpi}`;

  // normalize to [0,1] using page (PDF) size
  const norm = normalize(elements, page);
  const tree = buildLayoutTree(norm, page);

  // style kit
  const kit = STYLE_KITS[styleKey](seed);
  stage.style.setProperty("--ink", kit.color.ink);
  stage.style.setProperty("--muted", kit.color.muted);
  stage.style.setProperty("--warn-bg", kit.color.warnBg);
  stage.style.setProperty("--warn-border", kit.color.warnBorder);

  // render each element as absolutely positioned div
  const id2elem = new Map(norm.map(e => [e.id, e]));
  for (const e of norm) {
    const el = document.createElement("div");
    el.className = `block ${e.type}`;
    // absolute coords in pixels
    el.style.left = px(Math.round(e.nx0 * W));
    el.style.top = px(Math.round(e.ny0 * H));
    el.style.width = px(Math.round(e.w * W));
    el.style.height = px(Math.round(e.h * H));

    // typography
    if (e.type === "heading") {
      el.style.fontFamily = kit.headingFont;
      el.style.fontSize = px(kit.size.h1);
      el.style.lineHeight = kit.lineHeight.h1;
    } else if (e.type === "text" || e.type === "warning" || e.type === "note" || e.type === "caption") {
      el.style.fontFamily = kit.baseFont;
      el.style.fontSize = px( e.type === "caption" ? kit.size.caption : kit.size.body );
      el.style.lineHeight = kit.lineHeight.body;
    } else {
      el.style.fontFamily = kit.baseFont;
      el.style.fontSize = px(kit.size.body);
      el.style.lineHeight = kit.lineHeight.body;
    }

    // content
    if (e.type === "figure" || e.type === "diagram" || e.type === "image") {
      el.textContent = (e.type.toUpperCase());
    } else {
      el.textContent = e.text || "";
    }

    root.appendChild(el);
  }

  // also dump tree JSON for debugging
  const out = { ...tree, elements: norm.map(({text, ...rest}) => rest) };
  document.getElementById("jsonOutput").value = JSON.stringify(out, null, 2);

  return { width: W, height: H, node: stage };
}

// ---------- Export to PNG (SVG foreignObject snapshot) ----------
async function exportPNG(stageNode, width, height, fileName="page.png") {
  const clone = stageNode.cloneNode(true);
  clone.querySelector(".page-grid")?.remove(); // no grid on export
  // Inline styles for better fidelity
  clone.style.margin = "0";

  const serializer = new XMLSerializer();
  const xhtml = serializer.serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">
        ${xhtml}
      </foreignObject>
    </svg>`;
  const svgBlob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";
  const loaded = new Promise(res => img.onload = res);
  img.src = url;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  URL.revokeObjectURL(url);
  const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
  const a = document.createElement("a");
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// ---------- Wire up UI ----------
const $ = (id) => document.getElementById(id);

function getInputs() {
  const styleKit = $("styleKit").value;
  const seed = Number($("seed").value) || 42;
  const aspect = $("aspect").value;     // 'letter' | 'a4'
  const dpi = Number($("dpi").value) || 288;

  let parsed;
  try { parsed = JSON.parse($("jsonInput").value || "null"); }
  catch { parsed = null; }
  if (!parsed) parsed = SAMPLE;

  return { styleKit, seed, aspect, dpi, ...parsed };
}

let lastStageInfo = null;

$("btnLoadSample").onclick = () => {
  $("jsonInput").value = JSON.stringify(SAMPLE, null, 2);
};
$("btnRender").onclick = () => {
  const { elements, page, styleKit, seed, aspect, dpi } = getInputs();
  lastStageInfo = renderPage({elements, page, styleKey: styleKit, seed, aspectKey: aspect, dpi});
};
$("btnExport").onclick = async () => {
  if (!lastStageInfo) { $("btnRender").click(); }
  const { node, width, height } = lastStageInfo || {};
  await exportPNG(node, width, height, "synthetic_page.png");
};
$("fileInput").onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const txt = await f.text();
  $("jsonInput").value = txt;
};

// preload
$("btnLoadSample").click();
