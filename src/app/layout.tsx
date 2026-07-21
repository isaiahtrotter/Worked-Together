import type { Metadata } from "next";
import { Geist, Geist_Mono, Gabarito } from "next/font/google";
import PostHogInit from "@/components/PostHogInit";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Linkenode",
  description: "Manage your network and embed it on your site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${gabarito.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Loaded by literal family name (not the next/font-scoped
            --font-geist-sans variable) so the same "Geist" reference in
            widget.css / widget-ui.module.css resolves identically here and
            in a real third-party embed, which has no access to next/font. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/network-widget/widget.css" />
      </head>
      <body>
        <PostHogInit />
        {children}
      </body>
    </html>
  );
}
