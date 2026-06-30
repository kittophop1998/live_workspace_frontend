import type { Metadata, Viewport } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { GameLayout } from "@/components/GameLayout";
import { prompt } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kingdom Manager",
  description: "A cozy 2D idle kingdom-management game — assign citizens, build, and grow your tiny kingdom.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kingdom Manager" },
};

export const viewport: Viewport = {
  themeColor: "#D9A441",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full antialiased ${prompt.variable}`}>
      <body className="min-h-full">
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <GameLayout>{children}</GameLayout>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
