import dotenv from "dotenv"; dotenv.config({ path: ".env", override: true });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('products:', await prisma.product.count());
  console.log('orders:', await prisma.order.count());
  console.log('admins:', await prisma.adminUser.count());
  const statuses = await prisma.$queryRawUnsafe<any[]>(`SELECT status, COUNT(*)::int as c FROM "Order" GROUP BY status`);
  console.log('status breakdown:', statuses);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
