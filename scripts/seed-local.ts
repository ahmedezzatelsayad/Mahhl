/**
 * seed-local.ts — بذر بيئة تطوير محلية لمنصة Garfix Stores (كانت Mahhl).
 *
 * يغطي الحد الأدنى لتشغيل E2E للمرحلة 1 (تكامل ERP):
 *  - أدمن (يُطابق بريد مؤسس ERP — ليقف عليه SSO)
 *  - تصنيفات ومنتجات بدراسة تسويقية (demandTier/adChannel/suggestedPrice)
 *  - مسوّق + متجر تجريبي "garfix-demo" بمنتجاته
 *  - إعدادات الشحن الافتراضية
 *
 * التشغيل: npx tsx scripts/seed-local.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ADMIN_EMAIL = "ahmedezzatelsayad@gmail.com";
const ADMIN_PASS = "admin123"; // محلي فقط — يُستبدل عبر SSO

async function main() {
  // ── 1) الأدمن (مؤسس ERP نفسه — مفتاح الـ SSO) ──
  const adminPass = await bcrypt.hash(ADMIN_PASS, 10);
  const admin = await db.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "owner", isActive: true },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPass,
      name: "أحمد عزت الصياد",
      role: "owner",
    },
  });

  // ── 2) تصنيفات ──
  const catDefs = [
    { slug: "electronics", name: "إلكترونيات", nameEn: "Electronics" },
    { slug: "home", name: "المنزل والمطبخ", nameEn: "Home & Kitchen" },
    { slug: "beauty", name: "الجمال والعناية", nameEn: "Beauty & Care" },
  ];
  const cats: Record<string, string> = {};
  for (const c of catDefs) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, nameEn: c.nameEn },
      create: { slug: c.slug, name: c.name, nameEn: c.nameEn },
    });
    cats[c.slug] = row.id;
  }

  // ── 3) منتجات بدراسة تسويقية (وقود وكيل الإعلانات لاحقاً) ──
  const prodDefs = [
    { sku: "GS-P001", slug: "smart-watch-pro", name: "ساعة ذكية Pro — إصدار 2026", price: 12.5, salePrice: 9.9, commission: 3, suggestedPrice: 12.9, demandTier: "hot", adChannel: "snapchat", studyNote: "طلب عالي بين الشباب الكويتي — أقوى قناة: سناب شات", categoryId: cats.electronics, isBestSeller: true, demandRank: 3 },
    { sku: "GS-P002", slug: "wireless-earbuds-air", name: "سماعات لاسلكية Air Buds", price: 8.75, salePrice: 6.5, commission: 2, suggestedPrice: 8.9, demandTier: "hot", adChannel: "tiktok", studyNote: "حجم صغير وهامش جيد — تيك توك ريلز قصيرة", categoryId: cats.electronics, isBestSeller: true, demandRank: 7 },
    { sku: "GS-P003", slug: "portable-blender-usb", name: "خلاط محمول USB شحن سريع", price: 6.25, salePrice: 4.75, commission: 1.5, suggestedPrice: 6.5, demandTier: "warm", adChannel: "instagram", studyNote: "موسمي (صيف) — إنستا ستوري + ريلز", categoryId: cats.home, isBestSeller: false, demandRank: 24 },
    { sku: "GS-P004", slug: "air-fryer-4l", name: "قلاية هوائية 4 لتر", price: 24.0, salePrice: 19.9, commission: 5, suggestedPrice: 24.9, demandTier: "hot", adChannel: "snapchat", studyNote: "أسرة كويتية — سناب + واتساب مجموعات", categoryId: cats.home, isBestSeller: true, demandRank: 12 },
    { sku: "GS-P005", slug: "skincare-set-vitamin-c", name: "طقم عناية بالبشرة فيتامين C", price: 9.5, salePrice: 7.25, commission: 2.5, suggestedPrice: 9.5, demandTier: "warm", adChannel: "instagram", studyNote: "جمهور نسائي — إنستا + تيك توك", categoryId: cats.beauty, isBestSeller: false, demandRank: 41 },
    { sku: "GS-P006", slug: "hair-dryer-ionic", name: "مجفف شعر أيوني 2000W", price: 11.0, salePrice: 8.5, commission: 2, suggestedPrice: 11.5, demandTier: "warm", adChannel: "tiktok", studyNote: "ثابت على مدار السنة", categoryId: cats.beauty, isBestSeller: false, demandRank: 55 },
    { sku: "GS-P007", slug: "gaming-mouse-rgb", name: "ماوس ألعاب RGB قابل للبرمجة", price: 5.5, salePrice: 3.9, commission: 1, suggestedPrice: 5.5, demandTier: "warm", adChannel: "instagram", studyNote: "جمهور جيمرز شاب", categoryId: cats.electronics, isBestSeller: false, demandRank: 62 },
    { sku: "GS-P008", slug: "organizer-bag-travel", name: "حقيبة تنظيم سفر متعددة الجيوب", price: 3.75, salePrice: 2.9, commission: 1, suggestedPrice: 3.9, demandTier: "cold", adChannel: "whatsapp", studyNote: "هامش صغير — واتساب ومواسم السفر", categoryId: cats.home, isBestSeller: false, demandRank: 88 },
  ];
  const products: Record<string, string> = {};
  for (const p of prodDefs) {
    const row = await db.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name, price: p.price, salePrice: p.salePrice, commission: p.commission,
        suggestedPrice: p.suggestedPrice, demandTier: p.demandTier, adChannel: p.adChannel,
        studyNote: p.studyNote, categoryId: p.categoryId, isBestSeller: p.isBestSeller,
        demandRank: p.demandRank, quantity: 50,
      },
      create: {
        sku: p.sku, slug: p.slug, name: p.name, price: p.price, salePrice: p.salePrice,
        commission: p.commission, suggestedPrice: p.suggestedPrice, demandTier: p.demandTier,
        adChannel: p.adChannel, studyNote: p.studyNote, categoryId: p.categoryId,
        isBestSeller: p.isBestSeller, demandRank: p.demandRank, quantity: 50,
        description: p.name, soldCount: Math.floor(Math.random() * 300) + 40,
      },
    });
    products[p.sku] = row.id;
  }

  // ── 4) مسوّق + متجر تجريبي ──
  const affPass = await bcrypt.hash("demo1234", 10);
  const affiliate = await db.affiliate.upsert({
    where: { phone: "51234567" },
    update: {},
    create: {
      name: "أحمد — متجر تجريبي",
      phone: "51234567",
      email: "store-owner@garfix-demo.local",
      passwordHash: affPass,
      code: "GS-DEMO",
      status: "active",
    },
  });
  const storefront = await db.storefront.upsert({
    where: { slug: "garfix-demo" },
    update: {},
    create: {
      ownerId: affiliate.id,
      slug: "garfix-demo",
      name: "بوتيك جارفكس التجريبي",
      tagline: "أفضل المنتجات بأسعار المنصة — توصيل لكل الكويت",
      primaryColor: "#B45309",
      defaultMarkup: 1.5,
      isActive: true,
    },
  });
  // كل المنتجات في المتجر (بسعرها الافتراضي = سعر المنصة + الهامش)
  for (const sku of Object.keys(products)) {
    await db.storefrontProduct.upsert({
      where: { storefrontId_productId: { storefrontId: storefront.id, productId: products[sku] } },
      update: { isActive: true },
      create: { storefrontId: storefront.id, productId: products[sku], isActive: true },
    });
  }

  // ── 5) إعدادات الشحن (نفس شكل getShippingSettings في src/lib/settings.ts) ──
  await db.siteSetting.upsert({
    where: { key: "shipping" },
    update: { value: { price: 1.5, freeThreshold: 15, note: "" } as any },
    create: { key: "shipping", value: { price: 1.5, freeThreshold: 15, note: "" } as any },
  });

  console.log("[seed-local] ✔", JSON.stringify({
    admin: admin.email,
    categories: Object.keys(cats).length,
    products: Object.keys(products).length,
    affiliate: affiliate.code,
    storefront: storefront.slug,
  }));
}

main()
  .catch((e) => {
    console.error("[seed-local] FAILED:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
