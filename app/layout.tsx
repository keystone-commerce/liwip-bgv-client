import type { Metadata } from "next";
import { Fraunces, Inter, Mukta, Baloo_2 } from "next/font/google";
import "./globals.css";

const brand = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-brand",
  display: "swap"
});

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-display-face",
  display: "swap"
});

const ui = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui-face",
  display: "swap"
});

const deva = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-deva-face",
  display: "swap"
});

export const metadata: Metadata = {
  title: "LIWIP | Worker Verification",
  description: "Get verified once and carry a trusted work credential across gig platforms."
};

export const viewport = {
  themeColor: "#FAF7F2",
  colorScheme: "light" as const
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${deva.variable} ${brand.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
