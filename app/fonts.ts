import localFont from "next/font/local";

// Live Workspace — professional Notion-style notebook type system.
// Body/UI = Inter (self-hosted woff2, CSP-safe). Bound to the legacy
// --font-prompt variable so every existing reference re-skins for free.
export const prompt = localFont({
  variable: "--font-prompt",
  display: "swap",
  src: [
    { path: "./fonts/inter/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

// Accent font for labels & captions — now Inter too (dropped the handwriting
// flavor to keep the workspace professional). Kept as a separate export/var so
// existing `.font-hand` / --font-hand call sites keep working.
export const hand = localFont({
  variable: "--font-hand",
  display: "swap",
  src: "./fonts/inter/inter-latin-600-normal.woff2",
});

// Thai fallback — Inter lacks Thai glyphs; kept last in the CSS stack.
export const thai = localFont({
  variable: "--font-thai",
  display: "swap",
  src: "./fonts/Prompt-Regular.ttf",
});
