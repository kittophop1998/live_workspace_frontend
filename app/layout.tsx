import type { Metadata, Viewport } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { prompt, hand, thai } from "./fonts";
import "./globals.css";
import { Inter, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

const interHeading = Inter({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Live Workspace — Schema Collaboration Hub",
  description:
    "Real-time, client-side workspace for backend & frontend devs to design, discuss, and export API schemas.",
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", prompt.variable, hand.variable, thai.variable, "font-mono", inter.variable, interHeading.variable, geistMono.variable)}>
      <body className="min-h-full">
        <AppRouterCacheProvider options={{ key: "mui" }}>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
