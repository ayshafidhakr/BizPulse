import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizPulse",
  description: "AI-powered business management for Indian SMEs",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}