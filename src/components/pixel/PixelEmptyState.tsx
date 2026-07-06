"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { PixelMascot, type MascotPose } from "@/components/PixelMascot";
import { ink, secondaryText } from "@/components/theme";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/pixelact-ui/empty";

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
      component={Empty}
      font="normal"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 1.25,
        px: 3,
        py: 5,
        ...sx,
      }}
    >
      <EmptyMedia variant="icon" className="bg-blue-50 text-blue-600">
        <PixelMascot pose={pose} size={mascotSize} />
      </EmptyMedia>
      <EmptyHeader>
        <Box component={EmptyTitle} sx={{ mt: 0.5, fontSize: 15, fontWeight: 700, color: ink }}>{title}</Box>
        {subtitle ? (
          <Box component={EmptyDescription} sx={{ fontSize: 13, color: secondaryText, maxWidth: 320, lineHeight: 1.6 }}>{subtitle}</Box>
        ) : null}
      </EmptyHeader>
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
