/* eslint-disable @typescript-eslint/no-require-imports */
/** Phase-2 fix: soldCount sync + demandRank via batched raw SQL (Neon pool safe). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL =
  process.env.NEON_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

(async () => {
  const t0 = Date.now();
  /* reviews per product (seeded + real customer reviews) */
  const grouped = await p.review.groupBy({
    by: ['productId'],
    _count: { _all: true },
  });
  const realSold = await p.orderItem.groupBy({
    by: ['productId'],
    where: { order: { status: { notIn: ['cancelled', 'pending_payment'] } } },
    _sum: { quantity: true },
  });
  const realMap = new Map(realSold.map((r) => [r.productId, r._sum.quantity || 0]));
  const soldMap = new Map();
  for (const g of grouped) {
    soldMap.set(g.productId, Math.round(g._count._all * randInt(8, 18)) + randInt(0, 7) + (realMap.get(g.productId) || 0));
  }
  console.log('products with reviews:', soldMap.size);

  /* batched UPDATE ... FROM (VALUES ...) */
  const entries = [...soldMap.entries()];
  for (let i = 0; i < entries.length; i += 400) {
    const chunk = entries.slice(i, i + 400);
    const values = chunk.map(([id, sold]) => `('${id.replace(/'/g, "''")}', ${parseInt(sold, 10)})`).join(',');
    await p.$executeRawUnsafe(`UPDATE "Product" p SET "soldCount" = v.sold FROM (VALUES ${values}) AS v(id, sold) WHERE p.id = v.id`);
  }
  /* products without reviews → soldCount = real sold only */
  await p.$executeRawUnsafe(`
    UPDATE "Product" p SET "soldCount" = COALESCE(oi.qty, 0)
    FROM "Product" leftp
    LEFT JOIN (
      SELECT oi."productId" AS pid, SUM(oi.quantity) AS qty
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status NOT IN ('cancelled','pending_payment')
      GROUP BY oi."productId"
    ) oi ON oi.pid = leftp.id
    WHERE leftp."soldCount" > 0 AND leftp.id NOT IN (
      SELECT "productId" FROM "Review" GROUP BY "productId"
    ) AND leftp.id = p.id`);
  console.log('soldCount synced');

  /* ---- demand ranking ---- */
  const TIER_A = ['عطر','عود','بخور','مبخرة','ساعة ذكية','سماعات','سماعة','ايربودز','قلاية','خلاط','عصارة','مكنسة','شاحن','بنك طاقة','بطارية متنقلة','مجفف شعر','فرد شعر','تمليس','كاميرا مراقبة','قفل ذكي','بروجكتور','air fryer','smart','earbuds','led','usb'];
  const TIER_B = ['مروحة','جهاز تدليك','مساج','مسدل','حزام','مشد','ماكينة حلاقة','مزيل شعر','فرشاة','منظم','حافظة','تفريغ','ممسحة','نظارة','حقيبة','شنطة','لعبة','أطفال','طفل','دراجة','سكوتر','لمبة','مصباح','مقياس ضغط','ميزان','ترمو'];
  const TIER_C = ['سيارة','طقم','أدوات','مقص','سكين','زجاجة','رياضية','يوجا','دمبل','ساعة','خشب','بلاستيك'];

  const products = await p.product.findMany({
    where: { quantity: { gt: 0 }, images: { not: '' } },
    select: { id: true, name: true, isBestSeller: true, price: true, salePrice: true, images: true, soldCount: true, category: { select: { name: true } } },
  });
  const scored = products.map((pr) => {
    const hay = `${pr.name} ${pr.category?.name || ''}`.toLowerCase();
    let s = 0;
    if (TIER_A.some((k) => hay.includes(k))) s += 30;
    if (TIER_B.some((k) => hay.includes(k))) s += 16;
    if (TIER_C.some((k) => hay.includes(k))) s += 7;
    if (pr.isBestSeller) s += 26;
    if (pr.price > pr.salePrice) s += 10;
    const price = pr.salePrice || pr.price;
    if (price >= 2 && price <= 25) s += 8;
    s += Math.min(20, pr.soldCount / 40);
    if ((pr.images || '').split(',').filter(Boolean).length > 1) s += 4;
    return { id: pr.id, s };
  }).sort((a, b) => b.s - a.s).slice(0, 100);

  await p.product.updateMany({ where: { demandRank: { not: null } }, data: { demandRank: null } });
  for (let i = 0; i < scored.length; i += 100) {
    const chunk = scored.slice(i, i + 100);
    const values = chunk.map((sc, j) => `('${sc.id.replace(/'/g, "''")}', ${i + j + 1})`).join(',');
    await p.$executeRawUnsafe(`UPDATE "Product" p SET "demandRank" = v.rk FROM (VALUES ${values}) AS v(id, rk) WHERE p.id = v.id`);
  }
  console.log('demandRank assigned:', scored.length, '— top 5:', scored.slice(0, 5).map(s => s.id.slice(-6)).join(','));
  console.log('DONE in', Math.round((Date.now() - t0) / 1000), 's');
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
