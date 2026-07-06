"use client";

import { createTheme } from "@mui/material";

// ─────────────────────────────────────────────────────────────────────────────
// Live Workspace design system — "professional collaborative API notebook".
// Clean off-white paper, calm blue ink, soft cool borders, gentle pastel accents.
// Token NAMES are preserved so every component that imports them re-skins for
// free; only the VALUES changed. `blue` is a legacy name that holds the PRIMARY
// accent — now a professional blue (#4F8EF7).
// ─────────────────────────────────────────────────────────────────────────────

// Core palette
export const ink = "#202124"; // primary text / dark fills
export const secondaryText = "#6B7280"; // muted captions / meta
export const paper = "#FFFFFF"; // notebook page (cards, sidebars)
export const wash = "#FAFAF8"; // desk / app background (soft off-white)
export const line = "#E8EAED"; // soft border
export const lineSoft = "#F1F3F4"; // faint ruling / divider
export const blue = "#4F8EF7"; // PRIMARY accent (blue) — legacy name
export const blueSoft = "#EAF2FE"; // tinted accent surface (blue wash)

// Standard soft corner radius for cards & panels.
export const radius = 12;

// The full crayon box — muted pastel surfaces used for tabs, pills, badges.
export const pastel = {
  cream: "#F3F4F6", // neutral chip
  pink: "#FEECEC", // danger-soft
  blue: "#EAF2FE", // primary-soft
  mint: "#E6F7EE", // success-soft
  yellow: "#FEF3E2", // warning-soft
  purple: "#EEEBFE", // accent
  orange: "#FEEEDF",
} as const;

// Matching legible ink for text placed on each pastel surface.
export const pastelInk = {
  cream: "#6B7280",
  pink: "#D14343", // danger
  blue: "#2C6FD6", // primary
  mint: "#1B9E58", // success
  yellow: "#B77410", // warning
  purple: "#6D51D6", // accent
  orange: "#C56A1E",
} as const;

// Masking-tape tints for decorative corners — muted, cool.
export const tape = ["rgba(79,142,247,0.22)", "rgba(34,197,94,0.22)", "rgba(245,158,11,0.24)", "rgba(239,68,68,0.20)"] as const;

// Soft, cool, diffuse shadows — pages read as gently lifted off the desk.
// Names kept for backwards-compat with existing imports.
export const softShadowSm = "0 1px 2px rgba(16,24,40,0.04), 0 2px 5px rgba(16,24,40,0.05)";
export const softShadow = "0 1px 3px rgba(16,24,40,0.05), 0 8px 24px rgba(16,24,40,0.07)";
export const softShadowLg = "0 6px 14px rgba(16,24,40,0.07), 0 22px 48px rgba(16,24,40,0.10)";
export const flatShadow = softShadow;
export const flatShadowSm = softShadowSm;

// State accents — soft pastel pills with a legible foreground.
export const stateColor = {
  draft: { bg: pastel.yellow, fg: pastelInk.yellow }, // pencil sketch
  ready: { bg: pastel.mint, fg: pastelInk.mint }, // inked & done
  breaking: { bg: pastel.pink, fg: pastelInk.pink }, // uh-oh
} as const;

export const changeColor = {
  added: "#22C55E",
  removed: "#EF4444",
  modified: "#F59E0B",
  stable: "#6B7280",
} as const;

// Method crayons — professional but legible on white.
export const methodColor: Record<string, string> = {
  GET: "#22A15A", // green
  POST: "#4F8EF7", // blue
  PUT: "#E08A16", // amber
  PATCH: "#8B5CF6", // purple
  DELETE: "#EF4444", // red
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
      'var(--font-prompt), Inter, var(--font-thai), "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3 },
    h2: { fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.4 },
    h3: { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" },
    body1: { fontSize: 14, lineHeight: 1.7 },
    body2: { fontSize: 13, lineHeight: 1.65 },
    caption: { fontSize: 11.5, fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 600 },
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
          fontWeight: 600,
          paddingInline: 16,
          minHeight: 38,
          transition: "background-color .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease",
          "&:active": { transform: "translateY(0.5px)" },
          "&.MuiButton-containedPrimary": {
            backgroundColor: blue,
            color: "#FFFFFF",
            border: "1px solid #3D7FEE",
            boxShadow: "0 1px 2px rgba(79,142,247,0.20)",
            "&:hover": { backgroundColor: "#3D7FEE", boxShadow: "0 2px 8px rgba(79,142,247,0.26)" },
          },
          "&.MuiButton-outlined": {
            backgroundColor: paper,
            borderWidth: 1,
            borderColor: line,
            color: ink,
            boxShadow: "none",
            "&:hover": { backgroundColor: pastel.cream, borderColor: "#D6D9DE" },
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
          borderRadius: 10,
          color: secondaryText,
          transition: "background-color .15s ease, color .15s ease",
          "&:hover": { backgroundColor: pastel.cream, color: ink },
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
        root: { fontWeight: 600, border: "none", borderRadius: 999 },
        outlined: { backgroundColor: pastel.cream, borderColor: line, borderWidth: 1 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: ink, fontSize: 11.5, fontWeight: 600, borderRadius: 8, padding: "6px 10px" },
        arrow: { color: ink },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${line}`, borderRadius: 12, boxShadow: softShadowLg, marginTop: 6 },
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: 8, margin: "1px 0" } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: paper,
          borderRadius: 10,
          "& fieldset": { borderColor: line, borderWidth: 1 },
          "&:hover fieldset": { borderColor: "#D6D9DE" },
          "&.Mui-focused fieldset": { borderColor: blue, borderWidth: 1.5, boxShadow: `0 0 0 3px ${blueSoft}` },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderColor: line,
          borderRadius: 999,
          color: secondaryText,
          "&.Mui-selected": { backgroundColor: blueSoft, color: pastelInk.blue, "&:hover": { backgroundColor: blueSoft } },
        },
      },
    },
  },
});
