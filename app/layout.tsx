import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Cup",
  description: "Private FIFA World Cup 2026 prediction pool for the lab."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
