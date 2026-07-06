"use client";

import { Button, type ButtonProps } from "@mui/material";

// ─────────────────────────────────────────────────────────────────────────────
// PixelButton — the app's MUI Button already carries a chunky "hard shadow" that
// presses on click (see theme.ts MuiButton). This thin wrapper just fixes the
// pixel-accent defaults (contained + primary lavender) so call sites read clearly.
// Text stays a normal sans font — never a pixel font.
// ─────────────────────────────────────────────────────────────────────────────

export function PixelButton(props: ButtonProps) {
  return <Button variant="contained" color="primary" {...props} />;
}
