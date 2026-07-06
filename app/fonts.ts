import localFont from "next/font/local";

// Live Workspace — "cute Japanese notebook" type system.
// Body/UI = Zen Maru Gothic (soft rounded gothic, Latin + JP). Bound to the
// legacy --font-prompt variable so every existing reference re-skins for free.
export const prompt = localFont({
  variable: "--font-prompt",
  display: "swap",
  src: [
    { path: "./fonts/Prompt-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Prompt-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Prompt-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Prompt-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Prompt-Bold.ttf", weight: "700", style: "normal" },
  ],
});

// Handwritten marker font for labels, chapter headers & doodled captions.
export const hand = localFont({
  variable: "--font-hand",
  display: "swap",
  src: "./fonts/Prompt-Medium.ttf",
});

// Thai fallback — rounded gothic lacks Thai glyphs; kept last in the CSS stack.
export const thai = localFont({
  variable: "--font-thai",
  display: "swap",
  src: "./fonts/Prompt-Regular.ttf",
});
