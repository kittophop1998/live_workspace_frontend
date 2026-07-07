"use client";

// Bird's-eye minimap for the active feature group. Shows every node as a dot and
// the current viewport as a rectangle; clicking recenters the camera on that
// world point. Pure presentational — the parent owns the camera.

import { NODE_H, NODE_W, boundsOf } from "@/components/graph/layout";
import { line } from "@/components/theme";

const MAP_W = 168;
const MAP_H = 116;
const PAD = 8;

export function GraphMinimap({
  nodes,
  view,
  onRecenter,
}: {
  nodes: { id: string; x: number; y: number; color: string }[];
  view: { x: number; y: number; k: number; w: number; h: number }; // camera + container size
  onRecenter: (worldX: number, worldY: number) => void;
}) {
  if (nodes.length === 0) return null;
  const b = boundsOf(nodes);
  const worldW = Math.max(b.maxX - b.minX, 1);
  const worldH = Math.max(b.maxY - b.minY, 1);
  const scale = Math.min((MAP_W - PAD * 2) / worldW, (MAP_H - PAD * 2) / worldH);
  const ox = PAD - b.minX * scale;
  const oy = PAD - b.minY * scale;

  // Viewport rect in world coords → map coords.
  const vx = -view.x / view.k;
  const vy = -view.y / view.k;
  const vw = view.w / view.k;
  const vh = view.h / view.k;

  const toMap = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onRecenter((mx - ox) / scale, (my - oy) / scale);
  };

  return (
    <svg
      width={MAP_W}
      height={MAP_H}
      onClick={toMap}
      style={{
        background: "#fff",
        border: `1px solid ${line}`,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(46,46,46,.1)",
        cursor: "pointer",
        display: "block",
      }}
    >
      {nodes.map((n) => (
        <rect
          key={n.id}
          x={ox + n.x * scale}
          y={oy + n.y * scale}
          width={Math.max(NODE_W * scale, 3)}
          height={Math.max(NODE_H * scale, 3)}
          rx={1.5}
          fill={n.color}
          opacity={0.85}
        />
      ))}
      <rect
        x={ox + vx * scale}
        y={oy + vy * scale}
        width={vw * scale}
        height={vh * scale}
        fill="rgba(139,124,246,0.12)"
        stroke="#8B7CF6"
        strokeWidth={1.25}
        rx={2}
      />
    </svg>
  );
}
