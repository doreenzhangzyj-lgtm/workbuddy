import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "上班搭子",
  description: "一个适合办公室摸鱼的下班倒计时首页。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
  {children}
  <Analytics />
</body>
    </html>
  );
}
