import { Zen_Maru_Gothic, Yomogi, Noto_Sans_Thai } from "next/font/google";

// Live Workspace — "cute Japanese notebook" type system.
// Body/UI = Zen Maru Gothic (soft rounded gothic, Latin + JP). Bound to the
// legacy --font-prompt variable so every existing reference re-skins for free.
export const prompt = Zen_Maru_Gothic({
  variable: "--font-prompt",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

// Handwritten marker font for labels, chapter headers & doodled captions.
export const hand = Yomogi({
  variable: "--font-hand",
  display: "swap",
  subsets: ["latin"],
  weight: ["400"],
});

// Thai fallback — rounded gothic lacks Thai glyphs; kept last in the CSS stack.
export const thai = Noto_Sans_Thai({
  variable: "--font-thai",
  display: "swap",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});
