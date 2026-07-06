"use client";

import type { CSSProperties, ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Doodles & chibi characters — hand-drawn SVG decorations for the notebook.
// All use a soft brown "pencil" stroke and pastel fills. Purely presentational.
// ─────────────────────────────────────────────────────────────────────────────

const STROKE = "#6B5B49";

type IconProps = { size?: number; className?: string; style?: CSSProperties };

function Svg({ size = 48, className, style, children, viewBox = "0 0 64 64" }: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      width={size}
      height={size}
      style={{ display: "block", overflow: "visible", ...style }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// A sleeping cat curled into a comma. 😴
export function ChibiCat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 40c-1-11 8-19 19-18 10 1 18 9 16 19-1 7-9 11-18 11-9 0-16-4-17-12Z" fill="#FFE0C2" stroke={STROKE} strokeWidth="2.4" />
      <path d="M17 26l-3-8 8 4M31 24l3-9 5 8" fill="#FFE0C2" stroke={STROKE} strokeWidth="2.4" />
      <path d="M24 33c1.5 1.5 4 1.5 5.5 0M33 34c1.5 1.5 4 1.5 5.5 0" stroke={STROKE} strokeWidth="2.2" />
      <path d="M14 46c8 4 24 4 33-1" stroke={STROKE} strokeWidth="2.2" />
      <path d="M46 30c4-2 8-1 9 2" stroke={STROKE} strokeWidth="2" />
      <path d="M43 20l3-3M48 24l4-2" stroke="#F5799F" strokeWidth="2" />
    </Svg>
  );
}

// A friendly little robot — the AI helper mascot. 🤖
export function ChibiRobot(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M32 8v6" stroke={STROKE} strokeWidth="2.4" />
      <circle cx="32" cy="7" r="3" fill="#F5799F" stroke={STROKE} strokeWidth="2.2" />
      <rect x="15" y="15" width="34" height="28" rx="10" fill="#DDEEFF" stroke={STROKE} strokeWidth="2.6" />
      <circle cx="25" cy="29" r="3.4" fill={STROKE} />
      <circle cx="39" cy="29" r="3.4" fill={STROKE} />
      <path d="M26 37c3 2.5 9 2.5 12 0" stroke={STROKE} strokeWidth="2.2" />
      <circle cx="25.5" cy="28" r="1" fill="#fff" /><circle cx="39.5" cy="28" r="1" fill="#fff" />
      <path d="M12 24v9M52 24v9" stroke={STROKE} strokeWidth="2.4" />
      <rect x="22" y="43" width="20" height="9" rx="4.5" fill="#FFF2BF" stroke={STROKE} strokeWidth="2.4" />
      <path d="M33 20l2 2 3-4" stroke="#F5799F" strokeWidth="2" />
    </Svg>
  );
}

// A girl reading a big book. 📖
export function ChibiReader(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="26" cy="20" r="9" fill="#FFE0C2" stroke={STROKE} strokeWidth="2.4" />
      <path d="M17 18c0-8 18-8 18 0-2-2-5-2-9-2s-7 0-9 2Z" fill="#8B6B4E" stroke={STROKE} strokeWidth="2.2" />
      <circle cx="23" cy="21" r="1.4" fill={STROKE} /><circle cx="29" cy="21" r="1.4" fill={STROKE} />
      <path d="M24 25c1.2 1 3 1 4 0" stroke={STROKE} strokeWidth="1.8" />
      <path d="M14 52c0-9 5-14 12-14s12 5 12 14" fill="#DDF6E8" stroke={STROKE} strokeWidth="2.4" />
      <path d="M10 40l16 6 16-6-16-4-16 4Z" fill="#FFD9E8" stroke={STROKE} strokeWidth="2.4" />
      <path d="M26 42v12M10 40v10l16 4M42 40v10l-16 4" stroke={STROKE} strokeWidth="2" />
    </Svg>
  );
}

// A tiny ghost — for empty / spooky-quiet states. 👻
export function ChibiGhost(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 46V28a16 16 0 0 1 32 0v18l-5-4-5 4-6-4-6 4-4-4Z" fill="#F3EEFF" stroke={STROKE} strokeWidth="2.6" />
      <circle cx="26" cy="28" r="2.6" fill={STROKE} /><circle cx="38" cy="28" r="2.6" fill={STROKE} />
      <circle cx="22" cy="34" r="2.5" fill="#FFC2D6" opacity="0.8" /><circle cx="42" cy="34" r="2.5" fill="#FFC2D6" opacity="0.8" />
      <path d="M29 34c1.5 1.6 4.5 1.6 6 0" stroke={STROKE} strokeWidth="2.2" />
    </Svg>
  );
}

// A tiny bird carrying a note. 🐦
export function ChibiBird(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 26c-6 0-11 5-11 12 0 6 5 10 12 10 8 0 14-5 14-13 0-3-1-6-3-8" fill="#DDEEFF" stroke={STROKE} strokeWidth="2.4" />
      <path d="M20 26c1-6 6-9 11-8 4 1 5 5 3 8" fill="#DDEEFF" stroke={STROKE} strokeWidth="2.4" />
      <circle cx="18" cy="34" r="2" fill={STROKE} />
      <path d="M9 36l-5 1 5 3" fill="#FFF2BF" stroke={STROKE} strokeWidth="2.2" />
      <path d="M30 42h16v10H30" fill="#FFFDF8" stroke={STROKE} strokeWidth="2.2" />
      <path d="M33 46h10M33 49h7" stroke={STROKE} strokeWidth="1.6" />
      <path d="M28 30l6-1" stroke="#F5799F" strokeWidth="2" />
    </Svg>
  );
}

