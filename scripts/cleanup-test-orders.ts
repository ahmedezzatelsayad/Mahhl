/** Remove E2E test orders/customers created by e2e-orders-test.ts */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const testNames = ['اختبار آلي', 'مخادع', 'طلب كبير', 'بوت', 'هاتف خاطئ', 'محافظة وهمية', 'جامح', 'مخترع'];
  let deletedOrders = 0;

  const orders = await db.order.findMany({
    where: { customerName: { in: testNames } },
    select: { id: true, customerId: true },
  });

  for (const o of orders) {
    await db.orderItem.deleteMany({ where: { orderId: o.id } });
    await db.order.delete({ where: { id: o.id } });
    deletedOrders++;
    // remove the auto-created test customer too
    const remaining = await db.order.count({ where: { customerId: o.customerId } });
    if (remaining === 0) {
      await db.customer.deleteMany({ where: { id: o.customerId } });
    }
  }
  console.log(`🗑️  حُذف ${deletedOrders} طلب اختباري وعملاؤه`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
