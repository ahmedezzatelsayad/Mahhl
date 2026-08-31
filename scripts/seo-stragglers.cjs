/* Final stragglers patch: 6 missing metaTitle + 3 short metaDescription. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // 1) products with no metaTitle → build from name (+ category when short)
  const noTitle = await p.product.findMany({
    where: { OR: [{ metaTitle: null }, { metaTitle: '' }] },
    select: { id: true, name: true, category: { select: { name: true } } },
  });
  for (const it of noTitle) {
    let t = `${it.name} — شراء أونلاين في الكويت`;
    if (t.length > 55) t = it.name.slice(0, 54);
    if (t.length < 20 && it.category?.name) t = `${it.name} ${it.category.name}`.slice(0, 54);
    await p.product.update({ where: { id: it.id }, data: { metaTitle: t.slice(0, 60) } });
    console.log('title →', it.name.slice(0, 40), '::', t);
  }

  // 2) metaDescription under 80 chars → extend the close
  const shortMeta = await p.$queryRaw`
    SELECT id, "metaDescription" FROM "Product"
    WHERE "metaDescription" IS NOT NULL AND length("metaDescription") < 80`;
  for (const it of shortMeta) {
    let md = it.metaDescription.replace(/\s+/g, ' ').trim().replace(/[.،]?\s*$/, '');
    md = `${md} — دفع عند الاستلام وتوصيل سريع لكل محافظات الكويت.`;
    await p.product.update({ where: { id: it.id }, data: { metaDescription: md.slice(0, 178) } });
    console.log('meta extended →', md.length, 'chars');
  }

  const cov = await p.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE "metaTitle" IS NOT NULL AND length("metaTitle") >= 20) AS title_ok,
      COUNT(*) FILTER (WHERE "metaDescription" IS NOT NULL AND length("metaDescription") BETWEEN 80 AND 178) AS meta_ok,
      COUNT(*) FILTER (WHERE keywords IS NOT NULL AND keywords <> '') AS kw_ok
    FROM "Product"`;
  console.log('final coverage:', JSON.stringify(cov[0], (k, v) => (typeof v === 'bigint' ? Number(v) : v)));
  await p.$disconnect();
})();
