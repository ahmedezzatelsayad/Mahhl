'use client';

import { Search, ShoppingCart, Menu, X, Store, User, Heart, MessageCircle } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { trackFB } from '@/lib/facebook-pixel';
import { trackGA4 } from '@/lib/ga4';

interface Brand {
  siteName: string;
  announcement: string;
  logo: string;
  whatsapp: string;
  categoryImages: Record<string, string>;
}

const DEFAULT_BRAND: Brand = {
  siteName: 'محل شوب',
  announcement: 'توصيل لجميع محافظات الكويت — دفع عند الاستلام',
  logo: '',
  whatsapp: '66046358',
  categoryImages: {},
};

export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  useEffect(() => {
    fetch('/api/settings/brand')
      .then((r) => r.json())
      .then((b) => {
        if (b && b.siteName) {
          setBrand({
            siteName: b.siteName,
            announcement: b.announcement || DEFAULT_BRAND.announcement,
            logo: b.logo || '',
            whatsapp: b.whatsapp || DEFAULT_BRAND.whatsapp,
            categoryImages: b.categoryImages || {},
          });
        }
      })
      .catch(() => {});
  }, []);
  return brand;
}

export function waHref(whatsapp: string, text?: string) {
  const num = (whatsapp || '').replace(/\D/g, '');
  const withCC = num.startsWith('965') ? num : `965${num}`;
  return `https://wa.me/${withCC}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function Header() {
  const setView = useAppStore((s) => s.setView);
  const setSearch = useAppStore((s) => s.setSearch);
  const customer = useAppStore((s) => s.customer);
  const brand = useBrand();
  const toggleCart = useCartStore((s) => s.toggleCart);
  const totalItems = useCartStore((s) => s.getTotalItems());
  const wishCount = useWishlistStore((s) => s.items.length);
  const [q, setQ] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Cart badge depends on persisted localStorage — render it only after hydration
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [nameFirst, ...rest] = brand.siteName.split(' ');
  const nameRest = rest.join(' ');

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      setSearch(q.trim());
      setMobileMenuOpen(false);
      trackFB('Search', { search_string: q.trim() });
      trackGA4('search', { search_term: q.trim() });
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Announcement bar — premium gold on dark */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-1.5 text-center text-xs sm:text-sm font-medium">
          ✨ {brand.announcement} ✨
        </div>
      </div>

      {/* Main navbar — frosted glass */}
      <div className="glass border-b border-border/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo — uploaded image or gold gradient wordmark */}
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 font-extrabold text-xl hover:opacity-90 cursor-pointer"
              aria-label="الرئيسية"
            >
              {brand.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={brand.logo}
                  alt={brand.siteName}
                  className="h-10 w-auto max-w-[160px] object-contain"
                />
              ) : (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl btn-gold">
                    <Store className="h-5 w-5" />
                  </span>
                  <span className="hidden sm:inline">
                    {nameFirst}{' '}
                    {nameRest && <span className="text-gold-deep">{nameRest}</span>}
                  </span>
                </>
              )}
            </button>

          {/* Desktop search */}
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="دوّر على منتج... (ساعة، لعبة، عطر)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 bg-white text-foreground border-input"
              />
              <button
                type="submit"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent cursor-pointer"
                aria-label="بحث"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex gap-1.5"
              onClick={() => setView('track-order')}
            >
              <MessageCircle className="h-4 w-4" />
              تتبع طلبك
            </Button>

            {/* حسابي */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('account')}
              className="relative"
              aria-label="حسابي"
              title="حسابي"
            >
              <User className="h-5 w-5" />
              {mounted && customer && (
                <span className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-green-500 border border-background" />
              )}
            </Button>

            {/* المفضلة */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('wishlist')}
              className="relative"
              aria-label="المفضلة"
              title="المفضلة"
            >
              <Heart className="h-5 w-5" />
              {mounted && wishCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -left-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                >
                  {wishCount}
                </Badge>
              )}
            </Button>

            {/* السلة */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCart}
              className="relative"
              aria-label="السلة"
              title="السلة"
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -left-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-3">
            <form onSubmit={submitSearch}>
              <div className="relative">
                <Input
                  type="search"
                  placeholder="دوّر على منتج..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-10 bg-white text-foreground"
                />
                <button
                  type="submit"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="بحث"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'كل المنتجات', action: () => setView('shop') },
                { label: customer ? `حسابي (${customer.name.split(' ')[0]})` : 'حسابي / تسجيل', action: () => setView('account') },
                { label: 'تتبع طلبك', action: () => setView('track-order') },
                { label: 'المفضلة', action: () => setView('wishlist') },
                { label: 'سلة التسوق', action: () => setView('cart') },
                {
                  label: 'واتساب المتجر',
                  action: () => window.open(waHref(brand.whatsapp, 'هلا محل شوب، عندي استفسار 🙏'), '_blank'),
                },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  className="justify-center"
                  onClick={() => {
                    item.action();
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
