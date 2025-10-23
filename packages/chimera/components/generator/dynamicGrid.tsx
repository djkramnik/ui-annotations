import { Rect } from "../../util/generator";
import { PreviewSchema } from "../../util/localstorage";

type GridItem = {
  id: string;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
};

function buildGrid(input: PreviewSchema, epsilonPct = 0.01) {
  const { layout, contentBounds: cb } = input;
  const norm = (r: Rect) => ({
    left: (r.x - cb.x) / cb.width,
    top: (r.y - cb.y) / cb.height,
    right: (r.x + r.width - cb.x) / cb.width,
    bottom: (r.y + r.height - cb.y) / cb.height,
  });

  const snapPush = (arr: number[], v: number, eps: number) => {
    for (let i = 0; i < arr.length; i++) if (Math.abs(arr[i] - v) <= eps) return;
    arr.push(v);
  };

  const epsX = epsilonPct; // ~1% of content width
  const epsY = epsilonPct; // ~1% of content height
  const xEdges: number[] = [0, 1];
  const yEdges: number[] = [0, 1];

  const norms = layout.map((l) => norm(l.rect));
  norms.forEach(({ left, right, top, bottom }) => {
    snapPush(xEdges, Math.max(0, Math.min(1, left)), epsX);
    snapPush(xEdges, Math.max(0, Math.min(1, right)), epsX);
    snapPush(yEdges, Math.max(0, Math.min(1, top)), epsY);
    snapPush(yEdges, Math.max(0, Math.min(1, bottom)), epsY);
  });

  xEdges.sort((a, b) => a - b);
  yEdges.sort((a, b) => a - b);

  const toTemplate = (edges: number[]) =>
    edges
      .slice(0, -1)
      .map((e, i) => `${Math.max(0, (edges[i + 1] - e) * 100).toFixed(3)}%`)
      .join(" ");

  const gridTemplateColumns = toTemplate(xEdges);
  const gridTemplateRows = toTemplate(yEdges);

  const findIndex = (edges: number[], v: number, eps: number) => {
    let idx = edges.findIndex((e) => Math.abs(e - v) <= eps);
    if (idx === -1) {
      // insert and keep sorted if an edge fell between tolerance (rare)
      edges.push(v);
      edges.sort((a, b) => a - b);
      idx = edges.indexOf(v);
    }
    return idx;
  };

  const items: GridItem[] = norms.map((r, i) => {
    const cs = findIndex(xEdges, r.left, epsX) + 1;
    const ce = findIndex(xEdges, r.right, epsX) + 1;
    const rs = findIndex(yEdges, r.top, epsY) + 1;
    const re = findIndex(yEdges, r.bottom, epsY) + 1;
    return { id: `region-${i}`, colStart: cs, colEnd: ce, rowStart: rs, rowEnd: re };
  });

  return { gridTemplateColumns, gridTemplateRows, items };
}

type GridRendererProps = {
  data: PreviewSchema;
  style?: React.CSSProperties;
  className?: string;
  showDebugBorders?: boolean;
};

export function GridRenderer({ data, style, className, showDebugBorders = false }: GridRendererProps) {
  const { contentBounds: cb } = data;
  const { gridTemplateColumns, gridTemplateRows, items } = buildGrid(data);

  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns,
    gridTemplateRows,
    width: "100%",
    aspectRatio: `${cb.width} / ${cb.height}`,
    boxSizing: "border-box",
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {items.map((it) => (
        <div
          key={it.id}
          id={it.id}
          style={{
            gridColumn: `${it.colStart} / ${it.colEnd}`,
            gridRow: `${it.rowStart} / ${it.rowEnd}`,
            ...(showDebugBorders ? { outline: "1px dashed rgba(0,0,0,0.3)" } : null),
          }}
        />
      ))}
    </div>
  );
}
