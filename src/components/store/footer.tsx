'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Store, Mail, MapPin, MessageCircle, Truck, ShieldCheck } from 'lucide-react';
import { useBrand, waHref } from '@/components/store/header';
import type { InfoPage } from '@/lib/stores/app-store';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const INFO_LINKS: { page: InfoPage; label: string }[] = [
  { page: 'about', label: 'من نحن' },
  { page: 'contact', label: 'تواصل معنا' },
  { page: 'shipping', label: 'الشحن والتوصيل' },
  { page: 'returns', label: 'الاستبدال والاسترجاع' },
  { page: 'faq', label: 'الأسئلة الشائعة' },
  { page: 'privacy', label: 'سياسة الخصوصية' },
  { page: 'terms', label: 'الشروط والأحكام' },
];

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  const openInfo = useAppStore((s) => s.openInfo);
  const openCategory = useAppStore((s) => s.openCategory);
  const setCategoryMap = useAppStore((s) => s.setCategoryMap);
  const brand = useBrand();
  const [cats, setCats] = useState<Category[]>([]);

  // Top categories for crawlable links (empty ones are already filtered by the API)
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCats(data.slice(0, 10));
          setCategoryMap(data);
        }
      })
      .catch(() => {});
  }, [setCategoryMap]);

  const [nameFirst, ...rest] = brand.siteName.split(' ');

  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      {/* Gold top border */}
      <div className="h-1 btn-gold" aria-hidden="true" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* About */}
          <div className="col-span-2 md:col-span-2">
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 font-extrabold text-lg mb-4 cursor-pointer"
            >
              {brand.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={brand.logo} alt={brand.siteName} className="h-9 w-auto object-contain" />
              ) : (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl btn-gold">
                    <Store className="h-5 w-5" />
                  </span>
                  {nameFirst}{' '}
                  {rest.length > 0 && <span className="text-gold-gradient">{rest.join(' ')}</span>}
                </>
              )}
            </button>
            <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-sm">
              متجرك الكويتي الذكي — أكثر من 2,600 منتج بأسعار تنافسية بالدينار الكويتي،
              توصيل سريع لكل محافظات الكويت، ودفع عند الاستلام. تواصل معنا على الواتساب
              وقت ما تحتاج، وفريقنا يرد عليك بأسرع وقت.
            </p>
            <a
              href={waHref(brand.whatsapp, 'هلا محل شوب، عندي استفسار 🙏')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-sm font-bold transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب: <span dir="ltr">+965 {brand.whatsapp}</span>
            </a>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
                  الرئيسية
                </a>
              </li>
              <li>
                <a href="/?all=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  كل المنتجات
                </a>
              </li>
              <li>
                <a href="/?account=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  حسابي وطلباتي
                </a>
              </li>
              <li>
                <a href="/?track=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  تتبع طلبك
                </a>
              </li>
              <li>
                <a href="/?wishlist=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  المفضلة
                </a>
              </li>
              <li>
                <button
                  onClick={() => openCategory(null)}
                  className="text-primary-foreground/70 hover:text-primary-foreground cursor-pointer"
                >
                  الأكثر مبيعاً
                </button>
              </li>
            </ul>
          </div>

          {/* Info pages — all working */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-bold mb-3 text-gold-gradient">معلومات</h4>
            <ul className="space-y-2 text-sm">
              {INFO_LINKS.map((l) => (
                <li key={l.page}>
                  <a
                    href={`/?info=${l.page}`}
                    onClick={(e) => {
                      e.preventDefault();
                      openInfo(l.page);
                    }}
                    className="text-primary-foreground/70 hover:text-primary-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + categories */}
          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">الأقسام</h4>
            <ul className="space-y-2 text-sm">
              {cats.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/?cat=${encodeURIComponent(c.slug)}`}
                    className="text-primary-foreground/70 hover:text-primary-foreground"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 px-4 py-3">
            <Truck className="h-5 w-5 text-accent shrink-0" />
            <span className="text-primary-foreground/75">توصيل لكل محافظات الكويت</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
            <span className="text-primary-foreground/75">دفع آمن عند الاستلام</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 px-4 py-3">
            <Mail className="h-5 w-5 text-accent shrink-0" />
            <span className="text-primary-foreground/75">info@mahalshop.com</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40 space-y-1">
          <p>
            © {new Date().getFullYear()} {brand.siteName} — جميع الحقوق محفوظة. الأسعار
            بالدينار الكويتي، الدفع عند الاستلام، توصيل لكل محافظات الكويت.
          </p>
          <p className="text-primary-foreground/25 flex items-center justify-center gap-2 flex-wrap">
            <MapPin className="h-3 w-3 inline" /> الكويت
            <span>·</span>
            <a href="/sitemap.xml" className="hover:text-primary-foreground/50">sitemap.xml</a>
            <span>·</span>
            <a href="/llms.txt" className="hover:text-primary-foreground/50">llms.txt</a>
            <span>·</span>
            <button
              onClick={() => setView('admin-login')}
              className="hover:text-primary-foreground/50 cursor-pointer"
              title="دخول الإدارة"
            >
              دخول الإدارة
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
