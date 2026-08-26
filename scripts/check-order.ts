import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const o = await db.order.findUnique({ where: { orderNumber: 'ORD-MTACT3DL' }, include: { items: true } });
  if (!o) { console.log('NOT FOUND'); return; }
  console.log(JSON.stringify({
    subtotal: o.subtotal, shipping: o.shipping, total: o.total,
    itemPrice: o.items[0]?.price, phone: o.phone, governorate: o.governorate,
    arrivalNote: o.arrivalNote, utmSource: o.utmSource, status: o.status
  }, null, 1));
}
main().finally(() => db.$disconnect());
