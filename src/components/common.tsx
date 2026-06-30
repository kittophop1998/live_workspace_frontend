"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { stateColor } from "@/components/theme";
import type { FieldState } from "@/lib/types";

const STATE_LABEL: Record<FieldState, string> = {
  draft: "Draft",
  ready: "Ready",
  breaking: "Breaking Change",
};

// High-contrast bordered status pill: [Draft] [Ready] [Breaking Change].
export function StateBadge({ state, sx }: { state: FieldState; sx?: SxProps<Theme> }) {
  const t = stateColor[state];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 0.9,
        py: 0.15,
        borderRadius: "6px",
        border: "2px solid #0A0A0A",
        bgcolor: t.bg,
        color: t.fg,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {STATE_LABEL[state]}
    </Box>
  );
}

// Monospace tag used for data types and code-like tokens.
export function MonoTag({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 12,
        fontWeight: 700,
        px: 0.75,
        py: 0.1,
        border: "1.5px solid #0A0A0A",
        borderRadius: "5px",
        bgcolor: "#F4F4F5",
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// Live clock that re-renders on an interval — for relative timestamps.
export function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function relativeTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Circular monogram for collaborator presence, ringed when online.
export function Avatar({ name, color, online, size = 28 }: { name: string; color: string; online?: boolean; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: color,
        color: "#fff",
        fontSize: size * 0.4,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #0A0A0A",
        boxShadow: online ? "0 0 0 2px #fff, 0 0 0 4px #16A34A" : "none",
        flexShrink: 0,
      }}
      title={name}
    >
      {initials}
    </Box>
  );
}
