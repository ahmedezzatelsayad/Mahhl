'use client';

import Link from 'next/link';
import { Search, ShoppingCart, Menu, X, Store } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef } from 'react';
import { trackFB } from '@/lib/facebook-pixel';

export function Header() {
  const setView = useAppStore((s) => s.setView);
  const setSearch = useAppStore((s) => s.setSearch);
  const openCategory = useAppStore((s) => s.openCategory);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const totalItems = useCartStore((s) => s.getTotalItems());
  const [q, setQ] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      setSearch(q.trim());
      setMobileMenuOpen(false);
      // Facebook Pixel — Search
      trackFB('Search', { search_string: q.trim() });
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Announcement bar — premium gold on dark */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-1.5 text-center text-xs sm:text-sm font-medium">
          ✨ توصيل مجاني للطلبات 50 د.ك+ — دفع عند الاستلام لكل المحافظات ✨
        </div>
      </div>

      {/* Main navbar — frosted glass */}
      <div className="glass border-b border-border/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo — gold gradient wordmark */}
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 font-extrabold text-xl hover:opacity-90 cursor-pointer"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl btn-gold">
                <Store className="h-5 w-5" />
              </span>
              <span className="hidden sm:inline">
                محل <span className="text-gold-gradient">شوب</span>
              </span>
            </button>

          {/* Desktop search */}
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="ابحث عن منتج..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10"
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
              onClick={() => setView('shop')}
            >
              كل المنتجات
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCart}
              className="relative"
              aria-label="السلة"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
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
              onClick={() => setView('admin-login')}
              className="hidden md:inline-flex"
              title="لوحة التحكم"
            >
              <span className="text-xs">الإدارة</span>
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
                  placeholder="ابحث عن منتج..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-10"
                />
                <button
                  type="submit"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setView('shop');
                  setMobileMenuOpen(false);
                }}
              >
                كل المنتجات
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setView('admin-login');
                  setMobileMenuOpen(false);
                }}
              >
                لوحة التحكم
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
