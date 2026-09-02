import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const affs = await prisma.affiliate.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { phone: true, name: true, code: true, status: true } });
  console.log(JSON.stringify(affs, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
