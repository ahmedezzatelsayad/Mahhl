'use client';

import { useAppStore } from '@/lib/stores/app-store';
import { Store, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const setView = useAppStore((s) => s.setView);
  const openCategory = useAppStore((s) => s.openCategory);

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2 font-bold text-lg text-primary mb-3"
            >
              <Store className="h-6 w-6" />
              إي ميرج
            </button>
            <p className="text-sm text-muted-foreground leading-relaxed">
              متجر إلكتروني عربي احترافي يقدم آلاف المنتجات بأسعار تنافسية مع خدمة توصيل سريعة ودفع آمن عند الاستلام.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => setView('shop')}
                  className="text-muted-foreground hover:text-primary"
                >
                  كل المنتجات
                </button>
              </li>
              <li>
                <button
                  onClick={() => openCategory(null)}
                  className="text-muted-foreground hover:text-primary"
                >
                  العروض
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView('cart')}
                  className="text-muted-foreground hover:text-primary"
                >
                  سلة التسوق
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">خدمة العملاء</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">سياسة الاستبدال والإرجاع</li>
              <li className="text-muted-foreground">الأسئلة الشائعة</li>
              <li className="text-muted-foreground">الشحن والتوصيل</li>
              <li className="text-muted-foreground">سياسة الخصوصية</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">تواصل معنا</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span dir="ltr">+965 1234 5678</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@ecomerg.com</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>الكويت - الكويت</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} إي ميرج. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
