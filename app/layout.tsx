import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WMS Mobile",
    template: "%s | WMS Mobile",
  },
  description: "Warehouse Management System",
  applicationName: "WMS Mobile",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}