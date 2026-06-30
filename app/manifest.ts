import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kingdom Manager",
    short_name: "Kingdom",
    description: "A cozy 2D idle kingdom-management game.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5ECD8",
    theme_color: "#D9A441",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
