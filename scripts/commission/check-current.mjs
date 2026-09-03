/**
 * فحص توزيع العمولات الحالية قبل التحديث إلى سقف 1–10 د.ك
 * Usage: export DATABASE_URL="$NEON_DATABASE_URL" && node scripts/commission/check-current.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const round05 = (n) => Math.round(n * 2) / 2;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

async function main() {
  const products = await db.product.findMany({
    select: {
      id: true,
      salePrice: true,
      commission: true,
      suggestedPrice: true,
      demandTier: true,
    },
  });

  const dist = {};
  for (const p of products) {
    const c = p.commission ?? 0;
    dist[c] = (dist[c] || 0) + 1;
  }
  console.log('=== CURRENT commission distribution ===');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(dist).sort((a, b) => a[0] - b[0])), null, 0));

  // preview new scale: clamp(round0.5(suggestedPrice - salePrice), 1, 10), fallback tier
  const fallback = { hot: 1.5, warm: 2.5, cold: 4 };
  const newDist = {};
  let changed = 0;
  let noSuggested = 0;
  for (const p of products) {
    let c;
    if (p.suggestedPrice != null && p.suggestedPrice > p.salePrice) {
      c = clamp(round05(p.suggestedPrice - p.salePrice), 1, 10);
    } else {
      c = fallback[p.demandTier] || 2;
      noSuggested++;
    }
    const key = String(c);
    newDist[key] = (newDist[key] || 0) + 1;
    if (Math.abs((p.commission || 0) - c) > 0.001) changed++;
  }
  console.log('=== PREVIEW new commission distribution (1–10 KWD) ===');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(newDist).sort((a, b) => a[0] - b[0])), null, 0));
  console.log(`products that will change: ${changed} / ${products.length} · fallback (no suggestedPrice): ${noSuggested}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
