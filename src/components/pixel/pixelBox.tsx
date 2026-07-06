"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { Card as PixelactCard } from "@/components/ui/pixelact-ui/card";
import { line, paper } from "@/components/theme";

// ─────────────────────────────────────────────────────────────────────────────
// The signature "notebook page" surface. A soft white card with a 12px radius
// and a subtle 8-bit stepped corner — the pixel accent stays quiet so the panel
// still reads as a calm, professional card (not a game window).
//
// The stepped corner is a tiny pseudo-element notch, not a jagged clip, so text
// and forms inside keep normal, non-pixelated edges.
// ─────────────────────────────────────────────────────────────────────────────

export function pixelBorder(color = line): SxProps<Theme> {
  return {
    position: "relative",
    border: `1px solid ${color}`,
    borderRadius: 0,
    boxShadow: `3px 3px 0 ${color}`,
  };
}

export function PixelPanel({
  children,
  hover = false,
  sx,
  ...rest
}: {
  children: ReactNode;
  /** Adds a gentle 150ms hover lift. */
  hover?: boolean;
  sx?: SxProps<Theme>;
} & Omit<React.ComponentProps<typeof Box>, "sx">) {
  return (
    <Box
      component={PixelactCard}
      font="normal"
      {...rest}
      sx={[
        {
          bgcolor: paper,
          p: { xs: 2, sm: 3 },
          transition: "transform .12s ease, box-shadow .12s ease",
        },
        pixelBorder(),
        hover
          ? { "&:hover": { transform: "translate(-1px,-1px)", boxShadow: `4px 4px 0 ${line}` } }
          : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
