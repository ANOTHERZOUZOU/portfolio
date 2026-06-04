import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Fugaz_One, Geist_Mono, Lexend, Poppins } from "next/font/google";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ANOTHERZOUZOU · 设计作品集",
    template: "%s · ANOTHERZOUZOU",
  },
  description:
    "ANOTHERZOUZOU 设计作品集 —— 产品设计、交互动效与品牌视觉作品展示。A design portfolio by ANOTHERZOUZOU covering product design, motion and brand visuals.",
  applicationName: "ANOTHERZOUZOU Portfolio",
  authors: [{ name: "ANOTHERZOUZOU" }],
  creator: "ANOTHERZOUZOU",
  keywords: ["ANOTHERZOUZOU", "设计作品集", "Portfolio", "UI/UX", "产品设计", "交互设计", "Credmex"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
    siteName: "ANOTHERZOUZOU Portfolio",
    title: "ANOTHERZOUZOU · 设计作品集",
    description: "ANOTHERZOUZOU 设计作品集 —— 产品设计、交互动效与品牌视觉。",
  },
  robots: { index: true, follow: true },
};

// 标准的响应式 viewport 元数据
//   width=device-width / initialScale=1     避免移动端被强制缩放, 1:1 设备像素
//   viewportFit=cover                       让内容延伸到刘海屏安全区, 配合 env(safe-area-inset-*)
//   maximumScale 留默认 (允许用户手动缩放, 满足无障碍)
//   themeColor 设为主题深色, 让浏览器地址栏跟随
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0c0e",
};

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  // 关掉自动 metrics 回退字体: 否则 next/font 会把变量值设为
  // "Poppins, Poppins Fallback"(基于 Arial 合成、覆盖全 unicode),
  // 导致中文被 Fallback 抢先渲染, 永远落不到字体栈里的 PingFang。
  adjustFontFallback: false,
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const fugazOne = Fugaz_One({
  variable: "--font-fugaz-one",
  subsets: ["latin"],
  weight: "400",
});

// 窄长 condensed 字体: 用于 Preloader 巨型 LOADING + 数字 (瘦高、全大写海报风)。
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${poppins.variable} ${geistMono.variable} ${lexend.variable} ${fugazOne.variable} ${bebasNeue.variable}`}>
        <LanguageProvider>
          <SmoothScrollProvider />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
