'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Store, Mail, Phone, MapPin } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  const openCategory = useAppStore((s) => s.openCategory);
  const setCategoryMap = useAppStore((s) => s.setCategoryMap);
  const [cats, setCats] = useState<Category[]>([]);

  // Top categories for crawlable links (also feeds the slug->id map)
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

  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      {/* Gold top border */}
      <div className="h-1 btn-gold" aria-hidden="true" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2">
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 font-extrabold text-lg mb-4 cursor-pointer"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl btn-gold">
                <Store className="h-5 w-5" />
              </span>
              محل <span className="text-gold-gradient">شوب</span>
            </button>
            <p className="text-sm text-primary-foreground/60 leading-relaxed max-w-sm">
              متجر إلكتروني كويتي يقدم أكثر من 2,600 منتج في 38 فئة بأسعار تنافسية
              بالدينار الكويتي، مع خدمة توصيل سريعة لجميع المحافظات ودفع آمن عند
              الاستلام — مدعوم بالذكاء الاصطناعي.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                {/* real crawlable link — full navigation is fine from footer */}
                <a
                  href="/"
                  className="text-primary-foreground/60 hover:text-primary-foreground"
                >
                  الرئيسية
                </a>
              </li>
              <li>
                <a
                  href="/?all=1"
                  className="text-primary-foreground/60 hover:text-primary-foreground"
                >
                  كل المنتجات
                </a>
              </li>
              <li>
                <button
                  onClick={() => openCategory(null)}
                  className="text-primary-foreground/60 hover:text-primary-foreground cursor-pointer"
                >
                  العروض والأكثر مبيعاً
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView('cart')}
                  className="text-primary-foreground/60 hover:text-primary-foreground cursor-pointer"
                >
                  سلة التسوق
                </button>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="font-bold mb-3 text-gold-gradient">الفئات</h4>
            <ul className="space-y-2 text-sm">
              {cats.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/?cat=${encodeURIComponent(c.slug)}`}
                    className="text-primary-foreground/60 hover:text-primary-foreground"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">تواصل معنا</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <Phone className="h-4 w-4 text-accent" />
                <span dir="ltr">+965 1234 5678</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <Mail className="h-4 w-4 text-accent" />
                <span>info@mahalshop.com</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <MapPin className="h-4 w-4 text-accent" />
                <span>الكويت — نخدم كل المحافظات</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40 space-y-1">
          <p>
            © {new Date().getFullYear()} محل شوب (Mahal Shop) — جميع الحقوق محفوظة.
            الأسعار بالدينار الكويتي، الدفع عند الاستلام، توصيل لكل محافظات الكويت.
          </p>
          <p className="text-primary-foreground/25">
            <a href="/sitemap.xml" className="hover:text-primary-foreground/50">sitemap.xml</a>
            {' · '}
            <a href="/llms.txt" className="hover:text-primary-foreground/50">llms.txt</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
