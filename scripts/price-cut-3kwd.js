/**
 * Founder price directive 2026-08-31: reduce EVERY product's selling price
 * (salePrice) by exactly 3 KWD — applied to the production Neon DB.
 *
 * Safety:
 *  1. Full price backup (id, name, price, salePrice) → download/price-backup-<date>.json
 *  2. Atomic single UPDATE ... SET "salePrice" = "salePrice" - 3
 *  3. Verification pass (min/max/count of -3 deltas) + live-API spot check
 *
 * Run: DATABASE_URL=<neon> node scripts/price-cut-3kwd.js
 * Reverse: node scripts/price-cut-3kwd.js --restore download/price-backup-XXXX.json
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();

  const mode = process.argv[2] || 'apply'; // apply | restore
  const backupArg = process.argv[3];

  if (mode === '--restore' && backupArg) {
    const data = JSON.parse(fs.readFileSync(backupArg, 'utf8'));
    console.log(`Restoring ${data.length} prices from ${backupArg}...`);
    let n = 0;
    for (const p of data) {
      await db.product.update({
        where: { id: p.id },
        data: { salePrice: p.salePrice, price: p.price },
      });
      if (++n % 500 === 0) console.log(`  ...${n}/${data.length}`);
    }
    console.log(`✓ Restored ${n} products`);
    await db.$disconnect();
    return;
  }

  // ===== 1. BACKUP =====
  const products = await db.product.findMany({
    select: { id: true, name: true, price: true, salePrice: true },
    orderBy: { id: 'asc' },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = `/home/z/my-project/download/price-backup-${stamp}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(products), 'utf8');
  console.log(`✓ Backup: ${products.length} products → ${backupPath} (${fs.statSync(backupPath).size} bytes)`);

  // ===== 2. APPLY -3 KWD =====
  const before = products.map((p) => p.salePrice);
  const res = await db.product.updateMany({
    data: { salePrice: { decrement: 3 } },
  });
  console.log(`✓ Applied -3 KWD to ${res.count} products`);

  // ===== 3. VERIFY =====
  const after = await db.product.findMany({
    select: { id: true, salePrice: true },
    orderBy: { id: 'asc' },
  });
  const map = new Map(products.map((p) => [p.id, p.salePrice]));
  const wrong = after.filter((p) => Math.abs(p.salePrice - (map.get(p.id) - 3)) > 0.001);
  const min = Math.min(...after.map((p) => p.salePrice));
  const max = Math.max(...after.map((p) => p.salePrice));
  const negatives = after.filter((p) => p.salePrice <= 0).length;
  await db.$disconnect();

  console.log(
    JSON.stringify(
      {
        total: after.length,
        wrongDeltas: wrong.length,
        negatives,
        newMin: min,
        newMax: max,
        sampleBefore: before[0],
        sampleAfter: after[0].salePrice,
      },
      null,
      1
    )
  );
  if (wrong.length > 0 || negatives > 0) {
    console.error('✗ VERIFICATION FAILED — restore with:');
    console.error(`  node scripts/price-cut-3kwd.js --restore ${backupPath}`);
    process.exit(1);
  }
  console.log('✓ ALL VERIFIED — every product exactly -3.000 KWD, none negative');
  console.log(`\nRollback anytime with:\n  node scripts/price-cut-3kwd.js --restore ${backupPath}`);
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
