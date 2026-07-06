"use client";

import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { PixelMascot, type MascotPose } from "@/components/PixelMascot";
import { ink, secondaryText } from "@/components/theme";

// ─────────────────────────────────────────────────────────────────────────────
// PixelEmptyState — never a boring empty white box. Pairs the pixel mascot with
// a friendly line and a primary action, in the calm workspace style.
// ─────────────────────────────────────────────────────────────────────────────

export function PixelEmptyState({
  pose = "idle",
  title,
  subtitle,
  action,
  mascotSize = 92,
  sx,
}: {
  pose?: MascotPose;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  mascotSize?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 1.25,
        px: 3,
        py: 5,
        maxWidth: "100%",
        ...sx,
      }}
    >
      {/* The mascot reserves its own height (character grid is `size` tall), so the
          title always sits cleanly below it — no fixed-size media box clipping. */}
      <PixelMascot pose={pose} size={mascotSize} />
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75, maxWidth: 360 }}>
        <Typography sx={{ mt: 0.5, fontSize: 15, fontWeight: 700, color: ink, lineHeight: 1.35 }}>{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 13, color: secondaryText, lineHeight: 1.6 }}>{subtitle}</Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
