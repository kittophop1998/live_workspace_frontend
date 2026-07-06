import type { Metadata, Viewport } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { prompt, hand, thai } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Workspace — Schema Collaboration Hub",
  description:
    "Real-time, client-side workspace for backend & frontend devs to design, discuss, and export API schemas.",
};

export const viewport: Viewport = {
  themeColor: "#FFFBF4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full antialiased ${prompt.variable} ${hand.variable} ${thai.variable}`}>
      <body className="min-h-full">
        <AppRouterCacheProvider options={{ key: "mui" }}>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
