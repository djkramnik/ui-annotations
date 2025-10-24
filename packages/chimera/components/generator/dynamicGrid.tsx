import { ServiceManualLabel } from "ui-labelling-shared";
import { Rect } from "../../util/generator";
import { PreviewSchema } from "../../util/localstorage";
import { DynamicMuiComponent } from "../mui/service-manual-dynamic";
import { Flex } from "./flex";
import { useMemo } from "react";
import { List, ListItem, SxProps, Theme } from "@mui/material";

type GridItem = {
  id: number;
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
    return { id: i, colStart: cs, colEnd: ce, rowStart: rs, rowEnd: re };
  });

  return { gridTemplateColumns, gridTemplateRows, items };
}

type GridRendererProps = {
  data: PreviewSchema;
  style?: React.CSSProperties;
  className?: string;
  showDebugBorders?: boolean;
  ComponentRenderer: ({
    label,
    children,
    rect,
    page,
    sx,
    container
  }: {
    label: ServiceManualLabel
    children?: React.ReactNode
    rect: Rect
    page: { width: number; height:  number }
    sx?: SxProps<Theme>
    container: Rect
  }) => React.ReactNode
};

export function GridRenderer({
  data,
  style,
  className,
  showDebugBorders = false,
  ComponentRenderer
}: GridRendererProps) {
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
          id={String(it.id)}
          style={{
            gridColumn: `${it.colStart} / ${it.colEnd}`,
            gridRow: `${it.rowStart} / ${it.rowEnd}`,
            ...(showDebugBorders ? { outline: "1px dashed rgba(0,0,0,0.3)" } : null),
          }}
        >
          <DynamicRegion data={data} id={it.id} ComponentRenderer={ComponentRenderer} />
        </div>
      ))}
    </div>
  );
}

function DynamicRegion({
  id,
  data,
  ComponentRenderer,
  padding = 12,
}: {
  id: number
  padding?: number
} & Pick<GridRendererProps, 'ComponentRenderer' | 'data'>) {
  const region = data.layout[id]
  const page = {
    width: data.annotations.viewWidth,
    height: data.annotations.viewHeight,
  }
  if (!region) {
    console.error('cannot find region definition from id', id)
    return null
  }
  const componentCount = data.annotations.payload.annotations.filter(a => {
    return region.components.includes(a.id)
  }).length

  const onlyChild = componentCount !== 1
    ? null
    : data.annotations.payload.annotations[0].label

  const content = useMemo(() => {
    const components = data.annotations.payload.annotations.filter(a => {
      return region.components.includes(a.id)
    })
    const bulletpoints = components.filter(c => c.label === ServiceManualLabel.bulletpoint)
    return (
      <>
        {
          components.filter(c => c.label !== ServiceManualLabel.bulletpoint)
            .map(c => {
              const maybeBold = c.label === ServiceManualLabel.heading
                && Math.random() > 0.7
              return (
                <ComponentRenderer page={page}
                  container={data.layout[id].rect}
                  sx={{
                    ...(maybeBold ? {
                      fontWeight: 'bold !important'
                    } : undefined),
                  }}
                  key={c.id} label={c.label as ServiceManualLabel} rect={c.rect}>
                  {c.textContent ?? null}
                </ComponentRenderer>
              )
            })
        }
        {
          bulletpoints.length > 0
            ? (
              <List sx={{ listStyleType: 'disc', pl: 2 }}>
                {
                  bulletpoints.map(bp => {
                    return (
                      <ComponentRenderer
                        container={data.layout[id].rect}
                        rect={bp.rect} page={page}
                        label={ServiceManualLabel.bulletpoint} key={bp.id}>
                        {bp.textContent}
                      </ComponentRenderer>
                    )
                  })
                }
              </List>
            )
            : null
        }
      </>
    )
  }, [data, id, ComponentRenderer, page, componentCount])

  const maybeCentered = useMemo(() => {
    return onlyChild === ServiceManualLabel.heading
      ? Math.random() > (id === 0 ? 0.2 : 0.8)
      : false
  }, [componentCount, onlyChild, id])

  return (
    <Flex col style={{
        padding: `${padding}px`,
        gap: '4px',
        ...(maybeCentered
          ? { justifyContent: 'center '}
          : undefined
        )
       }}>
      {content}
    </Flex>
  )
}