/**
 * Cleanup E2E test data from production DB (honest-content policy).
 * Removes: test affiliate + their orders/entries/withdrawals, resets the
 * commissions that were set on random products back to 0.
 *
 * Run: bunx tsx scripts/commission/cleanup-test.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. find test affiliates (name "مسوق تجريبي" or phone from the test)
  const testAffs = await prisma.affiliate.findMany({
    where: { OR: [{ name: 'مسوق تجريبي' }, { phone: '56305316' }] },
    select: { id: true, phone: true, code: true },
  });
  console.log('test affiliates:', testAffs);

  for (const aff of testAffs) {
    // orders attributed to this affiliate (portal + checkout-code test)
    const orders = await prisma.order.findMany({
      where: { affiliateId: aff.id },
      select: { id: true, orderNumber: true },
    });
    console.log(`affiliate ${aff.code}: ${orders.length} orders to delete`);

    // delete orders (items/withdrawal-orders cascade), entries cascade via affiliate
    for (const o of orders) {
      await prisma.order.delete({ where: { id: o.id } }).catch((e) => console.log('order del err', e.message));
    }
    // customers auto-created by these orders (phones used in the test)
    for (const phone of ['55123999', '55123888', '55123777']) {
      await prisma.customer.deleteMany({ where: { phone } });
    }
    // ledger + withdrawals cascade from affiliate delete
    await prisma.affiliate.delete({ where: { id: aff.id } });
    console.log(`deleted affiliate ${aff.code}`);
  }

  // 2. reset commissions set by the test on random products
  const res = await prisma.product.updateMany({
    where: { commission: { in: [1.5, 2] }, soldCount: 0, isBestSeller: false },
    data: { commission: 0 },
  });
  console.log('product commissions reset:', res.count);
  console.log('✓ cleanup done');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
