"use client";

import { createTheme } from "@mui/material";

// ─────────────────────────────────────────────────────────────────────────────
// Live Workspace design system — "cozy collaborative API notebook".
// Off-white paper, calm lavender ink, soft borders, gentle pastel accents.
// Token NAMES are preserved so every component that imports them re-skins for
// free; only the VALUES changed. `blue` is a legacy name that now holds the
// PRIMARY lavender accent (#8B7CF6).
// ─────────────────────────────────────────────────────────────────────────────

// Core palette
export const ink = "#2E2E2E"; // primary text / dark fills
export const secondaryText = "#6D6D6D"; // muted captions / meta
export const paper = "#FFFFFF"; // notebook page (cards, sidebars)
export const wash = "#F8F7F4"; // desk / app background (warm off-white)
export const line = "#E9E2D0"; // soft border
export const lineSoft = "#F0EAD9"; // faint ruling / divider
export const blue = "#8B7CF6"; // PRIMARY accent (lavender) — legacy name
export const blueSoft = "#EEEAFE"; // tinted accent surface (lavender wash)

// Standard soft corner radius for cards & panels.
export const radius = 12;

// The full crayon box — muted pastel surfaces used for tabs, pills, stickers.
export const pastel = {
  cream: "#F4F2EC",
  pink: "#FBE7E7", // danger-soft
  blue: "#E7ECFB", // periwinkle
  mint: "#E7F4E4", // success-soft
  yellow: "#FBEFD6", // warning-soft
  purple: "#EEEAFE", // primary-light
  orange: "#FBEAD9",
} as const;

// Matching legible ink for text placed on each pastel surface.
export const pastelInk = {
  cream: "#6D6D6D",
  pink: "#B4524F", // danger
  blue: "#4A5DA8", // periwinkle
  mint: "#4E8A46", // success
  yellow: "#9A7418", // warning
  purple: "#6D5DD3", // primary
  orange: "#B0703A",
} as const;

// Masking-tape tints for decorative corners — muted, cool.
export const tape = ["rgba(139,124,246,0.26)", "rgba(140,203,132,0.28)", "rgba(244,197,106,0.30)", "rgba(231,141,141,0.26)"] as const;

// Soft, cool, diffuse shadows — pages read as gently lifted off the desk.
// Names kept for backwards-compat with existing imports.
export const softShadowSm = "0 1px 2px rgba(46,46,46,0.05), 0 2px 5px rgba(46,46,46,0.06)";
export const softShadow = "0 2px 4px rgba(46,46,46,0.05), 0 10px 26px rgba(46,46,46,0.08)";
export const softShadowLg = "0 6px 14px rgba(46,46,46,0.07), 0 22px 48px rgba(46,46,46,0.11)";
export const flatShadow = softShadow;
export const flatShadowSm = softShadowSm;

// State accents — soft pastel pills with a legible foreground.
export const stateColor = {
  draft: { bg: pastel.yellow, fg: pastelInk.yellow }, // pencil sketch
  ready: { bg: pastel.mint, fg: pastelInk.mint }, // inked & done
  breaking: { bg: pastel.pink, fg: pastelInk.pink }, // uh-oh
} as const;

export const changeColor = {
  added: "#5FA958",
  removed: "#D07A7A",
  modified: "#C79A3D",
  stable: "#6D6D6D",
} as const;

// Method crayons — muted but legible on white.
export const methodColor: Record<string, string> = {
  GET: "#5AA469", // leaf
  POST: "#7C6FE0", // lavender
  PUT: "#C79A3D", // honey
  PATCH: "#A97FCB", // grape
  DELETE: "#D07A7A", // coral
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: blue, contrastText: "#FFFFFF" },
    secondary: { main: ink },
    success: { main: "#5FA958" },
    warning: { main: "#C79A3D" },
    error: { main: "#D07A7A" },
    background: { default: wash, paper },
    text: { primary: ink, secondary: secondaryText },
    divider: line,
  },
  typography: {
    fontFamily:
      'var(--font-prompt), var(--font-thai), "Zen Maru Gothic", ui-rounded, "Hiragino Maru Gothic ProN", "Segoe UI", system-ui, sans-serif',
    h1: { fontSize: 23, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 },
    h2: { fontSize: 16.5, fontWeight: 700, letterSpacing: "0em", lineHeight: 1.35 },
    h3: { fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" },
    body1: { fontSize: 14, lineHeight: 1.65 },
    body2: { fontSize: 13, lineHeight: 1.6 },
    caption: { fontSize: 11.5, fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: radius },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${line}`, borderRadius: radius, boxShadow: softShadow, backgroundColor: paper },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 700,
          paddingInline: 18,
          minHeight: 38,
          transition: "transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s ease, background-color .16s ease, border-color .16s ease",
          "&:active": { transform: "translateY(1px) scale(0.98)" },
          "&.MuiButton-containedPrimary": {
            backgroundColor: blue,
            color: "#FFFFFF",
            border: "1px solid #7A6AE0",
            boxShadow: "0 3px 10px rgba(139,124,246,0.22)",
            "&:hover": { backgroundColor: "#7E6EF0", transform: "translateY(-1px)", boxShadow: "0 5px 14px rgba(139,124,246,0.28)" },
          },
          "&.MuiButton-outlined": {
            backgroundColor: paper,
            borderWidth: 1.5,
            borderColor: line,
            color: ink,
            boxShadow: softShadowSm,
            "&:hover": { backgroundColor: pastel.cream, borderColor: "#DCD4C2", transform: "translateY(-1px)" },
          },
          "&.MuiButton-text": {
            color: secondaryText,
            "&:hover": { backgroundColor: pastel.cream, color: ink },
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          color: secondaryText,
          transition: "background-color .15s ease, color .15s ease, transform .15s ease",
          "&:hover": { backgroundColor: pastel.cream, color: ink, transform: "translateY(-1px)" },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
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
        root: { fontWeight: 700, border: "none", borderRadius: 999 },
        outlined: { backgroundColor: pastel.cream, borderColor: line, borderWidth: 1.5 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: ink, fontSize: 11.5, fontWeight: 600, borderRadius: 10, padding: "6px 11px" },
        arrow: { color: ink },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1.5px solid ${line}`, borderRadius: 16, boxShadow: softShadowLg, marginTop: 6 },
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: 10, margin: "1px 0" } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: paper,
          borderRadius: 12,
          "& fieldset": { borderColor: line, borderWidth: 1.5 },
          "&:hover fieldset": { borderColor: "#DCD4C2" },
          "&.Mui-focused fieldset": { borderColor: blue, borderWidth: 1.5, boxShadow: `0 0 0 3px ${blueSoft}` },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderColor: line,
          borderRadius: 999,
          color: secondaryText,
          "&.Mui-selected": { backgroundColor: blueSoft, color: pastelInk.purple, "&:hover": { backgroundColor: blueSoft } },
        },
      },
    },
  },
});
