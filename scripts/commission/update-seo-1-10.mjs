/**
 * تحديث صف SEO في إنتاج Neon لهوية «منصة افلييت — عمولات 1–10 د.ك».
 * Usage: export DATABASE_URL="$NEON_DATABASE_URL" && node scripts/commission/update-seo-1-10.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DESCRIPTION =
  'محل شوب — أول منصة دروب شيبنج في الكويت للتسويق بالعمولة (لا بيع مباشر). سوّق أكثر من 2600 منتج وكل منتج عليه عمولة مقترحة من 1 إلى 10 د.ك تختارها بمزاجك — بدون رأس مال وبدون هم الشحن، وطلبات عملائك توصلهم بتوصيل سريع لكل المحافظات مع الدفع عند الاستلام.';

const KEYWORDS =
  'دروب شيبنج الكويت, منصة دروب شيبنج, ربح من الانترنت الكويت, تسويق بالعمولة الكويت, عمولات المسوقين, عمولة 10 دينار, dropshipping Kuwait, affiliate program Kuwait, محل شوب, دفع عند الاستلام الكويت, توصيل الكويت, دروب شيبنج بدون رأس مال, سوشيال ميديا ماركتنج الكويت';

async function main() {
  const row = await db.siteSetting.findUnique({ where: { key: 'seo' } });
  if (!row) {
    console.log('seo row not found — nothing to update (defaults in code are already correct)');
    return;
  }
  const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
  value.description = DESCRIPTION;
  value.keywords = KEYWORDS;
  // keep siteTitle/siteUrl/verification as-is
  await db.siteSetting.update({
    where: { key: 'seo' },
    data: { value },
  });
  console.log('✅ seo row updated: description + keywords now carry the 1–10 KWD affiliate-only identity');
  console.log('description:', value.description);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
