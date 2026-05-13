import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Most Complicated Lock Pattern Game",
  description: "A standalone browser puzzle about drawing lock patterns that cover every possible slope.",
  keywords: ["lock pattern", "pattern puzzle", "slope puzzle", "grid puzzle", "logic game"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
