import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap"
});

// Indian scripts fall back behind Geist (DESIGN.md §3). Loaded as a plain Google Fonts
// stylesheet because next/font fails on the Noto families under Turbopack. Each face
// carries a unicode-range, so the browser fetches it only when that script renders.
const NOTO_SCRIPTS_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500&family=Noto+Sans+Tamil:wght@400;500&family=Noto+Sans+Telugu:wght@400;500&display=swap";

export const metadata: Metadata = {
  title: "LIWIP | Worker Verification",
  description: "Get verified once and carry a trusted work credential across gig platforms."
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  // Android Chrome shrinks the layout viewport for the keyboard, so the onboarding
  // footer stays in view (DESIGN.md §13, Keyboard open).
  interactiveWidget: "resizes-content"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable, "font-sans")}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={NOTO_SCRIPTS_CSS} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
