import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoCut AI — Automatically Remove Filler Words from Video",
  description:
    "AI-powered video editor that detects and removes filler words, long pauses, and unnecessary content. Runs entirely in your browser — no uploads required.",
  keywords: [
    "video editor",
    "filler word removal",
    "AI video editing",
    "remove ums",
    "autocut",
  ],
  openGraph: {
    title: "AutoCut AI — Automatically Remove Filler Words from Video",
    description:
      "AI-powered video editor that detects and removes filler words, long pauses, and unnecessary content. Runs entirely in your browser.",
    type: "website",
    url: "https://dallinromney.com/autocut",
  },
  twitter: {
    card: "summary",
    title: "AutoCut AI — Remove Filler Words from Video",
    description:
      "AI-powered video editor that detects and removes filler words and pauses. Runs entirely in your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
