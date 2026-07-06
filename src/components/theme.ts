"use client";

import { createTheme } from "@mui/material";

// ─────────────────────────────────────────────────────────────────────────────
// Live Workspace design system — "cute Japanese notebook".
// Warm cream paper, soft hand-drawn borders, pastel stickers & bookmark tabs.
// Token NAMES are preserved from the old soft-SaaS theme so every component that
// imports them re-skins for free; only the VALUES changed. `blue` is a legacy
// name that now holds the pink "marker" primary accent.
// ─────────────────────────────────────────────────────────────────────────────

// Core palette
export const ink = "#4A3F35"; // warm pencil-ink text / dark fills
export const secondaryText = "#9A8A76"; // faded pencil (captions / meta)
export const paper = "#FFFDF8"; // notebook page (cards, sidebars)
export const wash = "#FFF8EC"; // desk / app background (warm cream)
export const line = "#EADBC2"; // soft hand-drawn border
export const lineSoft = "#F1E7D6"; // faint ruling / divider
export const blue = "#F5799F"; // PRIMARY accent (marker pink) — legacy name
export const blueSoft = "#FFE6EE"; // tinted accent surface (pink wash)

// The full crayon box — pastel surfaces used for tabs, pills, stickers, tape.
export const pastel = {
  cream: "#FFF4E8",
  pink: "#FFD9E8",
  blue: "#DDEEFF",
  mint: "#DDF6E8",
  yellow: "#FFF2BF",
  purple: "#E9E3FF",
  orange: "#FFE2C6",
} as const;

// Matching legible ink for text placed on each pastel surface.
export const pastelInk = {
  cream: "#8A6A3E",
  pink: "#C24E7C",
  blue: "#3E6EA8",
  mint: "#2E8B62",
  yellow: "#977400",
  purple: "#6C55C0",
  orange: "#B26A2E",
} as const;

// Masking-tape tints for decorative corners.
export const tape = ["rgba(255,214,102,0.55)", "rgba(255,177,193,0.5)", "rgba(168,213,255,0.5)", "rgba(183,230,178,0.5)"] as const;

// Soft, warm, diffuse shadows — pages read as gently lifted off the desk.
// Names kept for backwards-compat with existing imports.
export const softShadowSm = "0 1px 2px rgba(120,88,44,0.07), 0 2px 5px rgba(120,88,44,0.08)";
export const softShadow = "0 2px 4px rgba(120,88,44,0.06), 0 10px 26px rgba(120,88,44,0.10)";
export const softShadowLg = "0 6px 14px rgba(120,88,44,0.08), 0 22px 48px rgba(120,88,44,0.14)";
export const flatShadow = softShadow;
export const flatShadowSm = softShadowSm;

// State accents — soft pastel pills with a legible foreground.
export const stateColor = {
  draft: { bg: pastel.yellow, fg: pastelInk.yellow }, // pencil sketch
  ready: { bg: pastel.mint, fg: pastelInk.mint }, // inked & done
  breaking: { bg: "#FFDDDD", fg: "#C0453F" }, // uh-oh coral
} as const;

export const changeColor = {
  added: "#4FB477",
  removed: "#E86A6A",
  modified: "#E0A13C",
  stable: "#9A8A76",
} as const;

// Method crayons — pastel but legible on cream.
export const methodColor: Record<string, string> = {
  GET: "#4C86C6", // sky
  POST: "#4FB477", // leaf
  PUT: "#E0A13C", // honey
  PATCH: "#9B7FD4", // grape
  DELETE: "#E86A8B", // strawberry
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: blue, contrastText: "#5A2740" },
    secondary: { main: ink },
    success: { main: "#4FB477" },
    warning: { main: "#E0A13C" },
    error: { main: "#E86A6A" },
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
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1.5px solid ${line}`, borderRadius: 20, boxShadow: softShadow, backgroundColor: paper },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          // Buttons are stickers: rounded, soft, and they bounce a little.
          borderRadius: 999,
          fontWeight: 700,
          paddingInline: 18,
          minHeight: 38,
          transition: "transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s ease, background-color .16s ease, border-color .16s ease",
          "&:active": { transform: "translateY(1px) scale(0.98)" },
          "&.MuiButton-containedPrimary": {
            backgroundColor: blue,
            color: "#FFFFFF",
            border: "1.5px solid #E85E8B",
            boxShadow: "0 3px 0 #E06491, 0 6px 14px rgba(245,121,159,0.34)",
            "&:hover": { backgroundColor: "#F5658F", transform: "translateY(-1px) rotate(-0.6deg)", boxShadow: "0 4px 0 #E06491, 0 10px 20px rgba(245,121,159,0.4)" },
          },
          "&.MuiButton-outlined": {
            backgroundColor: paper,
            borderWidth: 1.5,
            borderColor: line,
            color: ink,
            boxShadow: softShadowSm,
            "&:hover": { backgroundColor: pastel.cream, borderColor: "#E0CBA8", transform: "translateY(-1px) rotate(0.5deg)" },
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
          "&:hover": { backgroundColor: pastel.cream, color: ink, transform: "rotate(-4deg)" },
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
          "&:hover fieldset": { borderColor: "#E0CBA8" },
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
          "&.Mui-selected": { backgroundColor: blueSoft, color: "#C24E7C", "&:hover": { backgroundColor: blueSoft } },
        },
      },
    },
  },
});
