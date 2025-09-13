import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import TopNavigation from "@/components/TopNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "环境计算器",
  description: "专业的环境监测计算工具，支持采样嘴计算等功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopNavigation />
            <main style={{ flex: 1 }}>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
