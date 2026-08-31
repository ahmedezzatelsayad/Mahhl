/* Audit current state of descriptions, SEO fields, and slugs (links). */
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();

const r = {};
r.total = await p.product.count();

// metaDescription coverage
r.metaSet = await p.product.count({ where: { NOT: [{ metaDescription: null }] } });
r.metaNonEmpty = await p.product.count({
  where: { metaDescription: { not: '' } },
});

// Description quality buckets (raw SQL — Prisma can't filter on length)
const buckets = await p.$queryRaw`
  SELECT
    COUNT(*) FILTER (WHERE description = '') AS empty,
    COUNT(*) FILTER (WHERE length(description) BETWEEN 1 AND 79) AS short,
    COUNT(*) FILTER (WHERE length(description) BETWEEN 80 AND 149) AS mid,
    COUNT(*) FILTER (WHERE length(description) BETWEEN 150 AND 399) AS good,
    COUNT(*) FILTER (WHERE length(description) BETWEEN 400 AND 1199) AS long_ish,
    COUNT(*) FILTER (WHERE length(description) >= 1200) AS too_long,
    COUNT(*) FILTER (WHERE description LIKE '%•%') AS bullety,
    COUNT(*) FILTER (WHERE description LIKE '%**%') AS markdown_left,
    COUNT(*) FILTER (WHERE "metaDescription" IS NULL OR "metaDescription" = '') AS meta_missing
  FROM "Product"`;
Object.assign(r, buckets[0]);

// Slug style audit (sample + patterns over all)
const all = await p.product.findMany({
  select: { id: true, slug: true, name: true, metaDescription: true, description: true, sku: true },
});
let arabicSlug = 0, latinSlug = 0, digitOnly = 0, tooLong = 0, suspicious = [];
for (const it of all) {
  const s = it.slug || '';
  if (/[\u0600-\u06FF]/.test(s)) arabicSlug++;
  else if (/^[a-z0-9-]+$/i.test(s)) latinSlug++;
  if (/^\d+$/.test(s)) digitOnly++;
  if (s.length > 80) tooLong++;
  if (suspicious.length < 25) {
    // generic / auto-generated-looking slugs
    if (/^(p|product|item|prod)[-]?\d+$/i.test(s) || s.length < 4 || /[A-Z]/.test(s) || /_%/.test(s)) {
      suspicious.push({ sku: it.sku, slug: s, name: it.name.slice(0, 60) });
    }
  }
}
r.slugArabic = arabicSlug;
r.slugLatin = latinSlug;
r.slugDigitOnly = digitOnly;
r.slugTooLong = tooLong;
r.slugSamples = suspicious.slice(0, 15);

// metaDescription quality (sample of ones set)
const metas = all.filter((x) => x.metaDescription && x.metaDescription.trim().length > 0).map((x) => ({ sku: x.sku, md: x.metaDescription.slice(0, 120), len: x.metaDescription.length }));
r.metaSamples = metas.slice(0, 10);
r.metaLenOver200 = metas.filter((m) => m.len > 200).length;
r.metaLenUnder60 = metas.filter((m) => m.len < 60).length;

// Random description samples (quality check)
const samples = await p.$queryRaw`
  SELECT sku, slug, name, left(description, 300) as dsn, length(description) as dlen
  FROM "Product"
  ORDER BY random()
  LIMIT 12`;
r.descSamples = samples;

// name lengths (title tag impact)
const nameLens = all.map((x) => x.name.length);
r.nameAvg = Math.round(nameLens.reduce((a, b) => a + b, 0) / nameLens.length);
r.nameOver60 = nameLens.filter((l) => l > 60).length;

console.log(JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 2));
await p.$disconnect();
