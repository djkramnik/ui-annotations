import { ServiceManualLabel } from "ui-labelling-shared";
import { estimateFontAndTrackingBox, estimateRegionPad, getRegionLayoutDirection, Rect } from "../../util/generator";
import { PreviewSchema } from "../../util/localstorage";
import { Flex } from "./flex";
import { useMemo } from "react";
import { List, SxProps, Theme } from "@mui/material";

type GridItem = {
  id: number;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
};

function buildGrid({
  input,
  epsPct = 0.01,
  scale = 0.7
}: {
  input: PreviewSchema,
  epsPct?: number
  scale?: number
}): {
  container: { widthPx: number; heightPx: number; scale: number };
  gridTemplateColumns: string;
  gridTemplateRows: string;
  items: GridItem[];
} {
  const { layout, contentBounds: cb, annotations } = input;
  const pageW = Math.max(1, annotations.viewWidth);
  const pageH = Math.max(1, annotations.viewHeight);

  // Fixed container: half page width, preserve aspect ratio
  const containerW = Math.round(pageW * scale);

  const containerH = Math.round(pageH * scale);

  const epsX = epsPct * pageW;
  const epsY = epsPct * pageH;

  const snapPush = (arr: number[], v: number, eps: number) => {
    for (let i = 0; i < arr.length; i++) if (Math.abs(arr[i] - v) <= eps) return;
    arr.push(v);
  };

  // Start with full-page edges (so margins are explicit grid tracks)
  const xEdges: number[] = [0, pageW];
  const yEdges: number[] = [0, pageH];

  // Also add contentBounds edges to delineate margins vs. content
  snapPush(xEdges, cb.x, epsX);
  snapPush(xEdges, cb.x + cb.width, epsX);
  snapPush(yEdges, cb.y, epsY);
  snapPush(yEdges, cb.y + cb.height, epsY);

  // Add all region edges (rects are assumed in absolute page coords)
  layout.forEach(({ rect: r }) => {
    snapPush(xEdges, r.x, epsX);
    snapPush(xEdges, r.x + r.width, epsX);
    snapPush(yEdges, r.y, epsY);
    snapPush(yEdges, r.y + r.height, epsY);
  });

  xEdges.sort((a, b) => a - b);
  yEdges.sort((a, b) => a - b);

  // Produce pixel track sizes, scaled to the fixed container
  const toPxTracks = (edges: number[]) =>
    edges
      .slice(0, -1)
      .map((e, i) => Math.max(0, Math.round((edges[i + 1] - e) * scale)) + 'px')
      .join(' ');

  const gridTemplateColumns = toPxTracks(xEdges);
  const gridTemplateRows = toPxTracks(yEdges);

  const findIndex = (edges: number[], v: number, eps: number) => {
    let idx = edges.findIndex((e) => Math.abs(e - v) <= eps);
    if (idx === -1) {
      edges.push(v);
      edges.sort((a, b) => a - b);
      idx = edges.indexOf(v);
    }
    return idx;
  };

  const items: GridItem[] = layout.map(({ rect: r }, i) => {
    const cs = findIndex(xEdges, r.x, epsX) + 1;
    const ce = findIndex(xEdges, r.x + r.width, epsX) + 1;
    const rs = findIndex(yEdges, r.y, epsY) + 1;
    const re = findIndex(yEdges, r.y + r.height, epsY) + 1;
    return { id: i, colStart: cs, colEnd: ce, rowStart: rs, rowEnd: re };
  });

  return {
    container: { widthPx: containerW, heightPx: containerH, scale },
    gridTemplateColumns,
    gridTemplateRows,
    items,
  };
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
    container,
    scale,
  }: {
    label: ServiceManualLabel
    children?: React.ReactNode
    rect: Rect
    page: { width: number; height:  number }
    sx?: SxProps<Theme>
    container: Rect
    scale: number
  }) => React.ReactNode
};

