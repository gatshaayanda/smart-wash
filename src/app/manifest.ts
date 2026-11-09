import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Smart Wash",
    short_name: "Smart Wash",
    description: "Book a car wash, request mobile service, and follow requests online or offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#278fba",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["business", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      { src: "/smart-wash-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/smart-wash-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/smart-wash-icon-180.png", sizes: "180x180", type: "image/png", purpose: "any" }
    ],
  };
}
