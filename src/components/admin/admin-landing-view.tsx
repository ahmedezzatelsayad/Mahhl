'use client';

/**
 * AdminLandingView — AI landing page builder.
 * Founder types a topic, DeepSeek generates a full landing blueprint,
 * founder picks showcase products, saves & publishes.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Sparkles,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Rocket,
  Wand2,
  Star,
  Megaphone,
} from 'lucide-react';

interface LandingPageRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  isFeatured: boolean;
  views: number;
  createdAt: string;
}

interface GeneratedContent {
  title: string;
  subtitle: string;
  heroBadge: string;
  ctaText: string;
  ctaSecondary: string;
  features: { icon: string; title: string; desc: string }[];
  stats: { value: string; label: string }[];
  testimonials: { name: string; text: string; rating: number }[];
  faq: { q: string; a: string }[];
  urgency: string;
}

interface ProductRow {
  id: string;
  name: string;
  salePrice: number;
  thumb: string | null;
}

const TONES = ['حماسي', 'فخم وراقي', 'عملي مباشر', 'ودّي قريب'];

export function AdminLandingView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const openLanding = useAppStore((s) => s.openLanding);

  const [pages, setPages] = useState<LandingPageRow[]>([]);
  const [loading, setLoading] = useState(true);

  // generator state
  const [genOpen, setGenOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState(TONES[0]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [provider, setProvider] = useState('');

  // product picker
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // save state
  const [saving, setSaving] = useState(false);

  async function loadPages() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/landing', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) setPages(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchProducts(q: string) {
    setProductSearch(q);
    if (q.trim().length < 2) return;
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`);
      const d = await res.json();
      setProducts(d.items || []);
      setShowProductPicker(true);
    } catch {
      /* ignore */
    }
  }

  async function generate() {
    if (!topic.trim()) {
      toast.error('اكتب موضوع الصفحة أولاً');
      return;
    }
    setGenerating(true);
    setGenerated(null);
    try {
      const res = await fetch('/api/admin/landing/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ topic, audience, tone, productIds: selectedProducts }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setGenerated(d.content);
        setProvider(d.provider);
        toast.success(
          d.provider === 'deepseek'
            ? 'تم التوليد بـ DeepSeek ✨'
            : d.provider === 'zai'
              ? 'تم التوليد بالذكاء المدمج'
              : 'تم استخدام قالب جاهز — أضف مفتاح DeepSeek لتوليد مخصص'
        );
      } else {
        toast.error(d.error || 'فشل التوليد');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setGenerating(false);
    }
  }

  async function saveLanding(featured: boolean) {
    if (!generated) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: generated.title,
          subtitle: generated.subtitle,
          content: generated,
          productIds: selectedProducts,
          isFeatured: featured,
        }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        toast.success('تم إنشاء صفحة الهبوط 🎉');
        setGenOpen(false);
        setGenerated(null);
        setTopic('');
        setSelectedProducts([]);
        loadPages();
      } else {
        toast.error(d.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  async function pageAction(id: string, action: string, slug?: string) {
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        if (action === 'delete') {
          setPages((p) => p.filter((x) => x.id !== id));
          toast.success('تم حذف الصفحة');
        } else {
          toast.success(
            action === 'toggle-active'
              ? 'تم تحديث حالة النشر'
              : 'تم تحديث حالة الظهور في المتجر'
          );
          loadPages();
        }
        if (action === 'toggle-active' && slug) {
          // preview it right away
        }
      } else {
        toast.error('فشل التنفيذ');
      }
    } catch {
      toast.error('فشل الاتصال');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" />
            صفحات الهبوط
          </h1>
          <p className="text-sm text-muted-foreground">
            أنشئ صفحات ترويجية بالذكاء الاصطناعي لزيادة المبيعات
          </p>
        </div>
        <Dialog open={genOpen} onOpenChange={setGenOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gold border-0 hover:opacity-95">
              <Wand2 className="h-4 w-4 ml-2" />
              إنشاء بالـ AI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                مولّد صفحات الهبوط بالذكاء الاصطناعي
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>موضوع الصفحة *</Label>
                  <Input
                    placeholder="مثال: عرض رمضان على أدوات المطبخ"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الجمهور المستهدف</Label>
                  <Input
                    placeholder="مثال: ربات المنازل"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>النبرة</Label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        tone === t
                          ? 'btn-gold border-0 text-white'
                          : 'bg-card hover:bg-muted'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product picker */}
              <div className="space-y-1.5">
                <Label>منتجات العرض ({selectedProducts.length} مختار)</Label>
                <Input
                  placeholder="ابحث عن منتجات لإضافتها للصفحة..."
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                />
                {showProductPicker && products.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                    {products.map((p) => {
                      const selected = selectedProducts.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() =>
                            setSelectedProducts((s) =>
                              selected ? s.filter((x) => x !== p.id) : [...s, p.id]
                            )
                          }
                          className={`w-full flex items-center gap-3 p-2 text-right text-sm transition-colors cursor-pointer ${
                            selected ? 'bg-accent/10' : 'hover:bg-muted'
                          }`}
                        >
                          {p.thumb && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.thumb}
                              alt=""
                              className="h-10 w-10 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <span className="flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {p.salePrice} د.ك
                          </span>
                          {selected && <Badge className="btn-gold border-0">مضاف</Badge>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button onClick={generate} disabled={generating} className="w-full">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    الذكاء الاصطناعي يكتب صفحتك...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 ml-2" />
                    توليد الصفحة
                  </>
                )}
              </Button>

              {/* Generated preview */}
              {generated && (
                <Card className="border-accent/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>معاينة المحتوى المولّد</span>
                      <Badge variant="outline" className="text-[10px]">
                        {provider === 'deepseek'
                          ? 'DeepSeek'
                          : provider === 'zai'
                            ? 'مدمج'
                            : 'قالب'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[10px] text-accent font-bold">{generated.heroBadge}</p>
                      <p className="font-extrabold text-base">{generated.title}</p>
                      <p className="text-muted-foreground text-xs mt-1">{generated.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {generated.features?.slice(0, 4).map((f, i) => (
                        <div key={i} className="border rounded-lg p-2">
                          <p className="font-bold text-xs">{f.title}</p>
                          <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                        </div>
                      ))}
                    </div>

                    {generated.testimonials?.[0] && (
                      <div className="border rounded-lg p-2">
                        <div className="flex gap-0.5 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < (generated.testimonials[0].rating || 5)
                                  ? 'fill-accent text-accent'
                                  : 'text-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          "{generated.testimonials[0].text}" — {generated.testimonials[0].name}
                        </p>
                      </div>
                    )}

                    {generated.urgency && (
                      <p className="text-xs font-bold text-accent">⚡ {generated.urgency}</p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        className="btn-gold border-0"
                        onClick={() => saveLanding(true)}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        ) : (
                          <Rocket className="h-4 w-4 ml-2" />
                        )}
                        حفظ ونشر في المتجر
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveLanding(false)}
                        disabled={saving}
                      >
                        حفظ بدون نشر
                      </Button>
                      <Button size="sm" variant="ghost" onClick={generate} disabled={generating}>
                        إعادة التوليد
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pages list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold mb-1">لا توجد صفحات هبوط بعد</p>
            <p className="text-sm text-muted-foreground mb-4">
              ابدأ بإنشاء أول صفحة ترويجية بالذكاء الاصطناعي — اكتب فكرة العرض ودع الـ AI
              يكتب الباقي
            </p>
            <Button className="btn-gold border-0" onClick={() => setGenOpen(true)}>
              <Wand2 className="h-4 w-4 ml-2" />
              إنشاء أول صفحة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {pages.map((p) => (
            <Card key={p.id} className="card-lift">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{p.title}</h3>
                    {p.isActive && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        منشورة
                      </Badge>
                    )}
                    {p.isFeatured && (
                      <Badge className="btn-gold border-0 text-white hover:opacity-90">
                        ظاهرة في المتجر
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{p.subtitle}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    /{p.slug} • {p.views} مشاهدة •{' '}
                    {new Date(p.createdAt).toLocaleDateString('ar-KW')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openLanding(p.slug)}
                    title="معاينة"
                  >
                    <Eye className="h-4 w-4 ml-1" />
                    معاينة
                  </Button>
                  <Button
                    size="sm"
                    variant={p.isFeatured ? 'default' : 'outline'}
                    onClick={() => pageAction(p.id, 'toggle-featured')}
                    title="إظهار في المتجر"
                  >
                    <Rocket className="h-4 w-4 ml-1" />
                    {p.isFeatured ? 'مروّجة' : 'ترويج'}
                  </Button>
                  <Button
                    size="sm"
                    variant={p.isActive ? 'default' : 'outline'}
                    onClick={() => pageAction(p.id, 'toggle-active')}
                    title="نشر"
                  >
                    {p.isActive ? 'منشورة' : 'نشر'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`حذف "${p.title}"؟`)) pageAction(p.id, 'delete');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
