/**
 * تحديث العمولات المقترحة لكل المنتجات إلى نطاق 1–10 د.ك:
 *   العمولة المقترحة = clamp(round0.5(suggestedPrice - salePrice), 1, 10)
 *   (بدون سعر مقترح → حسب مستوى الطلب: hot 1.5 / warm 2.5 / cold 4)
 * العميل حر يختار عمولته في هذا النطاق (بمزاجه) — القيمة المخزنة اقتراح.
 *
 * Usage: export DATABASE_URL="$NEON_DATABASE_URL" && node scripts/commission/apply-1-10.mjs
 * Idempotent — آمن لإعادة التشغيل.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const round05 = (n) => Math.round(n * 2) / 2;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const FALLBACK = { hot: 1.5, warm: 2.5, cold: 4 };

async function main() {
  const products = await db.product.findMany({
    select: { id: true, salePrice: true, commission: true, suggestedPrice: true, demandTier: true },
  });

  let changed = 0;
  const dist = {};
  const updates = [];

  for (const p of products) {
    let c;
    if (p.suggestedPrice != null && p.suggestedPrice > p.salePrice) {
      c = clamp(round05(p.suggestedPrice - p.salePrice), 1, 10);
    } else {
      c = FALLBACK[p.demandTier] || 2;
    }
    const key = String(c);
    dist[key] = (dist[key] || 0) + 1;
    if (Math.abs((p.commission || 0) - c) > 0.001) {
      changed++;
      updates.push({ id: p.id, commission: c });
    }
  }

  console.log(`products: ${products.length} · to update: ${changed}`);
  console.log('new distribution:', JSON.stringify(Object.fromEntries(Object.entries(dist).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])))));

  // chunked updates to stay within pooler/transaction limits
  const CHUNK = 200;
  for (let i = 0; i < updates.length; i += CHUNK) {
    await Promise.all(
      updates.slice(i, i + CHUNK).map((u) =>
        db.product.update({ where: { id: u.id }, data: { commission: u.commission } })
      )
    );
    process.stdout.write(`\rupdated ${Math.min(i + CHUNK, updates.length)}/${updates.length}`);
  }
  console.log('\n✅ done — suggested commissions now span 1–10 KWD (marketer picks his own within range)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
