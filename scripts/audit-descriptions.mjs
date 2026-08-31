// Audit product descriptions for AliExpress machine-translation garbage
import { PrismaClient } from '@prisma/client';

const NEON_URL =
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://neondb_owner:npg_9ozjdwE8rAqc@ep-bitter-base-axq48ptq-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = NEON_URL;

const prisma = new PrismaClient();

// Known AliExpress boilerplate phrases (AR machine-translation artifacts)
const GARBAGE = [
  'أداء لا مثيل له',
  'اداء لا مثيل له',
  'معبأة مع الميزات',
  'معبأة بالميزات',
  'سيكون هذا المنتج اختيارًا ممتازًا',
  'سيكون هذا المنتج اختيارا ممتازا',
  'اختيارًا ممتازًا لك',
  'ممتازًا لك',
  'منتج ممتاز',
  'جودة عالية',
  'مواد منتقاة',
  'سعة كبيرة',
  'تصميم عصري',
  'حماية مثالية',
  'مثالية للسلامة',
  'أداء ممتاز',
];

const run = async () => {
  const total = await prisma.product.count();
  console.log('total products:', total);

  // sample-based estimate then exact count for top garbage phrases
  const exact = {};
  for (const g of GARBAGE.slice(0, 8)) {
    const c = await prisma.product.count({ where: { description: { contains: g } } });
    if (c > 0) exact[g] = c;
  }
  console.log('exact garbage counts:', JSON.stringify(exact, null, 2));

  const anyGarbage = await prisma.product.count({
    where: { OR: GARBAGE.slice(0, 8).map((g) => ({ description: { contains: g } })) },
  });
  console.log('products with ANY of top-8 garbage phrases:', anyGarbage, `(${((anyGarbage / total) * 100).toFixed(1)}%)`);

  // Length profile
  const short = await prisma.product.count({ where: { description: { lt: '60' } } });
  console.log('descriptions < 60 chars:', short);

  // Broader quality signals: robotic phrases common in machine-translated listings
  const ROBOTIC = ['مثالي', 'مثالية', 'مناسبة لجميع', 'بشكل كبير', 'باستخدام', 'من السهل', 'من السهل جدا', 'بشكل فعال', 'اجعل حياتك', 'الحياة أسهل', 'في أي وقت', 'كما تريد', 'كما تشاء'];
  const roboticCounts = {};
  let anyRobotic = 0;
  for (const r of ROBOTIC) {
    const c = await prisma.product.count({ where: { description: { contains: r } } });
    roboticCounts[r] = c;
    anyRobotic += c;
  }
  console.log('robotic phrase counts:', JSON.stringify(roboticCounts, null, 2));
  console.log('sum (overlapping):', anyRobotic);

  // Sample 5 random descriptions for eyeballing
  const samples = await prisma.product.findMany({
    take: 5,
    skip: Math.floor(Math.random() * 2000),
    select: { name: true, description: true },
  });
  for (const s of samples) {
    console.log('\n--- SAMPLE:', s.name);
    console.log((s.description || '').slice(0, 300));
  }
};

run()
  .catch((e) => console.error(e.message))
  .finally(() => prisma.$disconnect());
