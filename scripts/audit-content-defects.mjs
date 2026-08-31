// Count visible content-quality defects across catalog
import { PrismaClient } from '@prisma/client';

const NEON_URL =
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://neondb_owner:npg_9ozjdwE8rAqc@ep-bitter-base-axq48ptq-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = NEON_URL;

const prisma = new PrismaClient();

const run = async () => {
  const checks = {
    markdownBold: await prisma.product.count({ where: { description: { contains: '**' } } }),
    mdPrefix: await prisma.product.count({ where: { description: { startsWith: 'وصف المنتج' } } }),
    mdPrefixMid: await prisma.product.count({ where: { description: { contains: 'وصف المنتج :' } } }),
    numberedList: await prisma.product.count({ where: { description: { contains: '1. ' } } }),
    englishDesc: await prisma.product.count({
      where: { description: { contains: 'the' } },
    }),
    nameNoise: await prisma.product.count({ where: { name: { contains: '، 1 قطعة' } } }),
    nameDots: await prisma.product.count({ where: { name: { contains: '...' } } }),
  };
  console.log(JSON.stringify(checks, null, 2));

  // Names with model-number noise (AliExpress style long names)
  const longNames = await prisma.product.count({ where: { name: { gte: '71' } } });
  console.log('names >= 71 chars:', longNames);

  const samples = await prisma.product.findMany({
    where: { description: { contains: '**' } },
    take: 2,
    select: { name: true, description: true },
  });
  for (const s of samples) {
    console.log('\n---', s.name);
    console.log(s.description.slice(0, 400));
  }
};

run()
  .catch((e) => console.error(e.message))
  .finally(() => prisma.$disconnect());
