"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { methodColor } from "@/components/theme";

// ─────────────────────────────────────────────────────────────────────────────
// PixelBadge — a compact monospace pill with a chunky, slightly-square pixel
// edge. Used for HTTP method chips and small status tags. Reuses methodColor.
// ─────────────────────────────────────────────────────────────────────────────

export function PixelBadge({
  children,
  fg,
  bg,
  sx,
}: {
  children: ReactNode;
  /** Foreground / border colour. */
  fg: string;
  /** Optional background; defaults to a 14%-tint of fg. */
  bg?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        px: 0.9,
        py: 0.25,
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 11.5,
        fontWeight: 800,
        letterSpacing: "0.03em",
        lineHeight: 1.5,
        color: fg,
        bgcolor: bg ?? `${fg}1F`,
        border: `1.5px solid ${fg}59`,
        borderRadius: "5px", // squarer than pills → reads a touch "pixel"
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// Convenience: an HTTP method chip coloured from the theme's methodColor map.
export function MethodBadge({ method, sx }: { method: string; sx?: SxProps<Theme> }) {
  const color = methodColor[method] ?? "#6D6D6D";
  return (
    <PixelBadge fg={color} sx={sx}>
      {method}
    </PixelBadge>
  );
}
