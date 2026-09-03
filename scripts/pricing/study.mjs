/**
 * Kuwait Market Study Engine — محرك دراسة السوق الكويتي
 * =====================================================
 * For EVERY product computes and stores:
 *   suggestedPrice : سعر البيع المقترح (KWD) — نفسي .500/.900 + هامش سوق الكويت
 *   demandTier     : hot / warm / cold (percentile 30/40/30 على درجة الطلب)
 *   adChannel      : أنسب قناة إعلانية بالكويت حسب الفئة
 *   studyNote      : ملاحظة تسويقية عربية قصيرة لكل منتج
 *
 * Idempotent — safe to re-run:
 *   set -a; source .env; set +a
 *   export DATABASE_URL="$NEON_DATABASE_URL"
 *   node scripts/pricing/study.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ===== أنسب قناة إعلانية حسب الفئة (خريطة سلوك السوق الكويتي) =====
const CHANNEL_RULES = [
  { kw: ['صحة والجمال', 'جمال'], channel: 'instagram' },
  { kw: ['أحزمة', 'مشدات', 'رياضة', 'رياضية'], channel: 'instagram' },
  { kw: ['مطبخ', 'منزل', 'كهربائية', 'مفروشات', 'مصابيح', 'أرضيات', 'رفوف'], channel: 'snapchat' },
  { kw: ['كترونيات'], channel: 'tiktok' },
  { kw: ['شخصية', 'حلاقة', 'شعر'], channel: 'tiktok' },
  { kw: ['سيارة'], channel: 'tiktok' },
  { kw: ['ألعاب', 'العاب'], channel: 'tiktok' },
  { kw: ['عدد وأدوات', 'أدوات', 'عدد'], channel: 'tiktok' },
  { kw: ['طبية', 'بخاخات', 'اصقات', 'كريمات', 'مراهم', 'تدليك'], channel: 'whatsapp' },
];

const CHANNEL_AR = {
  snapchat: 'سناب شات',
  tiktok: 'تيك توك',
  instagram: 'إنستقرام',
  whatsapp: 'واتساب',
};

function channelFor(categoryName) {
  const name = categoryName || '';
  for (const r of CHANNEL_RULES) {
    if (r.kw.some((k) => name.includes(k))) return r.channel;
  }
  return 'snapchat'; // الافتراضي: سناب شات الأقوى محلياً في الكويت
}

// ===== درجة الطلب (نفس منطق محرك العمولات) =====
function demandScore(p, rev) {
  let s = 0;
  if (p.isBestSeller) s += 25;
  if (p.demandRank != null) s += Math.max(0, 0.25 * (101 - p.demandRank));
  s += Math.min(15, (p.soldCount || 0) / 100);
  if (rev) {
    s += Math.min(15, rev.count / 10);
    if (rev.avg >= 4.5) s += 8;
    else if (rev.avg >= 4.0) s += 5;
    else if (rev.avg >= 3.5) s += 2;
  }
  if (p.price > p.salePrice && p.price > 0) {
    s += Math.min(10, ((p.price - p.salePrice) / p.price) * 3);
  }
  if (p.thumb) s += 2;
  if (!p.trackStock || p.quantity > 0) s += 5;
  if (p.salePrice >= 2.5 && p.salePrice <= 10) s += 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ===== سعر البيع المقترح — سوق الكويت =====
// عوامل: هامش تجزئة واقعي يتناقص مع السعر + نهايات نفسية (.500/.900)
// + حد أدنى هامش 1.000 د.ك فوق سعر المنصة.
function suggestedKuwaitPrice(salePrice) {
  let target;
  if (salePrice < 2) target = salePrice + 1.5;
  else if (salePrice < 5) target = salePrice * 1.5;
  else if (salePrice < 12) target = salePrice * 1.4;
  else if (salePrice < 30) target = salePrice * 1.33;
  else if (salePrice < 80) target = salePrice * 1.27;
  else target = salePrice * 1.2;

  // نهاية نفسية: أقرب .500 أو .900
  const f = Math.floor(target);
  const cands = [f + 0.5, f + 0.9, f + 1.5];
  let best = cands[0];
  for (const c of cands) {
    if (Math.abs(c - target) < Math.abs(best - target)) best = c;
  }
  // حد أدنى: هامش حقيقي 1 د.ك فوق سعر المنصة
  return Math.max(Math.round(best * 1000) / 1000, Math.ceil((salePrice + 1) * 2) / 2);
}

function studyNoteFor(tier, channelAr, suggested, margin) {
  const priceTxt = `${suggested.toFixed(3)} د.ك`;
  const marginTxt = `${margin.toFixed(3)} د.ك`;
  if (tier === 'hot')
    return `الطلب عليه عالي 🔥 — سوقه سريع في الكويت. اعرضه بسعر ${priceTxt} (هامشك ≈ ${marginTxt} فوق سعر المنصة) وابدأ حملة قصيرة على ${channelAr} بفيديو يبين الاستخدام الحقيقي.`;
  if (tier === 'warm')
    return `طلب جيد ومنافسة معقولة ⚖️ — مناسب للبداية. سعّره عند ${priceTxt} (هامش ≈ ${marginTxt}) وجرّب إعلان ${channelAr} مع إبراز الدفع عند الاستلام والتوصيل السريع.`;
  return `منتج تخصصي (نيتش) 💎 — منافسته أقل وأرباحه أعلى. موجّه لجمهور محدد: سعّره ${priceTxt} (هامش ≈ ${marginTxt}) واعرضه على ${channelAr} لمجتمع مهتم بهذا النوع.`;
}

async function main() {
  console.log('⏳ جلب المنتجات والتقييمات...');
  const [products, revAgg] = await Promise.all([
    db.product.findMany({
      select: {
        id: true, price: true, salePrice: true, thumb: true,
        quantity: true, trackStock: true, isBestSeller: true,
        demandRank: true, soldCount: true, commission: true,
        category: { select: { name: true } },
      },
    }),
    db.review.groupBy({
      by: ['productId'],
      where: { isApproved: true },
      _count: { _all: true },
      _avg: { rating: true },
    }),
  ]);

  const revMap = new Map(
    revAgg.map((r) => [r.productId, { count: r._count._all, avg: r._avg.rating || 0 }])
  );

  console.log(`📊 ${products.length} منتج — حساب الدرجات...`);
  const scored = products.map((p) => ({
    ...p,
    score: demandScore(p, revMap.get(p.id)),
  }));

  // percentile 30/40/30
  scored.sort((a, b) => b.score - a.score);
  const n = scored.length;
  const hotCut = Math.floor(n * 0.3);
  const warmCut = Math.floor(n * 0.7);

  const dist = { hot: 0, warm: 0, cold: 0 };
  const channelDist = {};
  const margins = [];

  const updates = scored.map((p, i) => {
    const tier = i < hotCut ? 'hot' : i < warmCut ? 'warm' : 'cold';
    const channel = channelFor(p.category?.name);
    const suggested = suggestedKuwaitPrice(p.salePrice);
    const margin = Math.max(0, Math.round((suggested - p.salePrice) * 1000) / 1000);
    const note = studyNoteFor(tier, CHANNEL_AR[channel], suggested, margin);

    dist[tier]++;
    channelDist[channel] = (channelDist[channel] || 0) + 1;
    margins.push(margin);

    return db.product.update({
      where: { id: p.id },
      data: {
        suggestedPrice: suggested,
        demandTier: tier,
        adChannel: channel,
        studyNote: note,
      },
    });
  });

  // تنفيذ على دفعات
  console.log('💾 كتابة النتائج في قاعدة البيانات...');
  const CHUNK = 250;
  for (let i = 0; i < updates.length; i += CHUNK) {
    await db.$transaction(updates.slice(i, i + CHUNK));
    process.stdout.write(`   ${Math.min(i + CHUNK, updates.length)}/${updates.length}\r`);
  }
  console.log('');

  // تقرير
  margins.sort((a, b) => a - b);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  const report = {
    generatedAt: new Date().toISOString(),
    totalProducts: n,
    demandDistribution: dist,
    channelDistribution: channelDist,
    suggestedMargin: {
      avg: Math.round(avg(margins) * 1000) / 1000,
      median: margins[Math.floor(margins.length / 2)],
      min: margins[0],
      max: margins[margins.length - 1],
    },
    priceRules: '<2KWD:+1.5 | 2-5:×1.5 | 5-12:×1.4 | 12-30:×1.33 | 30-80:×1.27 | 80+:×1.2 → snap .500/.900',
  };
  const fs = await import('fs');
  fs.writeFileSync(
    new URL('./report.json', import.meta.url),
    JSON.stringify(report, null, 2)
  );
  console.log('\n✅ اكتملت الدراسة:');
  console.log('   توزيع الطلب:', dist);
  console.log('   توزيع القنوات:', channelDist);
  console.log('   متوسط الهامش المقترح:', report.suggestedMargin.avg, 'د.ك | وسيط:', report.suggestedMargin.median);
  console.log('   التقرير: scripts/pricing/report.json');
}

main()
  .catch((e) => {
    console.error('❌ فشل:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
