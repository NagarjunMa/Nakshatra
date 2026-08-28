import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Manrope,
  Playfair_Display,
  Tenor_Sans,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const portfolioDisplay = Playfair_Display({
  variable: "--font-portfolio-display",
  subsets: ["latin"],
});

const portfolioBody = Manrope({
  variable: "--font-portfolio-body",
  subsets: ["latin"],
});

const portfolioSection = Tenor_Sans({
  variable: "--font-portfolio-section",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Nakshatra — Digital Wedding Portfolio",
    template: "%s | Nakshatra",
  },
  description:
    "Create one clear wedding portfolio for your profile, photos, family details, and horoscope.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${portfolioDisplay.variable} ${portfolioBody.variable} ${portfolioSection.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
