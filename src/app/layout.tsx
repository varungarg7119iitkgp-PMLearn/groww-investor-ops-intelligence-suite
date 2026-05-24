import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* ── Google Fonts ─────────────────────────────────────────── */
const inter = Inter({
  variable: "--loaded-font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--loaded-font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--loaded-font-hud",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/* ── Metadata ─────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: "Groww — Investor Ops & Intelligence Suite",
    template: "%s | Investor Ops",
  },
  description:
    "Dual-sided fintech ops ecosystem: Smart-Sync FAQ RAG, Weekly PM Pulse, and Voice-first Scheduling — unified under one HUD.",
  keywords: [
    "mutual fund",
    "RAG chatbot",
    "PM pulsator",
    "voice agent",
    "investor operations",
    "fintech",
  ],
  authors: [{ name: "Groww Capstone" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    title: "Groww — Investor Ops & Intelligence Suite",
    description: "AI-powered dual-sided fintech ops ecosystem",
    siteName: "Investor Ops Suite",
  },
};

export const viewport: Viewport = {
  themeColor: "#030508",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* ── Root Layout ──────────────────────────────────────────── */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-mode="investor-terminal"
    >
      <body
        className={`
          ${inter.variable}
          ${interTight.variable}
          ${jetbrainsMono.variable}
          antialiased
        `}
        style={{
          fontFamily: "var(--font-body)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
