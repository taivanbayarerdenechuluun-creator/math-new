import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body", display: "swap" });
const display = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-display-face", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "IQ MATH — Математикийн ухаалаг академи", template: "%s · IQ MATH" },
  description: "6–12-р ангийн сурагчдад зориулсан математикийн сургалт, AI бодогч, шалгалтын бэлтгэлийн платформ.",
  applicationName: "IQ MATH",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070a1f" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Хуудас зурагдахаас өмнө сэдвийг (light/dark) тохируулж анивчихаас сэргийлнэ
const themeScript = `(function(){try{var t=localStorage.getItem('iqm-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" suppressHydrationWarning className={`${body.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
