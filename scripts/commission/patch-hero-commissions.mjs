/**
 * ترقيع شرائح hero_slider: إعادة ربط كل شريحة منتج بمنتجها الفعلي (بالاسم)
 * وتحديث العمولة المقترحة والسعر من قاعدة البيانات.
 * Usage: export DATABASE_URL="$NEON_DATABASE_URL" && node scripts/commission/patch-hero-commissions.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const fmt = (n) => (Number.isInteger(n) ? `${n}.000` : `${n}`);

const MATCH = [
  { idPrefix: 'top1', contains: 'شمسية ذكية' },
  { idPrefix: 'top2', contains: 'بارديفيو' },
  { idPrefix: 'top3', contains: 'CYXG' },
];

async function main() {
  const row = await db.siteSetting.findUnique({ where: { key: 'hero_slider' } });
  if (!row) return console.log('no hero_slider row');
  const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

  for (const m of MATCH) {
    const slide = v.slides.find((s) => String(s.id).startsWith(m.idPrefix));
    if (!slide) continue;
    const p = await db.product.findFirst({
      where: { name: { contains: m.contains } },
      select: { slug: true, commission: true, salePrice: true },
    });
    if (!p) continue;
    const c = fmt(p.commission);
    slide.highlight = `عمولتك المقترحة: ${c} د.ك`;
    slide.highlightEn = `Suggested commission: ${c} KWD`;
    slide.subtitle = `هذا المنتج يبيع نفسه — سوّقه لجمهورك وأضف عمولتك (من 1 إلى 10 د.ك بمزاجك) فوق سعره (${fmt(p.salePrice)} د.ك). إحنا نشحن ونحصّل ونوصل العمولة لحسابك.`;
    slide.subtitleEn = `This one sells itself — market it to your audience and add your commission (1–10 KWD, your choice) on top of its ${fmt(p.salePrice)} KWD price. We ship, collect and pay your commission.`;
    slide.cta = { ...(slide.cta || {}), label: 'سوّقه واربح', labelEn: 'Market It & Earn', action: 'affiliate-login' };
    slide.cta.payload = p.slug; // keep the real product linkable in future edits
    slide.chips = ['توصيل لكل المحافظات', 'الدفع عند الاستلام', `عمولة ${c} د.ك`];
    slide.chipsEn = ['Delivery all Kuwait', 'Cash on delivery', `${c} KWD commission`];
  }

  await db.siteSetting.update({ where: { key: 'hero_slider' }, data: { value: v } });
  console.log('✅ patched:', v.slides.map((s) => `${s.id} → ${(s.highlight || '').slice(0, 40)}`).join(' | '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