// A steaming coffee cup. ☕
export function ChibiCoffee(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 26h26v14a12 12 0 0 1-12 12h-2A12 12 0 0 1 16 40Z" fill="#FFE2C6" stroke={STROKE} strokeWidth="2.4" />
      <path d="M42 30h5a5 5 0 0 1 0 10h-5" fill="#FFE2C6" stroke={STROKE} strokeWidth="2.4" />
      <path d="M24 12c-2 3 2 5 0 8M32 12c-2 3 2 5 0 8" stroke="#C9A98A" strokeWidth="2.2" />
      <circle cx="24" cy="38" r="1.6" fill={STROKE} /><circle cx="34" cy="38" r="1.6" fill={STROKE} />
      <path d="M26 43c1.5 1.4 4.5 1.4 6 0" stroke={STROKE} strokeWidth="1.8" />
    </Svg>
  );
}

// ── Small decorative doodles ────────────────────────────────────────────────

export function DoodleStar({ size = 16, color = "#FFC94D", className, style }: IconProps & { color?: string }) {
  return (
    <Svg size={size} className={className} style={style} viewBox="0 0 24 24">
      <path d="M12 2l2.6 6.4L21 9.2l-4.8 4.3L17.6 21 12 17.3 6.4 21l1.4-7.5L3 9.2l6.4-.8L12 2Z" fill={color} stroke={STROKE} strokeWidth="1.6" />
    </Svg>
  );
}

export function DoodleSparkle({ size = 16, color = "#F5799F", className, style }: IconProps & { color?: string }) {
  return (
    <Svg size={size} className={className} style={style} viewBox="0 0 24 24">
      <path d="M12 2c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9Z" fill={color} stroke={STROKE} strokeWidth="1.4" />
    </Svg>
  );
}

export function DoodleHeart({ size = 16, color = "#FF9DBE", className, style }: IconProps & { color?: string }) {
  return (
    <Svg size={size} className={className} style={style} viewBox="0 0 24 24">
      <path d="M12 20S3 14 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14 12 20 12 20Z" fill={color} stroke={STROKE} strokeWidth="1.6" />
    </Svg>
  );
}

export function DoodleCloud({ size = 40, color = "#DDEEFF", className, style }: IconProps & { color?: string }) {
  return (
    <Svg size={size} className={className} style={style} viewBox="0 0 64 40">
      <path d="M16 34a10 10 0 0 1-1-20 13 13 0 0 1 25-3 9 9 0 0 1 9 23Z" fill={color} stroke={STROKE} strokeWidth="2.2" />
    </Svg>
  );
}

export function DoodleLeaf({ size = 20, color = "#BFE8C4", className, style }: IconProps & { color?: string }) {
  return (
    <Svg size={size} className={className} style={style} viewBox="0 0 24 24">
      <path d="M4 20C4 9 13 4 21 4c0 11-9 16-17 16Z" fill={color} stroke={STROKE} strokeWidth="1.6" />
      <path d="M6 18C10 14 14 11 19 8" stroke={STROKE} strokeWidth="1.4" />
    </Svg>
  );
}

// A hand-drawn arrow pointing where the eye should go.
export function DoodleArrow({ size = 40, color = "#F5799F", className, style }: IconProps & { color?: string }) {
  return (
    <Svg size={size} className={className} style={style} viewBox="0 0 48 48">
      <path d="M6 30c8-14 22-18 34-16" stroke={color} strokeWidth="2.6" />
      <path d="M40 14l1 8-8 0" stroke={color} strokeWidth="2.6" />
    </Svg>
  );
}

// A cheerful confetti burst — a scatter of tiny pastel shapes raining down.
// Purely decorative; sits absolutely inside a positioned parent. Respects the
// global prefers-reduced-motion guard (animation names live in globals.css).
const CONFETTI_COLORS = ["#F5799F", "#FFC94D", "#4FB477", "#7C9CF5", "#9B7FD4", "#FF9DBE"];
export function Confetti({ count = 16, className, style }: { count?: number } & Pick<IconProps, "className" | "style">) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = (i / count) * 100 + (i % 3) * 4;
    const delay = (i % 6) * 0.12;
    const duration = 1.1 + (i % 4) * 0.25;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const round = i % 2 === 0;
    return (
      <span
        key={i}
        aria-hidden
        style={{
          position: "absolute",
          top: -12,
          left: `${left}%`,
          width: round ? 8 : 6,
          height: round ? 8 : 10,
          background: color,
          borderRadius: round ? "50%" : "2px",
          animation: `confetti-fall ${duration}s cubic-bezier(.4,.1,.5,1) ${delay}s both`,
        }}
      />
    );
  });
  return (
    <span aria-hidden className={className} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", ...style }}>
      {pieces}
    </span>
  );
}

export const CHIBI = {
  cat: ChibiCat,
  robot: ChibiRobot,
  reader: ChibiReader,
  ghost: ChibiGhost,
  bird: ChibiBird,
  coffee: ChibiCoffee,
} as const;

export type ChibiName = keyof typeof CHIBI;
