/**
 * Test Prisma connection to Neon PostgreSQL
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const NEON_URL =
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://neondb_owner:npg_9ozjdwE8rAqc@ep-bitter-base-axq48ptq-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = NEON_URL;

const prisma = new PrismaClient({ log: ['error', 'warn', 'info'] });

async function main() {
  console.log('→ Connecting to Neon...');
  console.log('  URL prefix:', NEON_URL.slice(0, 40));
  const catCount = await prisma.category.count();
  console.log('  ✓ Categories in Neon:', catCount);
  const prodCount = await prisma.product.count();
  console.log('  ✓ Products in Neon:', prodCount);
  const adminCount = await prisma.adminUser.count();
  console.log('  ✓ Admins in Neon:', adminCount);
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('✗ FAILED:', e.message);
    prisma.$disconnect().finally(() => process.exit(1));
  });
