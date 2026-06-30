"use client";

import { Box, LinearProgress, Typography } from "@mui/material";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Count-up number with tabular figures so changing digits don't jiggle.
export function AnimatedNumber({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 420;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

// Labeled progress / fill bar.
export function ProgressBar({
  value,
  color = "#D9A441",
  height = 8,
  trackColor = "#EFE7D2",
  label,
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
  trackColor?: string;
  label?: ReactNode;
}) {
  return (
    <Box sx={{ width: "100%" }}>
      {label ? (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          {typeof label === "string" ? <Typography variant="caption">{label}</Typography> : label}
        </Box>
      ) : null}
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, value * 100))}
        sx={{ height, borderRadius: 999, bgcolor: trackColor, "& .MuiLinearProgress-bar": { backgroundColor: color, borderRadius: 999, transition: "transform .4s ease" } }}
      />
    </Box>
  );
}

const SEVERITY_TONE: Record<string, { bg: string; fg: string }> = {
  info: { bg: "#E9F0FB", fg: "#3A6BB5" },
  success: { bg: "#EAF6E4", fg: "#4F8A3E" },
  warning: { bg: "#FBEFD6", fg: "#B07A1E" },
  danger: { bg: "#FBE4E3", fg: "#C0413D" },
  neutral: { bg: "#F1ECDD", fg: "#857A6B" },
};

export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof SEVERITY_TONE; children: ReactNode }) {
  const t = SEVERITY_TONE[tone] ?? SEVERITY_TONE.neutral;
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: 999, bgcolor: t.bg, color: t.fg, fontSize: 11, fontWeight: 700, lineHeight: 1.4 }}
    >
      {children}
    </Box>
  );
}

export function SectionTitle({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
      <Typography variant="h3" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {icon ? <span>{icon}</span> : null}
        {title}
      </Typography>
      {action}
    </Box>
  );
}

// Live clock that re-renders every second — for countdowns/relative times.
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function relativeTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function formatSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}
