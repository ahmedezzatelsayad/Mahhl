/**
 * Align the live DB settings with the publicly advertised policy:
 *  - shipping: 1 KWD flat, free from 50 KWD (site copy, FAQ, llms.txt all say this)
 *  - ga4: disabled by default (founder enables from the admin panel)
 * Also prints the current values for verification.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 1. Shipping — force the advertised policy
  await db.siteSetting.upsert({
    where: { key: 'shipping' },
    update: { value: { price: 1, freeThreshold: 50, note: '' } },
    create: { key: 'shipping', value: { price: 1, freeThreshold: 50, note: '' } },
  });

  // 2. Show all settings for the record
  const rows = await db.siteSetting.findMany({ orderBy: { key: 'asc' } });
  for (const r of rows) {
    const v = JSON.stringify(r.value);
    console.log(`${r.key}: ${v.length > 90 ? v.slice(0, 90) + '…' : v}`);
  }
  console.log('\n✅ shipping policy = 1 KWD / free ≥ 50 KWD');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
