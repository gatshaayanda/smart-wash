import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PwaRegister from "@/app/pwa-register";
import ServiceCatalogueSeed from "@/app/service-catalogue-seed";
import "./globals.css";
import "./pwa.css";
import "./big-brothers.css";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Smart Wash", template: "%s | Smart Wash" },
  description: "Book a car wash, request mobile service, and follow requests online or offline.",
  applicationName: "Smart Wash",
  keywords: ["Smart Wash", "PWA", "mobile app", "offline", "installation"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: siteUrl, siteName: "Smart Wash", title: "Smart Wash", description: "Car wash bookings, mobile-service requests and live staff operations." },
  twitter: { card: "summary", title: "Smart Wash", description: "Car wash bookings, mobile-service requests and live staff operations." },
  icons: {
    icon: [
      { url: "/smart-wash-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/smart-wash-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/smart-wash-icon-180.png", sizes: "180x180", type: "image/png" }
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Smart Wash", statusBarStyle: "default" }
};

export const viewport: Viewport = { themeColor: "#278fba", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <PwaRegister /><ServiceCatalogueSeed />{children}<Analytics /><SpeedInsights />
  </body></html>;
}
