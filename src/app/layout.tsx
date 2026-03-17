import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KoiRaboti",
  description: "Mobile-first restaurant operations dashboard for daily reports, attendance, and payroll.",
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
