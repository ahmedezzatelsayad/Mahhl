'use client';

/**
 * LandingView — public AI-generated landing page renderer.
 * Premium dark hero with gold accents, trust stats, features,
 * testimonials, showcase products, FAQ, and sticky CTA.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/store/product-card';
import { formatKwd } from '@/lib/utils/format';
import {
  ArrowRight,
  Star,
  Truck,
  Shield,
  Headphones,
  Tag,
  Gift,
  Lock,
  Clock,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  X,
} from 'lucide-react';

interface LandingContent {
  title: string;
  subtitle: string;
  heroBadge?: string;
  ctaText?: string;
  ctaSecondary?: string;
  features?: { icon: string; title: string; desc: string }[];
  stats?: { value: string; label: string }[];
  testimonials?: { name: string; text: string; rating: number }[];
  faq?: { q: string; a: string }[];
  urgency?: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number;
  thumb: string | null;
  images: string;
  quantity: number;
  isBestSeller?: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  shield: Shield,
  headset: Headphones,
  star: Star,
  tag: Tag,
  gift: Gift,
  lock: Lock,
  clock: Clock,
};

export function LandingView() {
  const slug = useAppStore((s) => s.selectedLandingSlug);
  const setView = useAppStore((s) => s.setView);
  const openProduct = useAppStore((s) => s.openProduct);

  const [page, setPage] = useState<LandingContent | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!slug) {
      setView('home');
      return;
    }
    setLoading(true);
    fetch(`/api/landing?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => {
        setPage(d.page?.content || null);
        setProducts(d.products || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-96 w-full rounded-none" />
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">الصفحة غير متوفرة</h1>
        <p className="text-muted-foreground mb-4">
          قد يكون العرض انتهى أو الصفحة غير منشورة
        </p>
        <Button onClick={() => setView('home')}>العودة للرئيسية</Button>
      </div>
    );
  }

  const cta = page.ctaText || 'تسوّق الآن';
  const cta2 = page.ctaSecondary || 'تصفّح كل المنتجات';

  return (
    <div className="pb-24">
      {/* ===== Hero — premium dark ===== */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 hero-glow" aria-hidden="true" />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <button
            onClick={() => setView('home')}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-primary-foreground/10 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>

          {page.heroBadge && (
            <span className="inline-block mb-5 px-4 py-1.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/30">
              {page.heroBadge}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold mb-5 leading-[1.3] max-w-3xl mx-auto">
            {page.title}
          </h1>
          <p className="text-sm md:text-lg text-primary-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed">
            {page.subtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Button size="lg" className="btn-gold border-0" onClick={() => setView('shop')}>
              <Sparkles className="h-5 w-5 ml-2" />
              {cta}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setView('shop')}
            >
              {cta2}
              <ArrowRight className="h-5 w-5 mr-2" />
            </Button>
          </div>

          {/* Trust stats */}
          {page.stats && page.stats.length > 0 && (
            <div className="flex flex-wrap justify-center gap-8 md:gap-14">
              {page.stats.slice(0, 4).map((s, i) => (
                <div key={i}>
                  <p className="text-2xl md:text-3xl font-extrabold text-gold-gradient">{s.value}</p>
                  <p className="text-[11px] md:text-xs text-primary-foreground/60 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {page.urgency && (
            <p className="mt-8 inline-block px-5 py-2 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-bold">
              ⚡ {page.urgency}
            </p>
          )}
        </div>
      </section>

      {/* ===== Features ===== */}
      {page.features && page.features.length > 0 && (
        <section className="border-b bg-card">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {page.features.slice(0, 4).map((f, i) => {
                const Icon = ICONS[f.icon] || Shield;
                return (
                  <div key={i} className="text-center p-4">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-3">
                      <Icon className="h-7 w-7" />
                    </span>
                    <p className="font-bold text-sm mb-1">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== Showcase products ===== */}
      {products.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-extrabold mb-6 text-center">
            منتجات <span className="text-gold-gradient">العرض</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Button size="lg" onClick={() => setView('shop')}>
              تصفح كل المنتجات
            </Button>
          </div>
        </section>
      )}

      {/* ===== Testimonials ===== */}
      {page.testimonials && page.testimonials.length > 0 && (
        <section className="bg-muted/30 border-y">
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-2xl font-extrabold mb-8 text-center">
              ماذا يقول <span className="text-gold-gradient">عملاؤنا</span>؟
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {page.testimonials.slice(0, 2).map((t, i) => (
                <div key={i} className="bg-card border rounded-xl p-5">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-4 w-4 ${
                          j < (t.rating || 5) ? 'fill-accent text-accent' : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-3">"{t.text}"</p>
                  <p className="text-xs font-bold text-muted-foreground">— {t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      {page.faq && page.faq.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-extrabold mb-8 text-center">
            أسئلة <span className="text-gold-gradient">شائعة</span>
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {page.faq.map((f, i) => (
              <div key={i} className="border rounded-xl overflow-hidden bg-card">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-right font-bold text-sm cursor-pointer hover:bg-muted/40"
                  aria-expanded={openFaq === i}
                >
                  {f.q}
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Final CTA ===== */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 hero-glow" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
              جاهز تبدأ؟ {cta} اليوم
            </h2>
            <p className="text-sm text-primary-foreground/70 mb-6">
              دفع عند الاستلام • توصيل لكل المحافظات • ضمان الجودة
            </p>
            <Button size="lg" className="btn-gold border-0" onClick={() => setView('shop')}>
              <Sparkles className="h-5 w-5 ml-2" />
              {cta}
            </Button>
          </div>
        </div>
      </section>

      {/* ===== Sticky mobile CTA ===== */}
      <div className="fixed bottom-0 inset-x-0 z-30 glass border-t p-3 md:hidden">
        <Button className="w-full btn-gold border-0" size="lg" onClick={() => setView('shop')}>
          {cta} — دفع عند الاستلام
        </Button>
      </div>
    </div>
  );
}
