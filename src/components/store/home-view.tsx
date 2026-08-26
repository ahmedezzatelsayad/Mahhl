'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { ProductCard } from '@/components/store/product-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Truck, Shield, CreditCard, Headphones, Sparkles, Megaphone, HelpCircle } from 'lucide-react';
import { useBrand } from '@/components/store/header';

interface LandingPromo {
  slug: string;
  title: string;
  subtitle: string;
  heroBadge?: string;
}

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
  const openLanding = useAppStore((s) => s.openLanding);
  const setCategoryMap = useAppStore((s) => s.setCategoryMap);
  const brand = useBrand();

  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [landingPromos, setLandingPromos] = useState<LandingPromo[]>([]);
  const [shipping, setShipping] = useState<{ price: number; freeThreshold: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [featRes, bsRes, catRes, landingRes, shipRes] = await Promise.all([
          fetch('/api/products?limit=12&sort=newest'),
          fetch('/api/best-sellers'),
          fetch('/api/categories'),
          fetch('/api/landing'),
          fetch('/api/settings/shipping'),
        ]);
        const featData = await featRes.json();
        const bsData = await bsRes.json();
        const catData = await catRes.json();
        const landingData = await landingRes.json();
        const shipData = await shipRes.json();
        setFeatured(featData.items || []);
        setBestSellers(Array.isArray(bsData) ? bsData.slice(0, 8) : []);
        if (Array.isArray(catData)) {
          setCategories(catData);
          // register slug->id map for browser back/forward support
          setCategoryMap(catData);
        }
        setLandingPromos(Array.isArray(landingData) ? landingData.slice(0, 3) : []);
        if (shipData && typeof shipData.price === 'number') {
          setShipping({ price: shipData.price, freeThreshold: shipData.freeThreshold || 0 });
        }
      } catch (e) {
        console.error('Failed to load home data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [setCategoryMap]);

  return (
    <div>
      {/* Hero — premium dark with gold glow */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 hero-glow" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, oklch(0.9 0.05 80) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />
        <div className="relative container mx-auto px-4 py-14 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/30">
              ✨ أكثر من 2,600 منتج — دفع عند الاستلام
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-[1.25]">
              تسوّق بذكاء،
              <br />
              وفّر أكثر مع <span className="text-gold-gradient">محل شوب</span>
            </h1>
            <p className="text-sm md:text-lg text-primary-foreground/70 mb-7 leading-relaxed max-w-xl">
              منتجات مختارة بعناية من الألعاب والإلكترونيات والأدوات المنزلية. توصيل سريع
              لكل محافظات الكويت، وذكاء اصطناعي يقترح لك الأفضل لسلتك.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="btn-gold border-0" onClick={() => setView('shop')}>
                <Sparkles className="h-5 w-5 ml-2" />
                تسوق الآن
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => openCategory(null)}
              >
                شاهد الأكثر مبيعاً
              </Button>
            </div>

            {/* Honest, verifiable facts only — no invented ratings/counts */}
            <div className="mt-10 flex flex-wrap gap-6 md:gap-10">
              {[
                ['+2,600', 'منتج متوفر الآن'],
                ['6', 'محافظات نغطيها'],
                ['50 د.ك+', 'شحن مجاني للطلب'],
                ['COD', 'دفع عند الاستلام'],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="text-xl md:text-2xl font-extrabold text-gold-gradient">{v}</p>
                  <p className="text-[11px] md:text-xs text-primary-foreground/60 mt-0.5">{l}</p>
                </div>
              ))}
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
            <Feature icon={<Shield className="h-6 w-6" />} title="منتجات مختارة" desc="بعناية وفقاءة" />
            <Feature icon={<Headphones className="h-6 w-6" />} title="دعم يومي" desc="واتساب 9ص–11م" />
          </div>
        </div>
      </section>

      {/* Featured landing promos — AI-generated offers */}
      {landingPromos.length > 0 && (
        <section className="container mx-auto px-4 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {landingPromos.map((p) => (
              <button
                key={p.slug}
                onClick={() => openLanding(p.slug)}
                className="card-lift relative overflow-hidden rounded-xl bg-primary text-primary-foreground p-5 text-right"
              >
                <div className="absolute inset-0 hero-glow" aria-hidden="true" />
                <div className="relative">
                  {p.heroBadge && (
                    <span className="inline-block mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/25 text-accent border border-accent/30">
                      {p.heroBadge}
                    </span>
                  )}
                  <p className="font-extrabold text-base mb-1">{p.title}</p>
                  <p className="text-xs text-primary-foreground/70 line-clamp-2">{p.subtitle}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-accent mt-3">
                    اكتشف العرض
                    <Megaphone className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Categories — with real imagery from the admin identity settings */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-bold">تسوق حسب القسم</h2>
            <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
              كل المنتجات
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.slice(0, 12).map((c) => {
              const img = brand.categoryImages?.[c.slug];
              return (
                <button
                  key={c.id}
                  onClick={() => openCategory(c.id, c.slug)}
                  className="card-lift group relative h-28 md:h-32 overflow-hidden rounded-xl border bg-card text-right"
                >
                  {img ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={img}
                      alt={c.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-primary/5 flex items-center justify-center text-primary font-extrabold text-2xl">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-2.5">
                    <p className="text-white text-[13px] font-bold text-center line-clamp-1 drop-shadow">
                      {c.name}
                    </p>
                    {c._count && (
                      <p className="text-white/80 text-[10px] text-center">
                        {c._count.products} منتج
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
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

      {/* FAQ — visible Q&A (matches FAQPage JSON-LD; helps Google & AI assistants) */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold mb-5 flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          الأسئلة الشائعة عن محل شوب
        </h2>
        <Accordion type="single" collapsible>
          <AccordionItem value="faq-1">
            <AccordionTrigger className="text-right">
              هل يوجد توصيل لجميع محافظات الكويت؟
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              نعم — محل شوب يوصّل لجميع محافظات الكويت الست (العاصمة، حولي، الفروانية،
              الأحمدي، الجهراء، مبارك الكبير).{' '}
              {shipping
                ? `سعر التوصيل ${shipping.price} د.ك${
                    shipping.freeThreshold > 0
                      ? ` والتوصيل مجاني للطلبات من ${shipping.freeThreshold} د.ك فأكثر`
                      : ''
                }.`
                : 'التوصيل مجاني للطلبات الكبيرة.'}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger className="text-right">
              ما هي طرق الدفع المتاحة؟
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              الدفع عند الاستلام (COD) — تدفع نقداً للمندوب عند وصول طلبك. جميع الأسعار
              المعروضة بالدينار الكويتي دون أي رسوم خفية.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger className="text-right">
              كم عدد المنتجات والفئات في محل شوب؟
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              أكثر من 2,600 منتج في 38 فئة تشمل: الأجهزة الكهربائية، مستلزمات المطبخ،
              الأحزمة والمشدات، الألعاب، العناية الشخصية، الأدوات المنزلية وغيرها.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-4">
            <AccordionTrigger className="text-right">
              كيف أطلب من محل شوب؟
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              اختر المنتج المطلوب، اضغط "أضف للسلة"، ثم أكمل الطلب بكتابة اسمك ورقم
              هاتفك والمحافظة والمنطقة والعنوان — سنتصل بك لتأكيد الطلب قبل التوصيل.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
