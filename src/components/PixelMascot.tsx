"use client";

import { Box } from "@mui/material";
import type { CSSProperties } from "react";
import { DoodleSparkle } from "@/components/doodles";

// ─────────────────────────────────────────────────────────────────────────────
// PixelMascot — one reusable 16-bit SVG character for the whole workspace.
// A hooded kid (black hair, yellow hoodie, tiny lavender backpack) + a small
// white cat companion. Drawn as a grid of <rect> "pixels" (crisp, themeable,
// no binary assets). Used SPARINGLY for emotional feedback — empty states,
// active menus, celebrations.
//
// Poses vary only the arms / a small prop / the face, so the silhouette stays
// recognizable. Motion reuses keyframes already in app/globals.css
// (float-bob, mascot-blink, celebrate-pop) and respects prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────────────

// Any char not in the palette renders transparent — use "." for empty pixels.
const PALETTE: Record<string, string> = {
  K: "#2E2E2E", // outline / black hair
  s: "#F6CBA0", // skin
  S: "#E3A878", // skin shadow
  e: "#2E2E2E", // eye (blinks)
  l: "#2E2E2E", // closed eye (no blink)
  m: "#F1A9A9", // blush
  h: "#F4C56A", // hoodie (yellow)
  H: "#DDA94C", // hoodie shadow
  p: "#5F6DA0", // denim
  o: "#3A3A3A", // shoes
  b: "#8B7CF6", // backpack (primary lavender)
  B: "#6D5DD3", // backpack strap / shadow
  // cat
  c: "#FFFFFF",
  C: "#3A3A3A",
  n: "#F0A6A6",
  // props
  j: "#FFFFFF", // card body
  J: "#8B7CF6", // card lines (lavender)
  z: "#8B7CF6", // zzz / accent
};

// A grid of strings → <rect> pixels. Eyes ("e") get the blink class.
function PixelGrid({ rows, unit, style, blink, className }: { rows: string[]; unit: number; style?: CSSProperties; blink?: boolean; className?: string }) {
  const cols = Math.max(...rows.map((r) => r.length));
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const fill = PALETTE[ch];
      if (!fill) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1.03}
          height={1.03}
          fill={fill}
          className={blink && ch === "e" ? "mascot-blink" : undefined}
        />,
      );
    }
  });
  return (
    <svg
      viewBox={`0 0 ${cols} ${rows.length}`}
      width={cols * unit}
      height={rows.length * unit}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
    >
      {rects}
    </svg>
  );
}

// ── Character parts ──────────────────────────────────────────────────────────
const HEAD = (closed: boolean) => [
  ".....KKKKKK.....",
  "....KKKKKKKK....",
  "...KKsssssKK....",
  closed ? "...KKslslsKK...." : "...KKsesesKK....",
  "...KKmsSsmKK....",
  "....HhhhhhhH....",
];

const LEGS = [
  "...hhhhhhhh.....",
  "...pppppppp.....",
  "....pp..pp......",
  "....pp..pp......",
  "....oo..oo......",
];

// Rows 6–10: torso + arms. Backpack (b/B) peeks past the right shoulder.
const BODY = {
  idle: [
    "..hhhhhhhhbb...",
    "..hHhhhhhHbB...",
    "..hHhhhhhHbB...",
    "..sHhhhhhHs....",
    "...hhhhhhhh....",
  ],
  think: [
    "..hhhhhhhhbb...",
    "..hHhhhhhHbB...",
    "..hHhhhhhsB....",
    "..sHhhhhhHh....",
    "...hhhhhhhh....",
  ],
  hold: [
    "..hhhhhhhhbb...",
    "..hHhhhhhHbB...",
    "..hHssssHhb...",
    "..hHssssHh....",
    "...hhhhhhhh....",
  ],
  celebrate: [
    "s.hhhhhhhh.s..",
    ".hHhhhhhhHh...",
    "..hhhhhhhhbb..",
    "..hHhhhhhHh...",
    "...hhhhhhhh...",
  ],
} as const;

const CAT = [
  "C...C.",
  "CcccC.",
  "cococ.",
  "ccncc.",
  "ccccc.",
  ".cc.C.",
];

const CARD = ["jjjjjj", "jJJJJj", "jJjjJj", "jJJJJj", "jjjjjj"];
const ZZZ = ["..z", ".z.", "z.."];

export type MascotPose = "idle" | "thinking" | "reading" | "coding" | "waiting" | "celebrate" | "sleeping";

const POSE_BODY: Record<MascotPose, keyof typeof BODY> = {
  idle: "idle",
  waiting: "idle",
  thinking: "think",
  reading: "hold",
  coding: "hold",
  sleeping: "idle",
  celebrate: "celebrate",
};

export function PixelMascot({
  pose = "idle",
  size = 96,
  cat = true,
  animate = true,
  className,
  style,
}: {
  pose?: MascotPose;
  /** Target height of the character in px. */
  size?: number;
  cat?: boolean;
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const unit = size / 16; // character grid is 16 tall
  const sleeping = pose === "sleeping";
  const rows = [...HEAD(sleeping), ...BODY[POSE_BODY[pose]], ...LEGS];

  return (
    <Box
      className={className}
      sx={{ position: "relative", width: size * 1.35, height: size, flexShrink: 0, ...style }}
    >
      {/* Character */}
      <Box
        className={animate ? (pose === "celebrate" ? "mascot-celebrate" : "animate-float") : undefined}
        sx={{ position: "absolute", left: 0, bottom: 0 }}
      >
        <PixelGrid rows={rows} unit={unit} blink={animate && !sleeping} />
      </Box>

      {/* Cat companion, sitting by the feet */}
      {cat ? (
        <Box sx={{ position: "absolute", right: size * 0.02, bottom: 0 }}>
          <PixelGrid rows={CAT} unit={size / 16} />
        </Box>
      ) : null}

      {/* Props / effects per pose */}
      {(pose === "reading" || pose === "coding") && (
        <Box sx={{ position: "absolute", left: size * 0.34, top: size * 0.5 }}>
          <PixelGrid rows={CARD} unit={size / 20} />
        </Box>
      )}
      {pose === "celebrate" && (
        <>
          <DoodleSparkle size={size * 0.2} className="animate-twinkle" style={{ position: "absolute", top: 0, left: -2 }} />
          <DoodleSparkle size={size * 0.16} color="#8CCB84" className="animate-twinkle" style={{ position: "absolute", top: size * 0.1, right: size * 0.1 }} />
        </>
      )}
      {(pose === "thinking" || pose === "waiting") && (
        <Box className={animate ? "animate-twinkle" : undefined} sx={{ position: "absolute", top: size * 0.02, left: size * 0.62 }}>
          <PixelGrid rows={ZZZ} unit={size / 22} />
        </Box>
      )}
      {sleeping && (
        <Box sx={{ position: "absolute", top: -size * 0.05, left: size * 0.6, display: "flex", alignItems: "flex-end", gap: size * 0.02 }}>
          <PixelGrid rows={ZZZ} unit={size / 26} className="animate-float" />
          <PixelGrid rows={ZZZ} unit={size / 20} />
        </Box>
      )}
    </Box>
  );
}
