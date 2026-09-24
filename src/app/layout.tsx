import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { TPU_ASSETS } from "@/lib/assets";
import { APP } from "@/lib/config";
import "./globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const heading = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: { default: `${APP.shortName} ${APP.subtitle}`, template: `%s · ${APP.shortName} ${APP.subtitle}` },
  description: `${APP.name}. ${APP.tagline}`,
  applicationName: APP.name,
  icons: {
    icon: [
      { url: TPU_ASSETS.favicon, sizes: "48x48" },
      { url: TPU_ASSETS.favicon32, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: TPU_ASSETS.appIcon, sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#174a3a",
  width: "device-width",
  initialScale: 1,
  // Konten boleh sampai tepi layar (notch/home indicator); jarak aman diatur via env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
