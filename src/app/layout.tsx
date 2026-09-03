import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getSeoSettings, getSiteUrl, DEFAULT_SITE_URL } from "@/lib/seo";
import { getSiteIdentity } from "@/lib/site-identity";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-heading",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let seo = await getSeoSettings();
  let siteUrl = DEFAULT_SITE_URL;
  try {
    siteUrl = await getSiteUrl();
  } catch {
    /* keep localhost fallback */
  }

  const keywords = seo.keywords.split(',').map((k) => k.trim()).filter(Boolean);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.siteTitle,
      template: seo.titleTemplate.includes('%s') ? seo.titleTemplate : `%s | محل شوب`,
    },
    description: seo.description,
    keywords,
    authors: [{ name: "Mahal Shop", url: siteUrl }],
    creator: "Mahal Shop",
    publisher: "محل شوب",
    applicationName: "محل شوب",
    category: "shopping",
    formatDetection: { telephone: true, address: false, email: false },
    alternates: {
      canonical: "./",
      languages: {
        ar: siteUrl,
        "ar-KW": siteUrl,
        "x-default": siteUrl,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification
        ? { "msvalidate.01": seo.bingVerification }
        : undefined,
    },
    openGraph: {
      type: "website",
      siteName: "محل شوب",
      title: seo.siteTitle,
      description: seo.description,
      url: siteUrl,
      locale: "ar_KW",
      alternateLocale: ["en_US"],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.siteTitle,
      description: seo.description,
    },
    other: {
      "geo.region": "KW",
      "geo.placename": "الكويت, Kuwait",
      "geo.position": "29.3759;47.9774",
      ICBM: "29.3759, 47.9774",
      "content-language": "ar-KW",
      "ai-content-declaration": "product-listings",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1C1917",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Dynamic favicon from admin "Site Identity" settings (fallback: generated icon)
  let iconUrl = "/api/favicon";
  try {
    const identity = await getSiteIdentity();
    if (identity.favicon) iconUrl = identity.favicon;
  } catch {
    /* keep fallback */
  }

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href={iconUrl} />
        <link rel="apple-touch-icon" href={iconUrl} />
        {/* set dir/lang before first paint so EN visitors never see an RTL flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var r=localStorage.getItem('mahhl-lang');var l=(r==='en'||(r&&r.indexOf('"lang":"en"')>-1))?'en':'ar';var h=document.documentElement;if(l==='en'){h.setAttribute('dir','ltr');h.setAttribute('lang','en');h.classList.add('lang-en');}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${plexArabic.variable} ${tajawal.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
