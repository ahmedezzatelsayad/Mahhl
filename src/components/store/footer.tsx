'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Store, MapPin, MessageCircle, Truck, ShieldCheck, Handshake } from 'lucide-react';
import { useBrand, waHref } from '@/components/store/header';
import { useT } from '@/lib/i18n';
import { readLang } from '@/lib/stores/lang-store';
import type { InfoPage } from '@/lib/stores/app-store';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const INFO_LINKS: { page: InfoPage; label: string; labelEn: string }[] = [
  { page: 'about', label: 'من نحن', labelEn: 'About Us' },
  { page: 'affiliate-program', label: 'برنامج المسوقين — سوّق واربح 💰', labelEn: 'Marketers Program — Sell & Earn 💰' },
  { page: 'contact', label: 'تواصل معنا', labelEn: 'Contact Us' },
  { page: 'shipping', label: 'الشحن والتوصيل', labelEn: 'Shipping & Delivery' },
  { page: 'returns', label: 'الاستبدال والاسترجاع', labelEn: 'Returns & Exchange' },
  { page: 'faq', label: 'الأسئلة الشائعة', labelEn: 'FAQ' },
  { page: 'privacy', label: 'سياسة الخصوصية', labelEn: 'Privacy Policy' },
  { page: 'terms', label: 'الشروط والأحكام', labelEn: 'Terms & Conditions' },
  { page: 'guide-ads', label: 'دليل الدعاية في الكويت 📣', labelEn: 'Advertising Guide 📣' },
  { page: 'guide-campaigns', label: 'دليل الحملات والمواسم 📅', labelEn: 'Campaigns & Seasons Guide 📅' },
];

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  const openInfo = useAppStore((s) => s.openInfo);
  const openCategory = useAppStore((s) => s.openCategory);
  const setCategoryMap = useAppStore((s) => s.setCategoryMap);
  const brand = useBrand();
  const { t, lang } = useT();
  const [cats, setCats] = useState<Category[]>([]);

  // Top categories for crawlable links (empty ones are already filtered by the API)
  useEffect(() => {
    fetch(`/api/categories${readLang() === 'en' ? '?lang=en' : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCats(data.slice(0, 10));
          setCategoryMap(data);
        }
      })
      .catch(() => {});
  }, [setCategoryMap, lang]);

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
              {lang === 'en'
                ? 'Kuwait’s #1 dropshipping platform — 2,600+ products ready to market with a suggested commission of 1–10 KWD per product, and you pick your own. Zero capital, zero inventory, zero shipping hassle: register free, share your link, and earn on every delivered order — your customers get fast delivery and cash on delivery.'
                : 'منصة دروب شيبنج رقم 1 في الكويت — أكثر من 2,600 منتج جاهز للتسويق بعمولة مقترحة من 1 إلى 10 د.ك على كل منتج وإنت تختار عمولتك. بدون رأس مال وبدون مخزون وبدون هم الشحن: سجّل مجاناً وشارك رابطك واربح على كل طلب يوصَل — وعملاؤك يتوصلون لهم طلباتهم بسرعة مع الدفع عند الاستلام.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={waHref(brand.whatsapp, lang === 'en' ? 'Hi Mahal Shop, I have a question 🙏' : 'هلا محل شوب، عندي استفسار 🙏')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-sm font-bold transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {lang === 'en' ? 'WhatsApp:' : 'واتساب:'} <span dir="ltr">+965 {brand.whatsapp}</span>
              </a>
              <button
                onClick={() => setView('affiliate-login')}
                className="inline-flex items-center gap-2 rounded-lg btn-gold px-4 py-2 text-sm font-bold transition-transform hover:scale-[1.02]"
              >
                <Handshake className="h-4 w-4" />
                {lang === 'en' ? 'Sell With Us & Earn' : 'سوّق معنا واربح'}
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">{t('f.links')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
                  {t('hdr.home')}
                </a>
              </li>
              <li>
                <a href="/?all=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  {t('hdr.allProducts')}
                </a>
              </li>
              <li>
                <a href="/?account=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  {lang === 'en' ? 'My Account & Orders' : 'حسابي وطلباتي'}
                </a>
              </li>
              <li>
                <a href="/?track=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  {t('hdr.track')}
                </a>
              </li>
              <li>
                <a href="/?wishlist=1" className="text-primary-foreground/70 hover:text-primary-foreground">
                  {t('hdr.wishlist')}
                </a>
              </li>
              <li>
                <button
                  onClick={() => openCategory(null)}
                  className="text-primary-foreground/70 hover:text-primary-foreground cursor-pointer"
                >
                  {t('home.bestsellers')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView('affiliate-login')}
                  className="font-bold text-accent hover:text-accent/80 cursor-pointer"
                >
                  {lang === 'en' ? 'Sell With Us (Dropshipping) 💰' : 'سوّق معنا — دروب شيبنج 💰'}
                </button>
              </li>
            </ul>
          </div>

          {/* Info pages — all working */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-bold mb-3 text-gold-gradient">{lang === 'en' ? 'Information' : 'معلومات'}</h4>
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
                    {lang === 'en' ? l.labelEn : l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + categories */}
          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">{t('shop.categories')}</h4>
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

        {/* Trust strip — honest, policy-backed badges only */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 px-4 py-3">
            <Truck className="h-5 w-5 text-accent shrink-0" />
            <span className="text-primary-foreground/75">
              {lang === 'en' ? 'Delivery to all Kuwait governorates' : 'توصيل لكل محافظات الكويت'}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
            <span className="text-primary-foreground/75">
              {lang === 'en' ? 'Secure cash on delivery · FREE shipping over 30 KWD' : 'دفع آمن عند الاستلام · شحن مجاني فوق 30 د.ك'}
            </span>
          </div>
          <a
            href={waHref(brand.whatsapp, lang === 'en' ? 'Hi Mahal Shop, I have a question about my order 🙏' : 'هلا محل شوب، عندي استفسار عن الطلب 🙏')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 px-4 py-3 hover:border-primary-foreground/30 transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-green-400 shrink-0" />
            <span className="text-primary-foreground/75">
              {lang === 'en' ? 'WhatsApp support' : 'خدمة العملاء واتساب'} <span dir="ltr">+965 {brand.whatsapp}</span>
            </span>
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40 space-y-1">
          <p>
            © {new Date().getFullYear()} {brand.siteName} — {t('f.rights')}.{' '}
            {lang === 'en'
              ? 'Kuwait’s dropshipping platform — affiliate only (no direct sales). Suggested marketer commissions 1–10 KWD per product, delivery to all Kuwait governorates, cash on delivery.'
              : 'منصة دروب شيبنج في الكويت — للتسويق بالعمولة فقط (لا بيع مباشر). عمولات مقترحة للمسوقين من 1 إلى 10 د.ك على كل منتج، توصيل لكل المحافظات، ودفع عند الاستلام.'}
          </p>
          <p className="text-primary-foreground/25 flex items-center justify-center gap-2 flex-wrap">
            <MapPin className="h-3 w-3 inline" /> {lang === 'en' ? 'Kuwait' : 'الكويت'}
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
