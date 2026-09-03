/**
 * تحويل شرائح hero_slider في إنتاج Neon إلى هوية منصة الافلييت:
 *  • الشريحة الأولى: رسالة البرنامج (عمولات 1–10 د.ك — إنت تختار)
 *  • شرائح المنتجات الثلاث: تتحول من «اطلبها الحين» إلى «سوّقه واربح — عمولتك المقترحة X د.ك»
 * Usage: export DATABASE_URL="$NEON_DATABASE_URL" && node scripts/commission/update-hero-affiliate.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const row = await db.siteSetting.findUnique({ where: { key: 'hero_slider' } });
  if (!row) {
    console.log('no hero_slider row — defaults already affiliate-first, nothing to do');
    return;
  }
  const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
  const slides = Array.isArray(v.slides) ? v.slides : [];

  // product slugs → fresh commissions (re-read from DB so this stays correct after re-runs)
  const payloads = slides.map((s) => s?.cta?.payload).filter(Boolean);
  const prods = await db.product.findMany({
    where: { slug: { in: payloads } },
    select: { slug: true, commission: true, salePrice: true },
  });
  const byslug = Object.fromEntries(prods.map((p) => [p.slug, p]));
  const fmt = (n) => (Number.isInteger(n) ? `${n}.000` : `${n}`);

  const brand = {
    id: 'brand-affiliate',
    eyebrow: '🇰🇼 منصة دروب شيبنج رقم 1 في الكويت',
    eyebrowEn: '🇰🇼 Kuwait’s #1 Dropshipping Platform',
    title: 'سوّق واربح،',
    titleEn: 'Market & Earn —',
    highlight: 'عمولات مقترحة من 1 إلى 10 د.ك — إنت تختار',
    highlightEn: 'Suggested commissions 1–10 KWD — you pick your own',
    subtitle:
      'سجّل مجاناً كمُسوّق، شارك أكثر من 2,600 منتج برابطك الخاص، وإحنا نتكفل بالتخزين والشحن والتحصيل — عمولتك تتحسب تلقائياً على كل طلب يوصَل.',
    subtitleEn:
      'Register free as a marketer, share 2,600+ products with your own link, and we handle storage, shipping and collection — your commission is credited automatically on every delivered order.',
    image: slides[0]?.image || '',
    tone: 'dark',
    chips: ['عمولات 1–10 د.ك', 'تسجيل مجاني', 'بدون رأس مال', 'بدون بيع مباشر'],
    chipsEn: ['1–10 KWD commissions', 'Free registration', 'Zero capital', 'Affiliate-only'],
    cta: { label: 'سوّق معنا واربح', action: 'affiliate-login', labelEn: 'Sell With Us & Earn' },
    ctaSecondary: { label: 'شوف المنتجات', action: 'shop', labelEn: 'Browse Products' },
    active: true,
  };

  const newSlides = [brand, ...slides.filter((s) => s?.id !== 'brand-affiliate').map((s) => {
    const p = s?.cta?.payload ? byslug[s.cta.payload] : null;
    const c = p ? fmt(p.commission) : null;
    return {
      ...s,
      eyebrow: s.eyebrow?.includes('الأكثر') ? '🔥 منتج رابح — الأكثر مبيعاً' : '🔥 منتج رابح للتسويق',
      eyebrowEn: '🔥 A proven winner to market',
      highlight: c ? `عمولتك المقترحة: ${c} د.ك` : s.highlight,
      highlightEn: c ? `Suggested commission: ${c} KWD` : s.highlightEn,
      subtitle: c
        ? `هذا المنتج يبيع نفسه — سوّقه لجمهورك وأضف عمولتك (من 1 إلى 10 د.ك بمزاجك) فوق سعره (${fmt(p.salePrice)} د.ك). إحنا نشحن ونحصّل ونوصل العمولة لحسابك.`
        : s.subtitle,
      subtitleEn: c
        ? `This one sells itself — market it to your audience and add your commission (1–10 KWD, your choice) on top of its ${fmt(p.salePrice)} KWD price. We ship, collect and pay your commission.`
        : s.subtitleEn,
      cta: { ...(s.cta || {}), label: 'سوّقه واربح', labelEn: 'Market It & Earn', action: 'affiliate-login', payload: undefined },
      ctaSecondary: { label: 'شوف كل المنتجات', action: 'shop', labelEn: 'Browse all products' },
      chips: ['توصيل لكل المحافظات', 'الدفع عند الاستلام', c ? `عمولة ${c} د.ك` : 'عمولة مقترحة واضحة'],
      chipsEn: ['Delivery all Kuwait', 'Cash on delivery', c ? `${c} KWD commission` : 'Clear suggested commission'],
    };
  })];

  v.slides = newSlides;
  await db.siteSetting.update({ where: { key: 'hero_slider' }, data: { value: v } });
  console.log('✅ hero_slider updated:', newSlides.map((s) => s.id).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
