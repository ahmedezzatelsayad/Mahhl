import type { Metadata } from "next";
import { Cairo, Rubik } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-heading",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "محل شوب | متجر إلكتروني عربي احترافي",
  description:
    "محل شوب — متجر إلكتروني عربي احترافي. أكثر من 2638 منتج بأسعار تنافسية. توصيل سريع لجميع المحافظات، دفع عند الاستلام.",
  keywords: [
    "محل شوب",
    "متجر إلكتروني",
    "تسوق",
    "mahal shop",
    "متجر عربي",
    "الكويت",
  ],
  authors: [{ name: "Mahal Shop" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${rubik.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
