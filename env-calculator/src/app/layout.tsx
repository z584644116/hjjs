import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import TopNavigation from "@/components/TopNavigation";
import Footer from "@/components/Footer";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "环境计算器",
  description: "面向环境监测现场与实验室的专业即时计算工具,支持空气、水质、土壤、质控与工程设计核算。",
  applicationName: "环境计算器",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "环境计算器",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1512" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <PWARegister />
        <Providers>
          <div className="app-shell">
            <Suspense fallback={null}>
              <TopNavigation />
            </Suspense>
            <main className="app-main">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
