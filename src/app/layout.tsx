import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerCleanup } from "@/components/sw-cleanup";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Condensed, bold — the "gym signage" display face used for headings & big numbers.
const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FORGE — AI Fitness Trainer",
  description:
    "Your AI personal coach. Real-time form correction, automatic rep counting, and a cinematic workout experience.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-void text-chalk"
        suppressHydrationWarning
      >
        <ServiceWorkerCleanup />
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(18,18,22,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              color: "#f5f5f7",
            },
          }}
        />
      </body>
    </html>
  );
}
