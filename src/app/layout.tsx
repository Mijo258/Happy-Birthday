import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Amiri } from "next/font/google";
import "./globals.css";

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "إلى فتاة الميلاد ♡",
  description: "مفاجأة صغيرة، وحبّ لا ينتهي.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={amiri.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
