'use client';

/**
 * DropshipSection — قسم «منصة دروب شيبنج رقم 1 في الكويت» في الرئيسية.
 * يشرح نموذج الربح للمسوقين: عمولة مقترحة 1-10 د.ك على كل منتج حسب تنافسيته،
 * مع آلة حاسبة أرباح تفاعلية وخطوات الانضمام.
 * (المتجر يظل واجهة البيع للعملاء — هذا القسم يقدّم وجه المنصة للمسوقين)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/stores/app-store';
import {
  MousePointerClick, Share2, Banknote, Rocket, Handshake,
  Megaphone, CalendarDays, Eye,
} from 'lucide-react';

const STEPS = [
  {
    icon: MousePointerClick,
    title: '1. سجّل مجاناً',
    desc: 'أنشئ حساب مسوق في دقيقة — بدون رسوم وبدون شروط، وتحصل على كود ورابط خاص فيك.',
  },
  {
    icon: Share2,
    title: '2. شارك المنتجات',
    desc: 'اختر من آلاف المنتجات (كل منتج عليه عمولة مقترحة معروفة من 1 إلى 10 د.ك) وشارك رابطك مع عملائك على واتساب وإنستقرام وتيك توك.',
  },
  {
    icon: Banknote,
    title: '3. استلم عمولتك',
    desc: 'إحنا نتوكل بكل شي: التخزين، الشحن، تحصيل الفلوس، والمحاسبة. عمولتك تتحسب تلقائياً على كل طلب يوصَل وتسحبها وقت ما تبي.',
  },
];

function Calculator() {
  const [orders, setOrders] = useState(100);
  const [tier, setTier] = useState(1.5);
  const monthly = orders * tier;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-5">
      <p className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
        <Rocket className="h-4 w-4 text-amber-400" />
        جرب حاسبة أرباحك الشهرية
      </p>

      <label className="block text-xs text-white/70 mb-1">
        طلبات في الشهر: <span className="font-bold text-amber-400">{orders}</span> طلب
      </label>
      <input
        type="range"
        min={10}
        max={500}
        step={10}
        value={orders}
        onChange={(e) => setOrders(Number(e.target.value))}
        className="w-full accent-amber-400 cursor-pointer"
        dir="ltr"
        aria-label="عدد الطلبات في الشهر"
      />

      <p className="text-xs text-white/70 mt-3 mb-1.5">متوسط عمولة المنتجات اللي بتسوقها:</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="متوسط العمولة">
        {[
          { v: 1, label: '1 د.ك' },
          { v: 1.5, label: '1.5 د.ك' },
          { v: 2, label: '2 د.ك' },
        ].map((o) => (
          <button
            key={o.v}
            role="radio"
            aria-checked={tier === o.v}
            onClick={() => setTier(o.v)}
            className={`rounded-lg border text-xs py-1.5 transition-colors ${
              tier === o.v
                ? 'border-amber-400 bg-amber-400 text-black font-bold'
                : 'border-white/20 text-white/80 hover:border-white/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-black/30 border border-white/10 p-3.5 flex items-center justify-between">
        <span className="text-xs text-white/70">ربحك المتوقع شهرياً</span>
        <span className="text-2xl font-extrabold text-amber-400">
          {monthly.toLocaleString('en', { maximumFractionDigits: 0 })} د.ك
        </span>
      </div>
      <p className="text-[10px] text-white/50 mt-2">
        * تقدير توضيحي — أرباحك الفعلية تعتمد على طلباتك اللي توصل فعلاً للعملاء.
      </p>
    </div>
  );
}

export function DropshipSection() {
  const setView = useAppStore((s) => s.setView);
  const openInfo = useAppStore((s) => s.openInfo);
  return (
    <section className="relative overflow-hidden bg-gradient-to-l from-slate-950 via-slate-900 to-slate-950">
      {/* زخرفة خفيفة */}
      <div className="absolute inset-0 hero-glow opacity-20" aria-hidden="true" />
      <div className="container mx-auto px-4 py-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-400">
              <Handshake className="h-3.5 w-3.5" />
              للمسوقين والدروب شيبرز
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-white leading-snug">
              منصة دروب شيبنج رقم 1 في الكويت 🇰🇼
            </h2>
            <p className="mt-2 text-sm md:text-base text-white/70 max-w-xl leading-relaxed">
              لا تشتري بضاعة ولا تشيل هم الشحن — إحنا نوفر آلاف المنتجات الجاهزة للبيع
              وكل منتج عليه <span className="font-bold text-amber-400">عمولة مقترحة من 1 إلى 10 د.ك — وإنت تختار عمولتك</span> حسب
              قيمته وتنافسيته. لا بيع مباشر من الموقع — أنت بس سوّق، وإحنا نشحن ونحاسب ونوصل الفلوس لحسابك.
            </p>

            {/* العمولات مفتوحة + أدلة التسويق */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 font-bold text-emerald-300">
                <Eye className="h-3 w-3" />
                العمولات مفتوحة — شوف عمولة أي منتج على صفحته
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/15 px-3 py-1 text-white/70">
                + دراسة سعر بيع مقترح لكل منتج في الكويت
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/15 px-3 py-1 text-white/70">
                🔓 بعد التسجيل المجاني يفتح لك الكتالوج كامل (2,600+ منتج) — الزائر يشوف أفضل 200
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15">
                      <Icon className="h-4.5 w-4.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{s.title}</p>
                      <p className="text-xs text-white/60 leading-relaxed max-w-lg">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300 font-bold" onClick={() => setView('affiliate-login')}>
                <Handshake className="h-4 w-4 ml-1.5" />
                سوّق معنا واربح
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => openInfo('guide-ads')}
              >
                <Megaphone className="h-4 w-4 ml-1.5" />
                مركز المسوقين — أدلة مجانية
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <button onClick={() => openInfo('guide-ads')} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-bold text-amber-300 hover:bg-amber-400/20 transition-colors cursor-pointer">
                <Megaphone className="h-3 w-3" /> أفضل ممارسات الدعاية في الكويت
              </button>
              <button onClick={() => openInfo('guide-campaigns')} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-bold text-amber-300 hover:bg-amber-400/20 transition-colors cursor-pointer">
                <CalendarDays className="h-3 w-3" /> دليل الحملات والمواسم الكويتية
              </button>
            </div>
          </div>

          <Calculator />
        </div>
      </div>
    </section>
  );
}
