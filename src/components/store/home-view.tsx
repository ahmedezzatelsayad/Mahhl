'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { ProductCard } from '@/components/store/product-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Truck, Shield, CreditCard, Headphones, Sparkles, Megaphone, HelpCircle, Flame } from 'lucide-react';
import { useBrand } from '@/components/store/header';
import { HeroSlider, type Slide } from '@/components/store/hero-slider';
import { useT } from '@/lib/i18n';
import { readLang } from '@/lib/stores/lang-store';
import type { SliderSlide } from '@/lib/slider-types';

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

interface TopDemandProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number;
  thumb: string | null;
  images: string;
  quantity: number;
  isBestSeller: boolean;
  soldCount: number;
  demandRank: number | null;
  rating: number;
  reviewCount: number;
  category: { name: string } | null;
}

export function HomeView() {
  const setView = useAppStore((s) => s.setView);
  const openCategory = useAppStore((s) => s.openCategory);
  const openLanding = useAppStore((s) => s.openLanding);
  const setCategoryMap = useAppStore((s) => s.setCategoryMap);
  const brand = useBrand();
  const { t } = useT();
  const lang = readLang();

  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [topDemand, setTopDemand] = useState<TopDemandProduct[]>([]);
  const [topShown, setTopShown] = useState(12);
  const [categories, setCategories] = useState<Category[]>([]);
  const [landingPromos, setLandingPromos] = useState<LandingPromo[]>([]);
  const [shipping, setShipping] = useState<{ price: number; freeThreshold: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== Founder-managed hero slides (real photos + AI copy, dashboard-controlled) =====
  const [heroSlides, setHeroSlides] = useState<SliderSlide[]>([]);
  const [autoplayMs, setAutoplayMs] = useState<number | undefined>(undefined);
  const [appendPromos, setAppendPromos] = useState(true);

  // offline / API-failure fallback so the hero never renders empty
  const FALLBACK_SLIDES: SliderSlide[] = [
    {
      id: 'fb-brand',
      eyebrow: '✨ أكثر من 2,600 منتج — دفع عند الاستلام',
      title: 'تسوّق بذكاء،',
      highlight: 'وفّر أكثر مع محل شوب',
      subtitle: 'منتجات مختارة بعناية من الألعاب والإلكترونيات والأدوات المنزلية — توصيل سريع لكل محافظات الكويت.',
      eyebrowEn: '✨ 2,600+ products — Cash on Delivery',
      titleEn: 'Shop smart,',
      highlightEn: 'save more with Mahal Shop',
      subtitleEn: 'Carefully picked toys, electronics and home essentials — fast delivery to every Kuwait governorate.',
      tone: 'dark',
      chips: ['+2,600 منتج', 'شحن مجاني من 30 د.ك', 'COD'],
      chipsEn: ['2,600+ items', 'Free shipping over 30 KWD', 'COD'],
      cta: { label: 'تسوق الآن', labelEn: 'Shop Now', action: 'shop' },
      active: true,
    },
  ];

  const slides: Slide[] =
    (heroSlides.length > 0 ? heroSlides : FALLBACK_SLIDES).concat(
      appendPromos
        ? landingPromos.slice(0, 2).map<SliderSlide>((p) => ({
            id: `landing-${p.slug}`,
            eyebrow: p.heroBadge || t('home.landingBadge'),
            title: p.title,
            subtitle: p.subtitle,
            cta: { label: t('home.discover'), action: 'landing', payload: p.slug },
            ctaSecondary: { label: t('home.allProducts'), action: 'shop' },
            tone: 'gold',
            active: true,
          }))
        : []
    );

  useEffect(() => {
    (async () => {
      try {
        const lp = lang === 'en' ? '&lang=en' : '';
        const [featRes, bsRes, catRes, landingRes, shipRes, sliderRes, topRes] = await Promise.all([
          fetch(`/api/products?limit=12&sort=newest${lp}`),
          fetch(`/api/best-sellers${lang === 'en' ? '?lang=en' : ''}`),
          fetch(`/api/categories${lang === 'en' ? '?lang=en' : ''}`),
          fetch('/api/landing'),
          fetch('/api/settings/shipping'),
          fetch('/api/settings/slider'),
          fetch(`/api/products/top-demand?limit=100${lp}`),
        ]);
        const featData = await featRes.json();
        const bsData = await bsRes.json();
        const catData = await catRes.json();
        const landingData = await landingRes.json();
        const shipData = await shipRes.json();
        const sliderData = await sliderRes.json().catch(() => null);
        const topData = await topRes.json().catch(() => []);
        setFeatured(featData.items || []);
        setBestSellers(Array.isArray(bsData) ? bsData.slice(0, 8) : []);
        setTopDemand(Array.isArray(topData) ? topData : []);
        if (Array.isArray(catData)) {
          setCategories(catData);
          // register slug->id map for browser back/forward support
          setCategoryMap(catData);
        }
        setLandingPromos(Array.isArray(landingData) ? landingData.slice(0, 3) : []);
        if (shipData && typeof shipData.price === 'number') {
          setShipping({ price: shipData.price, freeThreshold: shipData.freeThreshold || 0 });
        }
        if (sliderData && Array.isArray(sliderData.slides)) {
          setHeroSlides(sliderData.slides.filter((s: SliderSlide) => s.active));
          if (typeof sliderData.autoplayMs === 'number') setAutoplayMs(sliderData.autoplayMs);
          if (typeof sliderData.appendLandingPromos === 'boolean')
            setAppendPromos(sliderData.appendLandingPromos);
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
      {/* Hero carousel — founder-managed real-photo slides, clear readable copy */}
      <HeroSlider slides={slides} loading={loading} autoplayMs={autoplayMs} />

      {/* Features */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Feature icon={<Truck className="h-6 w-6" />} title={t('home.features.delivery')} desc={t('home.features.deliveryD')} />
            <Feature icon={<CreditCard className="h-6 w-6" />} title={t('home.features.cod')} desc={t('home.features.codD')} />
            <Feature icon={<Shield className="h-6 w-6" />} title={t('home.features.picked')} desc={t('home.features.pickedD')} />
            <Feature icon={<Headphones className="h-6 w-6" />} title={t('home.features.support')} desc={t('home.features.supportD')} />
          </div>
        </div>
      </section>

      {/* ===== TOP-100 Kuwait/Gulf most-demanded — research-ranked, founder-requested ===== */}
      {topDemand.length > 0 && (
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-end justify-between mb-1 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-500" />
                {t('home.topDemand')}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl">
                {t('home.topDemandSub')}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              TOP 100
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mt-5">
            {topDemand.slice(0, topShown).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {topShown < topDemand.length && (
            <div className="text-center mt-6">
              <Button variant="outline" size="lg" onClick={() => setTopShown((v) => Math.min(v + 12, topDemand.length))}>
                {t('home.topDemandMore')} ({topShown}/{topDemand.length})
              </Button>
            </div>
          )}
        </section>
      )}

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
                    {t('home.discover')}
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
            <h2 className="text-xl md:text-2xl font-bold">{t('home.categories')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
              {t('home.allProducts')}
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
                        {c._count.products} {t('home.productCount')}
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
              {t('home.bestsellers')}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
              {t('home.viewAll')}
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
          <h2 className="text-xl md:text-2xl font-bold">{t('home.newest')}</h2>
          <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
            {t('home.viewAll')}
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
            {t('home.browseAll')} (2,638)
          </Button>
        </div>
      </section>

      {/* FAQ — visible Q&A (matches FAQPage JSON-LD; helps Google & AI assistants) */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold mb-5 flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          {t('home.faq')}
        </h2>
        <Accordion type="single" collapsible>
          <AccordionItem value="faq-1">
            <AccordionTrigger className="text-start">
              {t('faq.q1')}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {shipping
                ? t('faq.a1', {
                    price: String(shipping.price),
                    free:
                      shipping.freeThreshold > 0
                        ? t('faq.a1Free', { v: String(shipping.freeThreshold) })
                        : '',
                  })
                : t('faq.a1FreeOnly')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger className="text-start">
              {t('faq.q2')}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {t('faq.a2')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger className="text-start">
              {t('faq.q3')}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {t('faq.a3')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-4">
            <AccordionTrigger className="text-start">
              {t('faq.q4')}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {t('faq.a4')}
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
