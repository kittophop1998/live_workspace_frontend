"use client";

import { createTheme } from "@mui/material";

// Live Workspace design system — modern collaborative developer tool.
// Calm neutral surfaces, soft 1px borders + soft shadows (no hard outlines),
// blue as the single primary accent, generous rounded corners on an 8px grid.

// Core palette (spec-aligned)
export const ink = "#111827"; // primary text / dark fills
export const secondaryText = "#6B7280"; // secondary text
export const paper = "#FFFFFF"; // cards + sidebar
export const wash = "#F8FAFC"; // app background
export const line = "#E8EDF3"; // soft structural border
export const blue = "#3B82F6"; // primary accent
export const blueSoft = "#EFF4FF"; // tinted accent surface

// Soft, blurred shadows — surfaces read as gently "lifted", never graphic.
// Names are kept for backwards-compat with existing imports.
export const softShadowSm = "0 1px 2px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.08)";
export const softShadow = "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.07)";
export const softShadowLg = "0 4px 12px rgba(15,23,42,0.06), 0 16px 40px rgba(15,23,42,0.10)";
export const flatShadow = softShadow;
export const flatShadowSm = softShadowSm;

// State accents — soft tinted pills (bg) with a legible foreground (fg).
export const stateColor = {
  draft: { bg: "#FEF3C7", fg: "#92400E" }, // amber
  ready: { bg: "#DCFCE7", fg: "#166534" }, // green
  breaking: { bg: "#FEE2E2", fg: "#991B1B" }, // red
} as const;

export const changeColor = {
  added: "#22C55E",
  removed: "#EF4444",
  modified: "#F59E0B",
  stable: "#6B7280",
} as const;

export const methodColor: Record<string, string> = {
  GET: "#3B82F6",
  POST: "#22C55E",
  PUT: "#F59E0B",
  PATCH: "#8B5CF6",
  DELETE: "#EF4444",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: blue, contrastText: "#FFFFFF" },
    secondary: { main: ink },
    success: { main: "#22C55E" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    background: { default: wash, paper },
    text: { primary: ink, secondary: secondaryText },
    divider: line,
  },
  typography: {
    fontFamily:
      'var(--font-prompt), "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    h1: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.25 },
    h2: { fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
    h3: { fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" },
    body1: { fontSize: 14, lineHeight: 1.6 },
    body2: { fontSize: 13, lineHeight: 1.55 },
    caption: { fontSize: 11.5, fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${line}`, borderRadius: 14, boxShadow: softShadow, backgroundColor: paper },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          paddingInline: 14,
          minHeight: 36,
          transition: "background-color .15s ease, box-shadow .15s ease, border-color .15s ease, transform .15s ease",
          "&.MuiButton-containedPrimary": {
            backgroundColor: blue,
            color: "#fff",
            boxShadow: "0 1px 2px rgba(59,130,246,0.30)",
            "&:hover": { backgroundColor: "#2f74e8", boxShadow: "0 2px 8px rgba(59,130,246,0.35)" },
          },
          "&.MuiButton-outlined": {
            backgroundColor: paper,
            borderColor: line,
            color: ink,
            "&:hover": { backgroundColor: wash, borderColor: "#D5DDE8" },
          },
          "&.MuiButton-text": {
            color: secondaryText,
            "&:hover": { backgroundColor: wash, color: ink },
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: secondaryText,
          transition: "background-color .15s ease, color .15s ease",
          "&:hover": { backgroundColor: wash, color: ink },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: secondaryText,
          transition: "color .15s ease",
          "&:hover": { color: ink },
          "&.Mui-selected": { color: ink },
          "& .MuiTab-iconWrapper": { marginRight: 6 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, border: "none", borderRadius: 8 },
        outlined: { backgroundColor: wash, borderColor: line },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: ink, fontSize: 11.5, fontWeight: 500, borderRadius: 8, padding: "6px 10px" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${line}`, borderRadius: 12, boxShadow: softShadowLg, marginTop: 4 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: paper,
          borderRadius: 10,
          "& fieldset": { borderColor: line, borderWidth: 1 },
          "&:hover fieldset": { borderColor: "#D5DDE8" },
          "&.Mui-focused fieldset": { borderColor: blue, borderWidth: 1, boxShadow: `0 0 0 3px ${blueSoft}` },
        },
      },
    },
  },
});
