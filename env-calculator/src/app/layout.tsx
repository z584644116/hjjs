import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import TopNavigation from "@/components/TopNavigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "环境计算器",
  description: "专业的环境监测计算工具，支持空气和废气、水质及通用环境公式计算。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="app-shell">
            <TopNavigation />
            <main className="app-main">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}