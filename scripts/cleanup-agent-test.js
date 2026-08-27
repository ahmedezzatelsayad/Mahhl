/* Clean up AI-agent test order + test customer (keep production data clean) */
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // delete only orders created by this test session on the test phone
  const orders = await db.order.findMany({
    where: { phone: '55123999' },
    select: { id: true, orderNumber: true, customerId: true },
  });
  for (const o of orders) {
    await db.orderItem.deleteMany({ where: { orderId: o.id } });
    await db.order.delete({ where: { id: o.id } });
    console.log('deleted order', o.orderNumber);
  }
  const custs = await db.customer.findMany({ where: { phone: '55123999' } });
  for (const c of custs) {
    await db.customer.delete({ where: { id: c.id } });
    console.log('deleted customer', c.id);
  }
  console.log('cleanup done');
  await db.$disconnect();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
