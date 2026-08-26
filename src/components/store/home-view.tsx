'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { ProductCard } from '@/components/store/product-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Shield, CreditCard, Headphones, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number;
  thumb: string | null;
  images: string;
  quantity: number;
  isBestSeller: boolean;
  category: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  isSub: boolean;
  parentId: string | null;
  children?: Category[];
  _count?: { products: number };
}

export function HomeView() {
  const setView = useAppStore((s) => s.setView);
  const openCategory = useAppStore((s) => s.openCategory);

  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [featRes, bsRes, catRes] = await Promise.all([
          fetch('/api/products?limit=12&sort=newest'),
          fetch('/api/best-sellers'),
          fetch('/api/categories'),
        ]);
        const featData = await featRes.json();
        const bsData = await bsRes.json();
        const catData = await catRes.json();
        setFeatured(featData.items || []);
        setBestSellers(Array.isArray(bsData) ? bsData.slice(0, 8) : []);
        setCategories(Array.isArray(catData) ? catData : []);
      } catch (e) {
        console.error('Failed to load home data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-l from-primary/10 via-accent/30 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              تسوق آلاف المنتجات <span className="text-primary">بأسعار تنافسية</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed">
              أكثر من 2,638 منتج من الألعاب والإلكترونيات والأدوات المنزلية وغيرها. توصيل سريع لكل المحافظات ودفع آمن عند الاستلام.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setView('shop')}>
                <Sparkles className="h-5 w-5 ml-2" />
                تسوق الآن
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => openCategory(null)}
              >
                شاهد الأكثر مبيعاً
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Feature icon={<Truck className="h-6 w-6" />} title="توصيل سريع" desc="لكل المحافظات" />
            <Feature icon={<CreditCard className="h-6 w-6" />} title="دفع آمن" desc="عند الاستلام" />
            <Feature icon={<Shield className="h-6 w-6" />} title="ضمان الجودة" desc="منتجات أصلية" />
            <Feature icon={<Headphones className="h-6 w-6" />} title="دعم 24/7" desc="خدمة العملاء" />
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <h2 className="text-xl md:text-2xl font-bold mb-5">تسوق حسب الفئة</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.slice(0, 6).map((c) => (
              <button
                key={c.id}
                onClick={() => openCategory(c.id)}
                className="group flex flex-col items-center justify-center p-4 border rounded-lg bg-card hover:border-primary hover:bg-accent transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-2 group-hover:scale-110 transition-transform">
                  {c.name.charAt(0)}
                </div>
                <p className="text-xs font-medium text-center line-clamp-2">{c.name}</p>
                {c._count && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {c._count.products} منتج
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              الأكثر مبيعاً
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
              عرض الكل
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))
            ) : (
              bestSellers.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">أحدث المنتجات</h2>
          <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
            عرض الكل
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))
          ) : (
            featured.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
        <div className="text-center mt-8">
          <Button size="lg" onClick={() => setView('shop')}>
            تصفح كل المنتجات (2,638)
          </Button>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
