import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const row = await db.siteSetting.findUnique({ where: { key: 'seo' } });
if (!row) {
  console.log('NO seo row in DB → defaults will be used');
} else {
  const v = row.value;
  console.log('DB seo settings:');
  console.log('  siteTitle   :', v.siteTitle);
  console.log('  description :', String(v.description).slice(0, 90));
  console.log('  keywords    :', String(v.keywords).slice(0, 90));
}
await db.$disconnect();
