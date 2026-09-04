/**
 * update-slider-images.mjs — يحديث سلايدر الإنتاج بصور حقيقية من الإنترنت:
 * شريحة الهوية (صورة تغليف طلبات) + شريحة الكويت + شريحة المتاجر المجانية الجديدة.
 * Usage: set -a; source .env; set +a; export DATABASE_URL="$NEON_DATABASE_URL"; node scripts/storefront/update-slider-images.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const SLIDES = [
  {
    id: 'brand-affiliate',
    eyebrow: '✨ منصة دروب شيبنج رقم 1 في الكويت',
    title: 'سوّق واربح،',
    highlight: 'عمولات مقترحة من 1 إلى 10 د.ك — إنت تختار',
    subtitle: 'أكثر من 2,600 منتج جاهز للتسويق برابطك الخاص — إحنا نتكفل بالتخزين والشحن والتحصيل وعمولتك تتحسب تلقائياً على كل طلب يوصَل.',
    image: '/slides/hero-ecommerce.jpg',
    eyebrowEn: '✨ Kuwait’s #1 Dropshipping Platform',
    titleEn: 'Market & Earn —',
    highlightEn: 'suggested commissions 1–10 KWD — you pick',
    subtitleEn: '2,600+ products ready to market with your own link — we handle storage, shipping and collection; your commission is credited on every delivered order.',
    tone: 'dark',
    chips: ['عمولات 1–10 د.ك', 'تسجيل مجاني', 'بدون رأس مال'],
    chipsEn: ['1–10 KWD commissions', 'Free registration', 'Zero capital'],
    cta: { label: 'سوّق معنا واربح', labelEn: 'Sell With Us & Earn', action: 'affiliate-login' },
    ctaSecondary: { label: 'شوف المنتجات', labelEn: 'Browse Products', action: 'shop' },
    active: true,
  },
  {
    id: 'free-store',
    eyebrow: '🏪 الجديد — الميزة القاتلة',
    title: 'متجرك الخاص ببلاش،',
    highlight: 'بدومين خاص وبهويتك وبلوجوك',
    subtitle: 'افتح متجر إلكتروني كامل خلال دقيقة — منتجاتنا جاهزة بنقرة واحدة، إنت تحط هامش ربحك فوق سعر المنصة، وزبائنك يطلبون أونلاين والدفع عند الاستلام والشحن علينا.',
    image: '/slides/hero-packing.jpg',
    eyebrowEn: '🏪 New — The Killer Feature',
    titleEn: 'Your Own Store, Free —',
    highlightEn: 'custom domain, your brand, your logo',
    subtitleEn: 'Launch a full online store in a minute — add our products with one click, set your margin on top of platform prices, and your customers order online with cash on delivery — we ship.',
    tone: 'gold',
    chips: ['متجر مجاني', 'منتجات بنقرة', 'هامش إنت تحدده'],
    chipsEn: ['Free store', 'One-click products', 'You set the margin'],
    cta: { label: 'افتح متجرك المجاني', labelEn: 'Open Your Free Store', action: 'affiliate-login' },
    ctaSecondary: { label: 'شوف المنتجات', labelEn: 'Browse Products', action: 'shop' },
    active: true,
  },
  {
    id: 'kuwait-pride',
    eyebrow: '🇰🇼 صُنع للكويت',
    title: 'من الكويت للكويت،',
    highlight: 'توصيل لكل المحافظات والدفع عند الاستلام',
    subtitle: 'طلباتك وزبائنك يوصلون بسرعة لكل محافظات الكويت — العاصمة، حولي، الفروانية، الجهراء، الأحمدي، مبارك الكبير — مع محاسبة عمولات شفافة لحظة بلحظة.',
    image: '/slides/hero-kuwait.jpg',
    eyebrowEn: '🇰🇼 Built for Kuwait',
    titleEn: 'From Kuwait, for Kuwait —',
    highlightEn: 'delivery to all governorates, cash on delivery',
    subtitleEn: 'Orders reach every corner of Kuwait fast — Capital, Hawalli, Farwaniya, Jahra, Ahmadi, Mubarak Al-Kabeer — with transparent real-time commission accounting.',
    tone: 'blue',
    chips: ['توصيل 6 محافظات', 'دفع عند الاستلام', 'محاسبة شفافة'],
    chipsEn: ['All 6 governorates', 'Cash on delivery', 'Transparent accounting'],
    cta: { label: 'ابدأ التسويق الآن', labelEn: 'Start Marketing Now', action: 'affiliate-login' },
    ctaSecondary: { label: 'تتبع طلبك', labelEn: 'Track Order', action: 'track' },
    active: true,
  },
];

async function main() {
  const key = 'hero_slider';
  const row = await db.siteSetting.findUnique({ where: { key } });
  const prev = row?.value || {};
  const settings = {
    ...prev,
    autoplayMs: prev.autoplayMs ?? 6000,
    appendLandingPromos: prev.appendLandingPromos ?? true,
    slides: SLIDES,
    _updatedAt: new Date().toISOString(),
  };
  if (row) {
    await db.siteSetting.update({ where: { key }, data: { value: settings } });
  } else {
    await db.siteSetting.create({ data: { key, value: settings } });
  }
  console.log('✅ hero_slider updated with', SLIDES.length, 'slides (images: /slides/*.jpg)');
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
