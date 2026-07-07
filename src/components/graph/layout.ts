// Pure layout math for the API Graph canvas. Kept out of the view so it can be
// unit-reasoned and reused by both the default placement and "Auto Arrange".

import type { GraphEdge, NodePosition } from "@/lib/apiGraph";

export const NODE_W = 208;
export const NODE_H = 56;
export const COL_GAP = 288; // x stride between layers
export const ROW_GAP = 92; // y stride within a layer
export const MARGIN = 56;

// Tidy grid — used as the first-view default so a fresh group never opens as a
// pile of overlapping boxes. Columns ≈ √n so it stays roughly square.
export function gridLayout(ids: string[]): Record<string, NodePosition> {
  const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
  const out: Record<string, NodePosition> = {};
  ids.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out[id] = { x: MARGIN + col * COL_GAP, y: MARGIN + row * ROW_GAP };
  });
  return out;
}

// Layered ("Sugiyama-lite") layout: place sources on the left, followers to the
// right, so relationship direction reads L→R. Cycles/unreached nodes fall back
// to their own layers so nothing is dropped or overlapped.
export function layeredLayout(ids: string[], edges: GraphEdge[]): Record<string, NodePosition> {
  if (ids.length === 0) return {};
  const set = new Set(ids);
  const scoped = edges.filter((e) => set.has(e.from) && set.has(e.to));

  const indeg = new Map<string, number>();
  const outAdj = new Map<string, string[]>();
  ids.forEach((id) => {
    indeg.set(id, 0);
    outAdj.set(id, []);
  });
  for (const e of scoped) {
    if (e.from === e.to) continue;
    outAdj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  // Kahn-style longest-path layering, tolerant of cycles.
  const layer = new Map<string, number>();
  let frontier = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  if (frontier.length === 0) frontier = [...ids]; // fully cyclic → treat all as roots
  frontier.forEach((id) => layer.set(id, 0));

  const remaining = new Map(indeg);
  const queue = [...frontier];
  let guard = 0;
  while (queue.length && guard < ids.length * 4) {
    guard++;
    const id = queue.shift()!;
    const cur = layer.get(id) ?? 0;
    for (const to of outAdj.get(id) ?? []) {
      layer.set(to, Math.max(layer.get(to) ?? 0, cur + 1));
      const left = (remaining.get(to) ?? 1) - 1;
      remaining.set(to, left);
      if (left <= 0) queue.push(to);
    }
  }
  // Anything the traversal never reached (isolated / trapped in a cycle).
  ids.forEach((id) => {
    if (!layer.has(id)) layer.set(id, 0);
  });

  // Bucket by layer, then assign row positions within each column.
  const byLayer = new Map<number, string[]>();
  ids.forEach((id) => {
    const l = layer.get(id) ?? 0;
    const arr = byLayer.get(l) ?? [];
    arr.push(id);
    byLayer.set(l, arr);
  });

  const out: Record<string, NodePosition> = {};
  [...byLayer.keys()]
    .sort((a, b) => a - b)
    .forEach((l) => {
      byLayer.get(l)!.forEach((id, row) => {
        out[id] = { x: MARGIN + l * COL_GAP, y: MARGIN + row * ROW_GAP };
      });
    });
  return out;
}

// Bounding box of laid-out nodes (for the minimap + fit-to-view).
export function boundsOf(positions: { x: number; y: number }[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (positions.length === 0) return { minX: 0, minY: 0, maxX: NODE_W, maxY: NODE_H };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of positions) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  return { minX, minY, maxX, maxY };
}
