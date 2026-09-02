import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.product.updateMany({
    where: { sku: { in: ['kit-0010', 'kit-0011'] } },
    data: { commission: 0 },
  });
  console.log('reset:', res.count);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
