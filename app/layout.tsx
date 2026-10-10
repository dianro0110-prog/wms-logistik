import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Zee Wms",
    template: "%s | Zee Wms",
  },
  description: "Warehouse Management System",
  applicationName: "Zee Wms",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  icons: {
    icon: "/Zee Warehouse Management Logo",
    apple: "/logizeewms.png",
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