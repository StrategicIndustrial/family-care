import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Care",
    short_name: "Family Care",
    description: "Coordinating care for Mum.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFBF5", // warm-bg, brief §9
    theme_color: "#2563EB",      // primary
    lang: "en-AU",
    icons: [
      { src: "/icons/icon-192.png",          sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png",          sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
