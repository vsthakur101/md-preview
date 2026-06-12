import type { Metadata } from "next";
import { Fraunces, Geist, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import ThemeProvider from "@/components/ThemeProvider";
import CommandPalette from "@/components/CommandPalette";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import MotionProvider from "@/components/MotionProvider";

/*
 * Type roles (see theme spec): Display = Fraunces (headings, titles),
 * Body = Newsreader (article prose), UI = Geist (chrome), Mono = JetBrains.
 * The serif/sans contrast between content and chrome IS the personality.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// High-contrast display serif with optical sizing for headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Humanist serif for long-form reading body text.
const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Markdown Preview",
  description: "Upload or write markdown and see a beautiful HTML preview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${newsreader.variable} antialiased`}
      >
        <ThemeProvider>
          <MotionProvider>
            <SessionProviderWrapper>{children}</SessionProviderWrapper>
            <CommandPalette />
          </MotionProvider>
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
