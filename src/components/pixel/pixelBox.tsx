"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { line, paper, radius, softShadow } from "@/components/theme";

// ─────────────────────────────────────────────────────────────────────────────
// The signature "notebook page" surface. A soft white card with a 12px radius
// and a subtle 8-bit stepped corner — the pixel accent stays quiet so the panel
// still reads as a calm, professional card (not a game window).
//
// The stepped corner is a tiny pseudo-element notch, not a jagged clip, so text
// and forms inside keep normal, non-pixelated edges.
// ─────────────────────────────────────────────────────────────────────────────

const STEP = 4; // px — size of the little pixel notch at the corners

export function pixelBorder(color = line): SxProps<Theme> {
  return {
    position: "relative",
    border: `1.5px solid ${color}`,
    borderRadius: `${radius}px`,
    // Two tiny squares tucked into opposite corners read as "hand-placed pixels".
    "&::before, &::after": {
      content: '""',
      position: "absolute",
      width: STEP,
      height: STEP,
      bgcolor: color,
      opacity: 0.5,
      pointerEvents: "none",
    },
    "&::before": { top: -1.5, left: radius - STEP },
    "&::after": { bottom: -1.5, right: radius - STEP },
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
      {...rest}
      sx={[
        {
          bgcolor: paper,
          boxShadow: softShadow,
          p: { xs: 2, sm: 3 },
          transition: "transform .15s ease, box-shadow .15s ease",
        },
        pixelBorder(),
        hover
          ? { "&:hover": { transform: "translateY(-2px)", boxShadow: "0 6px 14px rgba(46,46,46,0.08), 0 18px 40px rgba(46,46,46,0.12)" } }
          : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
