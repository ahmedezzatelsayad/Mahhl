'use client';

import { useAppStore } from '@/lib/stores/app-store';
import { Store, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  const openCategory = useAppStore((s) => s.openCategory);

  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      {/* Gold top border */}
      <div className="h-1 btn-gold" aria-hidden="true" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 font-extrabold text-lg mb-4 cursor-pointer"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl btn-gold">
                <Store className="h-5 w-5" />
              </span>
              محل <span className="text-gold-gradient">شوب</span>
            </button>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              متجر إلكتروني عربي احترافي يقدم آلاف المنتجات بأسعار تنافسية مع خدمة توصيل
              سريعة ودفع آمن عند الاستلام — مدعوم بالذكاء الاصطناعي.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => setView('shop')}
                  className="text-primary-foreground/60 hover:text-primary-foreground cursor-pointer"
                >
                  كل المنتجات
                </button>
              </li>
              <li>
                <button
                  onClick={() => openCategory(null)}
                  className="text-primary-foreground/60 hover:text-primary-foreground cursor-pointer"
                >
                  العروض
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

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">خدمة العملاء</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-primary-foreground/60">سياسة الاستبدال والإرجاع</li>
              <li className="text-primary-foreground/60">الأسئلة الشائعة</li>
              <li className="text-primary-foreground/60">الشحن والتوصيل</li>
              <li className="text-primary-foreground/60">سياسة الخصوصية</li>
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
                <span>الكويت - الكويت</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40">
          <p>© {new Date().getFullYear()} محل شوب. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
