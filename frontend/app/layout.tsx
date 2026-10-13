import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import { Providers } from "@/components/providers";

const barlow = Barlow({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: "600",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: strings.appName,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", barlow.variable, barlowCondensed.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
