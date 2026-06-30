"use client";

import { createTheme } from "@mui/material";

// Live Workspace design system — modern minimalist, high-contrast structure.
// Crisp dark borders + flat offset shadows define boundaries instead of color.
export const ink = "#0A0A0A";
export const paper = "#FFFFFF";
export const wash = "#F4F4F5"; // soft gray surface
export const line = "#0A0A0A"; // structural border color

// Flat, hard-edged shadows (no blur) for sharp boundaries — softened with a
// faint ambient layer so surfaces read as "lifted" rather than purely graphic.
export const flatShadow = "4px 4px 0 #0A0A0A, 6px 8px 18px rgba(10,10,10,0.10)";
export const flatShadowSm = "2px 2px 0 #0A0A0A";
export const softShadow = "0 1px 2px rgba(10,10,10,0.06), 0 4px 14px rgba(10,10,10,0.06)";

// State accents — used as fills inside high-contrast bordered badges.
export const stateColor = {
  draft: { bg: "#FEF3C7", fg: "#92400E" }, // amber
  ready: { bg: "#DCFCE7", fg: "#166534" }, // green
  breaking: { bg: "#FEE2E2", fg: "#991B1B" }, // red
} as const;

export const changeColor = {
  added: "#16A34A",
  removed: "#DC2626",
  modified: "#D97706",
  stable: "#0A0A0A",
} as const;

export const methodColor: Record<string, string> = {
  GET: "#2563EB",
  POST: "#16A34A",
  PUT: "#D97706",
  PATCH: "#7C3AED",
  DELETE: "#DC2626",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: ink, contrastText: "#FFFFFF" },
    secondary: { main: "#2563EB" },
    success: { main: "#16A34A" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" },
    background: { default: wash, paper },
    text: { primary: ink, secondary: "#52525B" },
    divider: ink,
  },
  typography: {
    fontFamily:
      'var(--font-prompt), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    h1: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" },
    h3: { fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" },
    body1: { fontSize: 14, lineHeight: 1.55 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    caption: { fontSize: 11, fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `2px solid ${line}`, borderRadius: 10, boxShadow: flatShadow, backgroundColor: paper },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          border: `2px solid ${line}`,
          boxShadow: flatShadowSm,
          transition: "transform .08s ease, box-shadow .08s ease",
          "&:hover": { boxShadow: flatShadow, transform: "translate(-1px,-1px)" },
          "&:active": { boxShadow: "0 0 0 #0A0A0A", transform: "translate(2px,2px)" },
          "&.MuiButton-containedPrimary": { backgroundColor: ink, color: "#fff", "&:hover": { backgroundColor: "#000" } },
          "&.MuiButton-outlined": { backgroundColor: paper },
        },
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "background-color .12s ease, color .12s ease, transform .08s ease",
          "&:hover": { backgroundColor: "#F4F4F5", transform: "translateY(-1px)" },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          transition: "background-color .12s ease, color .12s ease",
          "&:hover": { backgroundColor: "#FAFAFA" },
          "& .MuiTab-iconWrapper": { marginRight: 6 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, border: `2px solid ${line}`, borderRadius: 6 },
        outlined: { backgroundColor: paper },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: ink, fontSize: 11, fontWeight: 600, border: `1px solid ${line}` },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: paper,
          "& fieldset": { borderColor: line, borderWidth: 2 },
          "&:hover fieldset": { borderColor: line },
          "&.Mui-focused fieldset": { borderColor: line, borderWidth: 2 },
        },
      },
    },
  },
});
