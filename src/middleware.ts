/**
 * middleware.ts — توجيه دومينات متاجر المسوقين.
 * 1) السب-دومين: ahmed.mahhlkw.com → /store/ahmed (شغال أول ما يربط المالك
 *    دومين wildcard في Vercel — الإعداد جاهز هنا).
 * 2) الدومين الخاص: souq-ahmed.com → /store/souq-ahmed.com (الصفحة تحله
 *    من customDomain في قاعدة البيانات).
 * الرابط الدائم /store/{slug} يشتغل في كل الحالات بدون أي إعداد.
 */
import { NextRequest, NextResponse } from 'next/server';

const MAIN_HOSTS = new Set(
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://mahhl-qzjn.vercel.app')
    .replace(/https?:\/\//, '')
    .replace(/\/+$/, '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];
  const { pathname } = req.nextUrl;

  // لا تلمس anything خارج الصفحات (API/static/_next تمر كما هي)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/store') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/llms') ||
    pathname === '/logo.svg'
  ) {
    return NextResponse.next();
  }

  // الموقع الرئيسي نفسه أو معاينات Vercel أو التطوير المحلي → عادي
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:') ||
    host.endsWith('.local');
  if (MAIN_HOSTS.has(host) || host.endsWith('.vercel.app') || isLocal) {
    return NextResponse.next();
  }

  // دومين خاص بالكامل → صفحة المتجر (الصفحة تحل من customDomain أولاً
  // ثم من السب-دومين الأول لو كان دومين wildcard لمتاجر المنصة)
  const url = req.nextUrl.clone();
  url.pathname = `/store/${host}`;
  url.search = '';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
