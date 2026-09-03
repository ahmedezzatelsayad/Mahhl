'use client';

/**
 * SlideEditor — full editing form for ONE slide:
 *  - live WYSIWYG preview (SlidePreview)
 *  - AI copy generation from a real product (or a free topic)
 *  - background: real photo via URL / upload / a product's own photo
 *  - CTA wiring: shop / category / landing / track / product
 */

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { SliderCta, SliderSlide, SlideAction } from '@/lib/slider-types';
import { ProductPicker, firstImageOf, type PickedProduct } from './product-picker';
import { SlidePreview } from './slide-preview';
import { Sparkles, Upload, Link2, ImageIcon, Trash2, Plus, Loader2 } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  isSub: boolean;
  parentId: string | null;
}
export interface LandingOption {
  slug: string;
  title: string;
}

const TONES: { key: SliderSlide['tone']; label: string; bg: string }[] = [
  { key: 'dark', label: 'داكن', bg: 'linear-gradient(135deg,#1c1917,#3f3f46)' },
  { key: 'gold', label: 'ذهبي', bg: 'linear-gradient(135deg,#854d0e,#d4a017)' },
  { key: 'green', label: 'أخضر', bg: 'linear-gradient(135deg,#14532d,#4d7c0f)' },
  { key: 'blue', label: 'أزرق', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
];

const ACTION_LABELS: Record<SlideAction, string> = {
  shop: 'كل المنتجات',
  category: 'قسم محدد',
  landing: 'صفحة هبوط',
  track: 'تتبع الطلب',
  product: 'منتج محدد',
  'affiliate-login': 'بوابة المسوقين',
};

function CtaEditor({
  cta,
  categories,
  landings,
  onChange,
}: {
  cta: SliderCta;
  categories: CategoryOption[];
  landings: LandingOption[];
  onChange: (c: SliderCta) => void;
}) {
  const needsPayload = cta.action === 'category' || cta.action === 'landing' || cta.action === 'product';
  return (
    <div className="rounded-lg border p-3 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs">نص الزر (عربي)</Label>
          <Input
            value={cta.label}
            onChange={(e) => onChange({ ...cta, label: e.target.value })}
            placeholder="تسوق الآن"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            نص الزر (English) <span className="text-muted-foreground">— للزوار الإنجليز</span>
          </Label>
          <Input
            dir="ltr"
            value={cta.labelEn || ''}
            onChange={(e) => onChange({ ...cta, labelEn: e.target.value })}
            placeholder="Shop Now"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">عند الضغط يفتح</Label>
          <select
            value={cta.action}
            onChange={(e) => onChange({ ...cta, action: e.target.value as SlideAction, payload: undefined })}
            className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
          >
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      {needsPayload && (
        <div>
          {cta.action === 'category' && (
            <select
              value={cta.payload || ''}
              onChange={(e) => onChange({ ...cta, payload: e.target.value })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">— اختر القسم —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.isSub ? '↳ ' : ''}
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {cta.action === 'landing' && (
            <select
              value={cta.payload || ''}
              onChange={(e) => onChange({ ...cta, payload: e.target.value })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">— اختر صفحة الهبوط —</option>
              {landings.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.title}
                </option>
              ))}
            </select>
          )}
          {cta.action === 'product' && (
            <ProductPicker
              value={cta.payload ? `_picked:${cta.payload}` : null}
              onClear={() => onChange({ ...cta, payload: undefined })}
              onPick={(p) => onChange({ ...cta, payload: p.slug })}
              placeholder="اربط الزر بمنتج — ابحث بالاسم…"
            />
          )}
          {cta.action === 'product' && cta.payload && (
            <p className="text-[11px] text-muted-foreground mt-1"> slug: {cta.payload}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SlideEditor({
  slide,
  categories,
  landings,
  adminToken,
  onChange,
  onNotify,
}: {
  slide: SliderSlide;
  categories: CategoryOption[];
  landings: LandingOption[];
  adminToken: string | null;
  onChange: (patch: Partial<SliderSlide>) => void;
  onNotify: (type: 'ok' | 'err', text: string) => void;
}) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiProduct, setAiProduct] = useState<PickedProduct | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const patchCta = (patch: Partial<SliderCta>) => onChange({ cta: { ...slide.cta, ...patch } });
  const patchCta2 = (patch: Partial<SliderCta>) =>
    onChange({ ctaSecondary: { ...(slide.ctaSecondary as SliderCta), ...patch } });

  // ===== AI copy =====
  const runAi = async () => {
    if (!aiProduct && aiTopic.trim().length < 3) {
      onNotify('err', 'اختر منتجاً أو اكتب موضوع الحملة أولاً');
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch('/api/admin/slider/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(aiProduct ? { productId: aiProduct.id } : { topic: aiTopic.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل التوليد');
      const c = data.copy;
      const nextCta: SliderCta = aiProduct
        ? { label: c.ctaLabel || slide.cta.label, labelEn: c.ctaLabelEn || slide.cta.labelEn, action: 'product', payload: aiProduct.slug }
        : { ...slide.cta, label: c.ctaLabel || slide.cta.label, labelEn: c.ctaLabelEn || slide.cta.labelEn };
      onChange({
        eyebrow: c.eyebrow || slide.eyebrow,
        title: c.title,
        highlight: c.highlight || undefined,
        subtitle: c.subtitle,
        chips: c.chips?.length ? c.chips : slide.chips,
        eyebrowEn: c.eyebrowEn || slide.eyebrowEn,
        titleEn: c.titleEn || slide.titleEn,
        highlightEn: c.highlightEn || slide.highlightEn,
        subtitleEn: c.subtitleEn || slide.subtitleEn,
        chipsEn: c.chipsEn?.length ? c.chipsEn : slide.chipsEn,
        tone: c.tone || slide.tone,
        cta: nextCta,
        ...(slide.ctaSecondary ? { ctaSecondary: { ...slide.ctaSecondary, labelEn: c.ctaLabelEn ? undefined : slide.ctaSecondary.labelEn } } : {}),
        // when AI wrote around a product: auto-use its real photo if the slide has none
        ...(aiProduct && !slide.image ? { image: firstImageOf(aiProduct) || slide.image } : {}),
      });
      onNotify('ok', `تم توليد النص العربي والإنجليزي بالذكاء الاصطناعي (${data.provider === 'fallback' ? 'نموذج احتياطي' : 'AI'}) — راجعه وعدّل ما تشاء`);
    } catch (e) {
      onNotify('err', e instanceof Error ? e.message : 'فشل توليد النص');
    } finally {
      setAiBusy(false);
    }
  };

  // ===== image tools =====
  const onUpload = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 600_000) {
      onNotify('err', 'حجم الصورة كبير — الحد الأقصى 600KB (استخدم رابط صورة للصور الثقيلة)');
      return;
    }
    setImgBusy(true);
    const r = new FileReader();
    r.onload = () => {
      onChange({ image: String(r.result) });
      setImgBusy(false);
    };
    r.onerror = () => {
      onNotify('err', 'تعذّر قراءة الصورة');
      setImgBusy(false);
    };
    r.readAsDataURL(f);
  };

  return (
    <div className="space-y-4">
      <SlidePreview slide={slide} />

      {/* ===== AI copywriter ===== */}
      <div className="rounded-xl border-2 border-dashed border-primary/35 bg-primary/[0.04] p-3 space-y-2.5">
        <p className="text-sm font-extrabold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          اكتب النص بالذكاء الاصطناعي
        </p>
        <ProductPicker
          value={aiProduct?.name ?? null}
          onClear={() => setAiProduct(null)}
          onPick={(p) => {
            setAiProduct(p);
            setAiTopic('');
          }}
          placeholder="اختر منتجاً ليكتب AI نصه… (مثل أمازون)"
        />
        <div className="flex items-center gap-2">
          <Input
            value={aiTopic}
            onChange={(e) => {
              setAiTopic(e.target.value);
              setAiProduct(null);
            }}
            placeholder="أو اكتب موضوعاً حراً (مثال: عروض المطبخ)"
          />
          <Button onClick={runAi} disabled={aiBusy} className="flex-shrink-0">
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            ولّد النص
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          الذكاء الاصطناعي يكتب نصاً عربياً بلهجة خليجية + النص الإنجليزي المقابل — بأرقام حقيقية فقط (بدون تقييمات أو ادعاءات مخترعة)، وتربط الشريحة بالمنتج تلقائياً.
        </p>
      </div>

      {/* ===== copy fields (AR + EN) ===== */}
      <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3 space-y-1.5">
        <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
          ✍️ نصوص الشريحة — عربي + English
          <span className="font-normal text-muted-foreground">(الإنجليزي يظهر لزوار النسخة الإنجليزية — لو تركته فاضياً يظهر العربي)</span>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">النص العلوي (Eyebrow)</Label>
          <Input
            value={slide.eyebrow || ''}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="✨ أكثر من 2,600 منتج"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            Eyebrow <span className="text-muted-foreground">(English)</span>
          </Label>
          <Input
            dir="ltr"
            value={slide.eyebrowEn || ''}
            onChange={(e) => onChange({ eyebrowEn: e.target.value })}
            placeholder="✨ 2,600+ products"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">الكلمة المميزة (تظهر ذهبية)</Label>
          <Input
            value={slide.highlight || ''}
            onChange={(e) => onChange({ highlight: e.target.value })}
            placeholder="وفّر أكثر"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            Highlight <span className="text-muted-foreground">(English)</span>
          </Label>
          <Input
            dir="ltr"
            value={slide.highlightEn || ''}
            onChange={(e) => onChange({ highlightEn: e.target.value })}
            placeholder="save more"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">العنوان الرئيسي *</Label>
          <Input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="تسوّق بذكاء"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            Title <span className="text-muted-foreground">(English) *</span>
          </Label>
          <Input
            dir="ltr"
            value={slide.titleEn || ''}
            onChange={(e) => onChange({ titleEn: e.target.value })}
            placeholder="Shop smart"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">الوصف *</Label>
          <Textarea
            value={slide.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="وصف قصير يظهر تحت العنوان…"
            className="mt-1 min-h-[70px]"
          />
        </div>
        <div>
          <Label className="text-xs">
            Subtitle <span className="text-muted-foreground">(English) *</span>
          </Label>
          <Textarea
            dir="ltr"
            value={slide.subtitleEn || ''}
            onChange={(e) => onChange({ subtitleEn: e.target.value })}
            placeholder="Short benefit-driven line under the title…"
            className="mt-1 min-h-[70px]"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">عناصر الثقة (افصل بفاصلة)</Label>
          <Input
            value={(slide.chips || []).join('، ')}
            onChange={(e) =>
              onChange({
                chips: e.target.value
                  .split(/[،,]/)
                  .map((c) => c.trim())
                  .filter(Boolean)
                  .slice(0, 4),
              })
            }
            placeholder="دفع عند الاستلام، توصيل 1 د.ك، شحن يومي"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            Trust chips <span className="text-muted-foreground">(English)</span>
          </Label>
          <Input
            dir="ltr"
            value={(slide.chipsEn || []).join(', ')}
            onChange={(e) =>
              onChange({
                chipsEn: e.target.value
                  .split(/[,،]/)
                  .map((c) => c.trim())
                  .filter(Boolean)
                  .slice(0, 4),
              })
            }
            placeholder="Cash on delivery, 1 KWD delivery, daily shipping"
            className="mt-1"
          />
        </div>
      </div>

      {/* ===== background image ===== */}
      <div className="rounded-lg border p-3 space-y-2.5">
        <p className="text-sm font-bold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> صورة الخلفية الحقيقية
        </p>
        {slide.image ? (
          <div className="flex items-start gap-3">
            { }
            <img src={slide.image} alt="" className="h-16 w-28 rounded-lg object-cover border" />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => onChange({ image: undefined })}
            >
              <Trash2 className="h-4 w-4" /> إزالة الصورة
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            بدون صورة — ستظهر خلفية متدرجة ({TONES.find((t) => t.key === slide.tone)?.label}).
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Link2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              placeholder="https://… رابط صورة"
              className="pr-8"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!imgUrl.trim()}
            onClick={() => {
              onChange({ image: imgUrl.trim() });
              setImgUrl('');
            }}
          >
            استخدام الرابط
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={imgBusy}>
            {imgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع صورة
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </div>
        <ProductPicker
          value={null}
          onPick={(p) => {
            const img = firstImageOf(p);
            if (img) onChange({ image: img });
            else onNotify('err', 'هذا المنتج ليس لديه صورة');
          }}
          placeholder="أو استخدم صورة منتج من الكتالوج…"
        />
      </div>

      {/* ===== tone ===== */}
      <div>
        <Label className="text-xs">لون الخلفية المتدرجة (تحت الصورة)</Label>
        <div className="flex gap-2 mt-1.5">
          {TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange({ tone: t.key })}
              className={`h-9 flex-1 rounded-lg border-2 text-xs font-bold text-white transition-all ${
                slide.tone === t.key ? 'border-foreground scale-[1.03]' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
              style={{ background: t.bg }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== CTAs ===== */}
      <div>
        <Label className="text-xs mb-1.5 block">الزر الرئيسي</Label>
        <CtaEditor cta={slide.cta} categories={categories} landings={landings} onChange={patchCta} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs">زر ثانوي (اختياري)</Label>
          {slide.ctaSecondary ? (
            <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => onChange({ ctaSecondary: undefined })}>
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7" onClick={() => onChange({ ctaSecondary: { label: 'كل المنتجات', labelEn: 'All Products', action: 'shop' } })}>
              <Plus className="h-3.5 w-3.5" /> إضافة
            </Button>
          )}
        </div>
        {slide.ctaSecondary && (
          <CtaEditor cta={slide.ctaSecondary} categories={categories} landings={landings} onChange={patchCta2} />
        )}
      </div>

      {/* ===== active ===== */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-bold">مفعّلة في الموقع</p>
          <p className="text-xs text-muted-foreground">الشرائح غير المفعّلة لا تظهر للزوار</p>
        </div>
        <Switch checked={slide.active} onCheckedChange={(v) => onChange({ active: v })} />
      </div>
    </div>
  );
}
