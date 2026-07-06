"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { Card as PixelactCard } from "@/components/ui/pixelact-ui/card";
import { line, paper, radius, softShadow, softShadowLg } from "@/components/theme";

// ─────────────────────────────────────────────────────────────────────────────
// The signature "notebook page" surface — a soft white card with rounded corners
// and a gentle diffuse shadow, so the panel reads as a calm, professional card.
// ─────────────────────────────────────────────────────────────────────────────

export function pixelBorder(color = line): SxProps<Theme> {
  return {
    position: "relative",
    border: `1px solid ${color}`,
    borderRadius: `${radius}px`,
    boxShadow: softShadow,
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
          ? { "&:hover": { transform: "translateY(-1px)", boxShadow: softShadowLg } }
          : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
