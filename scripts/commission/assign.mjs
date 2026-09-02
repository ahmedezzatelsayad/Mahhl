/**
 * assign.mjs — محرك تخصيص عمولة كل منتج (1–2 د.ك) حسب تنافسيته.
 *
 * المنطق التجاري:
 *  - المنتجات الأكثر تنافسية (أكثر مبيعاً/طلبًا/تقييمات) "بتبيع نفسها"
 *    → عمولة 1.0 د.ك مع حجم مبيعات كبير للمسوق.
 *  - المنتجات المتوسطة → 1.5 د.ك.
 *  - المنتجات الـنيش/الأصعب في البيع (سعر أعلى، إشارات طلب أضعف) → 2.0 د.ك
 *    كحوافز أقوى للمسوق لدفعها.
 *  - حماية الهامش: أي منتج أرخص من 3 د.ك لا يأخذ 2 د.ك.
 *
 * التقييم (0-100) يعتمد إشارات حقيقية من القاعدة:
 *   isBestSeller / demandRank / soldCount / عدد ومتوسط التقييمات المعتمدة /
 *   عمق الخصم / وجود صورة / التوفر / نطاق السعر الشرائي (2.5-10 د.ك).
 *
 * التوزيع النهائي percentile-based (30% HOT / 40% WARM / 30% NICHE)
 * لضمان انتشار صحي عبر الكتالوج كله.
 *
 * التشغيل:  set -a; source .env; set +a; node scripts/commission/assign.mjs
 * (idempotent — يعيد الحساب من الإشارات الحالية في كل مرة)
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const TIER_LABEL = { HOT: '1.000', WARM: '1.500', NICHE: '2.000' };

function scoreProduct(p, approvedAgg) {
  let s = 0;
  if (p.isBestSeller) s += 25;

  if (p.demandRank != null) s += Math.max(0, 0.25 * (101 - p.demandRank)); // rank1=+25 … rank100=0

  s += Math.min(15, (p.soldCount || 0) / 100);

  const rev = approvedAgg.get(p.id);
  if (rev) {
    s += Math.min(15, rev.count / 10); // 150 تقييم → +15
    if (rev.avg >= 4.5) s += 8;
    else if (rev.avg >= 4.0) s += 5;
    else if (rev.avg >= 3.5) s += 2;
  }

  if (p.price > p.salePrice && p.price > 0) {
    const pct = ((p.price - p.salePrice) / p.price) * 100;
    s += Math.min(10, pct / 3);
  }

  if (p.thumb) s += 2;

  const inStock = !p.trackStock || p.quantity > 0;
  if (inStock) s += 5;

  if (p.salePrice >= 2.5 && p.salePrice <= 10) s += 5; // نطاق الشراء الاستهلاكي في الكويت

  return Math.max(0, Math.min(100, Math.round(s)));
}

async function main() {
  const products = await db.product.findMany({
    select: {
      id: true, price: true, salePrice: true, thumb: true,
      quantity: true, trackStock: true, isBestSeller: true,
      demandRank: true, soldCount: true, disableOOS: true,
    },
  });

  const revAgg = await db.review.groupBy({
    by: ['productId'],
    where: { isApproved: true },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const approvedAgg = new Map(
    revAgg.map((r) => [r.productId, { count: r._count._all, avg: r._avg.rating || 0 }])
  );

  const scored = products.map((p) => ({
    id: p.id,
    salePrice: p.salePrice,
    score: scoreProduct(p, approvedAgg),
  }));

  // percentile tiers: 30% / 40% / 30% by score desc
  scored.sort((a, b) => b.score - a.score);
  const n = scored.length;
  const hotCut = Math.floor(n * 0.3);
  const warmCut = Math.floor(n * 0.7);

  const assign = scored.map((row, i) => {
    let tier = i < hotCut ? 'HOT' : i < warmCut ? 'WARM' : 'NICHE';
    let commission = tier === 'HOT' ? 1.0 : tier === 'WARM' ? 1.5 : 2.0;
    // حماية الهامش: منتج رخيص (< 3 د.ك) لا يحمل عمولة 2 د.ك
    if (row.salePrice < 3 && commission > 1.5) {
      commission = 1.5;
      tier = 'WARM';
    }
    return { ...row, tier, commission };
  });

  const dist = { HOT: 0, WARM: 0, NICHE: 0 };
  for (const a of assign) dist[a.tier]++;

  console.log(`المنتجات: ${n}`);
  console.log(`HOT  → 1.0 د.ك : ${dist.HOT} (${((dist.HOT / n) * 100).toFixed(1)}%)`);
  console.log(`WARM → 1.5 د.ك : ${dist.WARM} (${((dist.WARM / n) * 100).toFixed(1)}%)`);
  console.log(`NICHE→ 2.0 د.ك : ${dist.NICHE} (${((dist.NICHE / n) * 100).toFixed(1)}%)`);

  // متوسط العمولة المرجّح بالسعر (sanity check على الهامش)
  const totalComm = assign.reduce((s, a) => s + a.commission, 0);
  console.log(`متوسط العمولة: ${(totalComm / n).toFixed(3)} د.ك`);
  const cheapest = [...assign].sort((a, b) => a.salePrice - b.salePrice).slice(0, 5);
  console.log('أرخص 5 منتجات:', cheapest.map((c) => `${c.salePrice.toFixed(2)}→${c.commission}`).join(' | '));

  // تحديث القاعدة على دفعات
  for (const tier of ['HOT', 'WARM', 'NICHE']) {
    const ids = assign.filter((a) => a.tier === tier).map((a) => a.id);
    const value = tier === 'HOT' ? 1.0 : tier === 'WARM' ? 1.5 : 2.0;
    for (let i = 0; i < ids.length; i += 400) {
      const chunk = ids.slice(i, i + 400);
      await db.product.updateMany({ where: { id: { in: chunk } }, data: { commission: value } });
    }
    console.log(`تم تحديث ${ids.length} منتج بعمولة ${TIER_LABEL[tier]}`);
  }

  // تقرير للتدقيق
  const report = {
    generatedAt: new Date().toISOString(),
    model: 'percentile 30/40/30 on competitiveness score (bestseller, demandRank, soldCount, reviews, discount, stock, price-band) + margin guard <3 KWD',
    distribution: dist,
    avgCommission: Number((totalComm / n).toFixed(3)),
  };
  const fs = await import('fs');
  fs.writeFileSync(new URL('./report.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log('✓ report.json');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
