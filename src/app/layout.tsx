import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevMatch — Build Projects Together & Earn Proof-of-Work",
  description: "A collaborative platform for developers to post ideas, assemble teams, and build verified proof-of-work projects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-zinc-100">
        {/* Subtle Ambient Background Lighting */}
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-40 z-0 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_80%)]" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none z-0" />
        
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
