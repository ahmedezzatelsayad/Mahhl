import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "إي ميرج | متجر إلكتروني عربي احترافي",
  description:
    "متجر إلكتروني عربي احترافي - أكثر من 2638 منتج بأسعار تنافسية. توصيل سريع لجميع المحافظات، دفع عند الاستلام.",
  keywords: [
    "متجر إلكتروني",
    "تسوق",
    "ecomerg",
    "easyorder",
    "متجر عربي",
    "الكويت",
  ],
  authors: [{ name: "Ecomerg Store" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