export function GridRenderer({
  data,
  style,
  className,
  showDebugBorders = false,
  ComponentRenderer
}: GridRendererProps) {
  const { gridTemplateColumns, gridTemplateRows, items, container } = buildGrid({
    input: data,
  });
  console.log('scale', container.scale)
  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns,
    gridTemplateRows,
    width: container.widthPx,
    height: container.heightPx,
    boxSizing: "border-box",
    border: '1px solid currentColor',
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
          <DynamicRegion
            data={data}
            id={it.id}
            ComponentRenderer={ComponentRenderer}
            scale={container.scale}
          />
        </div>
      ))}
    </div>
  );
}

function DynamicRegion({
  id,
  data,
  ComponentRenderer,
  scale
}: {
  id: number
  scale: number
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

  const flow: 'row' | 'col' = useMemo(() => {
    const components = data.annotations.payload.annotations.filter(a => {
      return region.components.includes(a.id)
    })
    return getRegionLayoutDirection(components.map(c => c.rect))
  }, [data])

  const content: React.ReactNode = useMemo(() => {
    const components = data.annotations.payload.annotations.filter(a => {
      return region.components.includes(a.id)
    }).sort((a, b) => a.rect.y - b.rect. y || a.rect.x - b.rect.x)

    const bulletpoints =
      components.filter(c => c.label === ServiceManualLabel.bulletpoint)

    // must have the same font size and letter spacing across all these bulletpoints,
    // at least within a given region ffs
    const bp = bulletpoints.find(bp => bp.textContent)
    const bpFontInfo = bp
      ? estimateFontAndTrackingBox(bp.rect, bp.textContent!, {
          lineCount: bp.textContent!.split('\n').length,
        })
      : null
    const bpFs = bpFontInfo
      ? {
          fontSize: `${bpFontInfo.fontPx * scale}px`,
          letterSpacing: `${bpFontInfo.letterSpacingPx * scale}px`,
        }
      : null

    // sort comments from top left to bottom right

    let sortedElems: React.ReactNode[] = []

    let firstBulletpoint: boolean = false
    for (const c of components) {

      // hack for bulletpoints
      // we assume within a given region that there is only one actual list
      // and once we encounter a bulletpoint we mark that as the start of the list
      // and put all the bulletpoints under it
      if (c.label === ServiceManualLabel.bulletpoint) {
        if (!firstBulletpoint) {
          firstBulletpoint = true
          sortedElems.push(
            <List sx={{ listStyleType: 'disc', pl: 2 }}>
              {
                bulletpoints.map(bp => {
                  return (
                    <ComponentRenderer
                      scale={scale}
                      container={data.layout[id].rect}
                      rect={bp.rect} page={page}
                      label={ServiceManualLabel.bulletpoint} key={bp.id}
                      sx={{
                        padding: 0,
                        ...bpFs ?? {}
                      }}
                      >
                      {bp.textContent}
                    </ComponentRenderer>
                  )
                })
              }
            </List>
          )
        }
        continue // except for the first bulletpoint where we do everything, skip
      }

      const maybeBold = c.label === ServiceManualLabel.heading
        && Math.random() > 0.7

      sortedElems.push(
        <ComponentRenderer
          page={page}
          container={data.layout[id].rect}
          sx={{
            ...(maybeBold ? {
              fontWeight: 'bold !important'
            } : undefined),
          }}
          key={c.id} label={c.label as ServiceManualLabel}
          rect={c.rect}
          scale={scale}
          >
          {c.textContent ?? null}
        </ComponentRenderer>
      )

    }

    return (
      <>
        {sortedElems}
      </>
    )
  }, [data, id, ComponentRenderer, page, componentCount, scale])

  const maybeCentered = useMemo(() => {
    return onlyChild === ServiceManualLabel.heading
      ? Math.random() > (id === 0 ? 0.2 : 0.8)
      : false
  }, [componentCount, onlyChild, id])

  const { top: topP, left: leftP } = useMemo(() => {
    return estimateRegionPad(id, data)
  }, [id, data])

  const padStyle = {
    paddingLeft: `${Math.floor(leftP * scale)}px`,
    paddingTop: `${Math.floor(topP * scale)}px`,
  }

  const flexProps = flow === 'row'
    ? {
      wrap: true
    }
    : {
      col: true
    }
  return (
    <Flex {...flexProps} style={{
        ...padStyle,
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