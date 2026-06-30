"use client";

import { createTheme } from "@mui/material";

// Kingdom Manager Design System — cozy, warm, medieval. Single source of truth
// for brand colors (see Design.md §4).
export const palette = {
  primary: "#D9A441", // gold — CTAs, level, active
  primaryHover: "#B9842B",
  primaryLight: "#FBF1D8",
  food: "#6FAE5E",
  foodLight: "#EAF6E4",
  wood: "#B07A4B",
  stone: "#8B95A5",
  blue: "#5B8DD9",
  blueLight: "#E9F0FB",
  background: "#F5ECD8",
  surface: "#FFFDF6",
  border: "#E7DCC2",
  divider: "#EFE7D2",
  text: "#3B3026",
  muted: "#857A6B",
  placeholder: "#B3A892",
  disabled: "#C4BAA6",
  success: "#6FAE5E",
  successSoft: "#EAF6E4",
  warning: "#E8A23C",
  warningSoft: "#FBEFD6",
  error: "#D9534F",
  errorSoft: "#FBE4E3",
  info: "#5B8DD9",
  infoSoft: "#E9F0FB",
} as const;

export const radii = { app: 16, input: 14, chip: 999 } as const;

export const shadows = {
  card: "0 4px 16px rgba(59,48,38,0.06)",
  floating: "0 8px 22px rgba(217,164,65,0.28)",
  soft: "0 8px 24px rgba(59,48,38,0.08)",
} as const;

export const theme = createTheme({
  palette: {
    primary: { main: palette.primary, dark: palette.primaryHover, light: palette.primaryLight, contrastText: "#3B3026" },
    secondary: { main: palette.food, light: palette.foodLight, contrastText: "#FFFFFF" },
    success: { main: palette.success },
    warning: { main: palette.warning },
    error: { main: palette.error },
    info: { main: palette.info },
    background: { default: palette.background, paper: palette.surface },
    text: { primary: palette.text, secondary: palette.muted, disabled: palette.disabled },
    divider: palette.border,
  },
  typography: {
    fontFamily:
      'var(--font-prompt), "Noto Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    h1: { fontSize: 26, fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.01em" },
    h2: { fontSize: 20, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" },
    h3: { fontSize: 16, fontWeight: 700, lineHeight: 1.35 },
    body1: { fontSize: 15, lineHeight: 1.55 },
    body2: { fontSize: 13.5, lineHeight: 1.5 },
    caption: { fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: palette.muted },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: radii.input },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { border: `1px solid ${palette.border}`, borderRadius: radii.app, boxShadow: shadows.card, backgroundColor: palette.surface },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radii.input,
          minHeight: 42,
          textTransform: "none",
          fontWeight: 700,
          boxShadow: "none",
          "&.MuiButton-containedPrimary": {
            boxShadow: shadows.floating,
            "&:hover": { backgroundColor: palette.primaryHover, boxShadow: shadows.floating },
          },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: radii.chip } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999 } } },
  },
});
