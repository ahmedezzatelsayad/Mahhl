import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// 1) List all SiteSetting keys + preview identity-related ones
const rows = await db.siteSetting.findMany({ select: { key: true } });
console.log('SiteSetting keys:', rows.map((r) => r.key).join(', '));

for (const k of ['site-identity', 'brand']) {
  const r = await db.siteSetting.findUnique({ where: { key: k } });
  if (r) console.log(`\n[${k}] =`, JSON.stringify(r.value).slice(0, 300));
}

// 2) Update the stored seo row to the new platform identity
//    (keeps siteUrl + verification codes untouched)
const current = await db.siteSetting.findUnique({ where: { key: 'seo' } });
if (!current) {
  console.log('\nNo seo row — nothing to update (defaults already new).');
} else {
  const v = current.value;
  const next = {
    ...v,
    siteTitle: 'محل شوب | منصة دروب شيبنج رقم 1 في الكويت',
    titleTemplate: v.titleTemplate || '%s | محل شوب',
    description:
      'محل شوب — أول منصة دروب شيبنج في الكويت. سوّق أكثر من 2600 منتج واربح عمولة من 1 إلى 2 د.ك على كل طلب يوصَل، بدون رأس مال وبدون هم الشحن. ولعملائنا: أسعار بالدينار الكويتي، توصيل سريع لجميع المحافظات، ودفع عند الاستلام.',
    keywords:
      'دروب شيبنج الكويت, منصة دروب شيبنج, ربح من الانترنت الكويت, تسويق بالعمولة الكويت, عمولات المسوقين, dropshipping Kuwait, محل شوب, تسوق اونلاين الكويت, شراء اونلاين, دفع عند الاستلام الكويت, توصيل الكويت, عروض الكويت, خصومات الكويت',
  };
  await db.siteSetting.update({ where: { key: 'seo' }, data: { value: next } });
  console.log('\n[seo] UPDATED ✓');
  console.log('  siteTitle   :', next.siteTitle);
  console.log('  description :', next.description.slice(0, 90) + '…');
  console.log('  siteUrl     :', v.siteUrl || '(kept as-is)');
  console.log('  verifications:', {
    google: !!v.googleVerification,
    bing: !!v.bingVerification,
  });
}

await db.$disconnect();
