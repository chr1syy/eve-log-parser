import type { Metadata, Viewport } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { LogsProvider } from "@/contexts/LogsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EVE Log Parser",
  description: "Parse and visualize EVE Online combat logs",
};

export const viewport: Viewport = {
  themeColor: "#060810",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${rajdhani.variable} ${jetbrainsMono.variable} bg-void text-text-primary font-ui antialiased`}
      >
        <SessionProvider>
          <AuthProvider>
            <LogsProvider>{children}</LogsProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
