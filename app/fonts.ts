import { Noto_Sans_Thai } from "next/font/google";

export const prompt = Noto_Sans_Thai({
  variable: "--font-prompt",
  display: "swap",
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
