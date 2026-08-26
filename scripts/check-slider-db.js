/** Direct DB check of the hero_slider setting (uses the same resolve logic as the app). */
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

// mirror src/lib/db.ts: NEON first
function resolveUrl(raw) {
  if (!raw) return raw;
  let url = raw;
  if (url.includes('pooler.region.aws.neon.tech') && !url.includes('?')) {
    url += '?sslmode=require';
  } else if (url.includes('pooler.region.aws.neon.tech') && !url.includes('sslmode')) {
    url += '&sslmode=require';
  }
  if (process.env.NEON_DATABASE_URL) {
    let n = process.env.NEON_DATABASE_URL;
    if (n.includes('pooler') && !n.includes('sslmode')) {
      n += (n.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    url = n;
  }
  return url;
}

const prisma = new PrismaClient({
  datasources: { db: { url: resolveUrl(process.env.DATABASE_URL) } },
});

async function main() {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'hero_slider' } });
  if (!row) {
    console.log('NO ROW — defaults will serve');
    return;
  }
  const v = JSON.parse(JSON.stringify(row.value));
  console.log('DB slides:', v.slides?.length, '| autoplay:', v.autoplayMs);
  (v.slides || []).forEach((s, i) => console.log(i + 1, s.title.slice(0, 40), '| img:', s.image ? '✓' : '✗'));
}

main().catch((e) => { console.error('ERR:', e.message.slice(0, 200)); process.exit(1); }).finally(() => prisma.$disconnect());
