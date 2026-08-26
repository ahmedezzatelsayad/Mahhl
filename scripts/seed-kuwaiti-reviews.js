/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed realistic Kuwaiti reviews (founder-requested social proof):
 *  - 80% of products get 2..100+ reviews (weighted power-law)
 *  - Realistic Kuwaiti names (men + women) & Kuwaiti-dialect comments
 *  - Per-product average rating graded 3.9 → 5.0
 *  - Product.soldCount synced to review count (organic 8-18x factor)
 *  - demandRank 1..100 = research-based "most demanded in Kuwait/Gulf"
 *
 * Idempotent: seeded reviews carry id prefix "seedrv" (deleted & re-created on re-run).
 * Real customer-submitted reviews are NEVER touched.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL =
  process.env.NEON_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

/* ============ Kuwaiti name pools ============ */
const MEN = ['أحمد','محمد','عبدالله','فهد','مبارك','جاسم','خالد','يوسف','بدر','مشاري','سعد','سلطان','طلال','ناصر','حمد','عيسى','حسين','علي','نواف','ثامر','راشد','عمر','سعود','عبدالعزيز','إبراهيم','صالح','فواز','دليم','سلطان','بو فهد','عبدالرحمن','ماجد','فيصل','زياد','عادل','توفيق','نايف','مشعل','بدر'];
const WOMEN = ['نورة','فاطمة','مريم','هند','لطيفة','منيرة','شيخة','موضي','عبير','أمل','ريم','دانة','الجازي','لمياء','هدى','سعاد','إيمان','وعد','حصة','الجوهرة','سارة','مشاعل','العنود','لولوة','بدرية','أفراح','شهد','غالية','سلوى','ندى','بشاير','مي','رقية','زينب','كريمة','أسيل','مناير','أم عبدالله','أم فهد'];
const FAMILY = ['العجمي','المطيري','العتيبي','الدوسري','الشمري','العنزي','القحطاني','الحربي','الرشيدي','السبيعي','البلوشي','الغانم','الخالدي','المضف','النصف','الصقر','الزامل','الشايع','البنا','الرومي','الفهد','الماجد','الحمود','الظفيري','المطوع','المهنا','السرداح','الصانع','المرزوق','الخريف','السيف','الجاسم','العلي','الرازحي','الشريدة','الوطيفي','الدبوس','العسكر','البغلي','البهبهاني','الفليج','الصالح','المرزوقي'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/* ============ Comment pools — Kuwaiti dialect, by flavor & rating ============ */
const C = {
  perfume5: ['ريحته فخمة وثباتها يمشي يوم كامل، كل من دخل المجلس سأل عنه','فوحانها يستاهل والديمومة ممتازة، والسعر بعد منطقي','طلبت لي ولأمي، صارت ريحة البيت كله عود 😍','ثباته فوق التوقعات، رشة وحدة تكفي اليوم كله','ريحته ثقيلة وغالية، تناسب المناسبات والدعوات','صدق يستاهل، حتى أختي طلبت واحد بعده','كلمني ناس وين شريته، هذا أحسن إشارة','الدخانطلته هادئة وما تسبب صداع، ذوق 👌'],
  perfume4: ['الريحة حلوة بس أتمنى الثبات أطول شوي','فوحانه زين، السpray صغير بس يكفي','ريحته طيبة، توقعته أقوى شوي بس عجبني','حلو وثباته معقول للسعر هذا'],
  kitchen5: ['خفيف وعملي، استخدمه كل يوم بالمطبخ وما تغير شي فيه','الجودة نظيفة والتشغيل سهل، حتى أمي عجبها','وصل بكرتون مغلف تمام، جربته نفس اليوم وشغّال عدل','يستاهل كل فلس، وفر علي وقت كثير بالطبخ 👌','ثاني مرة أطلبه، خذته احتياط للبيت','سهل التنظيف وهذا أهم شي عندي','قللت الشغل بالمطبخ نص الوقت، صراحة مفيد','الحجم مناسب والخامة قوية، مو من النوع اللي يخرب بسرعة'],
  kitchen4: ['حلو بس تمنيت الحجم أكبر شوي، عدا هذا كله تمام','يشتغل زين، التنظيف ياخذ وقت بس مو مشكلة','جيد وسعره مناسب، الجودة مقبولة جداً','المغلف كان بسيط بس المنتج سليم وشغال'],
  electronics5: ['البطارية تكفيني يوم كامل والصوت واضح، أنصح فيه','وصل بسرعة والجودة أحسن من السعر بكثير','جربته أسبوع كامل، لين الحين شغال مثل أول يوم','سهل الاستخدام حتى لي مو متمكنة بالتقنية','الشحن سريع ويدوم معه، اشتريت ثاني واحد هدية','الخامة أحلى من الصورة، شكله غالي','ما سخن معي أبداً، جودة المصنع واضحة'],
  electronics4: ['يشتغل عدل بس الشاحن اللي معاه قصير','البطارية تمشي نص يوم، مقبول','حلو وخفيف، تمنيت التعليمات بالعربي','الصوت واضح، الباسورد طلب تسجيل دخول مرة وحدة بس مزعجة شوي'],
  toys5: ['بنتي ما تركته من يدها، يستاهل فرحتها','لعيالي الغالية ما تقصر، آمن وقوي ما يخرب بسرعة','طلع عيالي فيه عالم ثانية 😂 يستاهل','مصنوع من خامة آمنة وما فيه أجزاء صغيرة تخوف','صار هدية لعيد ميلاد بنت أختي وكلهم انبسطوا عليه','يعلم ويسلي بنفس الوقت، ذكي جداً'],
  toys4: ['عجب العيال بس الضوء قوي شوي بالليل','لعبة حلوة، البطاريات مو مرفقة فانتبهوا','يستاهل السعر، الأطفال يملون منه بعد فترة وطبيعي'],
  hair5: ['الفرد طلع ناعم وما ضر شعري، أحسن من الصالون','استخدمته شهر وشعري صار أفضل، أنصح فيه','خفيف على اليد والحرارة توزع عدل','سافرت فيه ووفر علي السشوار والفرد، 2 في 1 فعلاً','شعري ناعم وكثيف وطلع معه نتيجة حلوة من أول استخدام'],
  hair4: ['يشنط الشعر زين بس ياخذ وقت على الشعر الكثيف','حلو وسريع، تمنيت الحرارة توصل أعلى شوي'],
  health5: ['فعلاً خفف الوجع، صرت أستخدمه كل يوم','جربته أسبوع وحسيت بفرق واضح، شكراً محل شوب','التدليك قوي ومريح، كأني بالصالون','طلبت لي ولوالدتي، الاثنين ارتاحنا له','يستاهل التجربة، خصوصاً بعد يوم عمل طويل','الخامة نظيفة والشاحن يدوم أسبوع معي'],
  health4: ['مريح بس الرأس كبيرة شوي على الأماكن الضيقة','يخفف الشد، مو علاج بس يريّح فعلاً'],
  belts5: ['مقاسه مضبوط ويثبت عدل ما يتحرك','لبسته شهر تحت الدشداشة وثباته ممتاز','فعلاً يشد الظهر ويخفف وجع، انصح به اللي شغلهم جالس','الخامة تتنفس وما تسبب عرق، ذكي','نزل لي وسطين بعد الاستخدام المنتظم، مبسوطة'],
  belts4: ['يشد زين بس لازم تتعود عليه بالبداية','المقاسات دقيقة، قياسك قبل الطلب'],
  car5: ['ركبته بسيارتي بسهولة وصار شكلها مرتب','الخامة قوية وما تأثر عليها الشمس','عملي جداً، كل من شافه سأل وين شريته','مثبت عدل وما يطيح مع المطبات','نظم لي المقصورة كلها، يستاهل'],
  car4: ['حلو بس اللاصق يحتاج ضغط زين أول مرة','يمشي حاله، اللون أغمق شوي من الصورة'],
  sports5: ['خفيف وما يتعب بالحمل، جبته معي الجيم والسفر','الخامة متينة والسوستة قوية','حجمه مناسب للماء البارد ويثبر البرودة ساعات','صار رفيقي بالتمرين اليومي، نظيف عملي'],
  home5: ['نظم لي الدواليب والمطبخ كله، فرق كبير','الخامة قوية وما تنكسر، تستاهل','وصل مغلف بشكل ممتاز وسريع','فكرة ذكية وفرت علي مساحة كبيرة','ثاني طلب لي من المحل، دايماً مضمونين'],
  home4: ['مفيد، تمنيت اللون الأبيض متوفر','الحجم أصغر شوي من المتوقع بس يخدم'],
  gen5: ['تعامل المحل ذوق والتوصيل وصل بوقته، المنتج زي الصورة بالضبط','أنصح فيه وبقوة، ما تبطون عليه','صراحة فاجأني بجودته، سعره غلط بالنسبة لشكله 👌','جديد بالكرتون ومغلف بعناية، شكراً على الاهتمام','ثاني طلب لي من محل شوب، دايماً عند مستوى التوقعات','طلبته الساعة 11 الليل ووصلني اليوم الثاني، خدمة سرعة','طلبت لي ولوالدتي وكلنا مبسوطين','المنتج أفخم من سعره بصراحة','خذيته لأمي وعجبها كثير، شكراً على الذوق','كل شي مضبوط من التغليف للمنتج نفسه ١٠/١٠'],
  gen4: ['جيد بشكل عام، فيه أشياء بسيطة تتحسن','المنتج تمام بس الشحن تأخر يوم','حلو وممتاز بس أتمنى ألوان أكثر','كويس للسعر، ما توقعت أكثر من كذا'],
  gen3: ['متوسط، يخدم الغرض بس توقعت الجودة أحسن شوي','يمشي حاله للسعر هذا، ما أقول سيئ وما أقول ممتاز','عادي، الشحن كان سريع وهذا حسنة'],
  gen2: ['ما وصل توقعاتي، بس خدمة العملاء تعاملت مع الموضوع بأدب','المقاس أصغر من المذكور، رجعته وردوا المبلغ بسرعة'],
  gen1: ['توقعي كان أعلى، للأسف ما نفع معي','خرب بعد فترة قصيرة، فرصة إنه سعره بسيط'],
};

const TITLES = {
  5: ['يستاهل السعر 👌','منتج ممتاز','أنصح فيه','جودة عالية','ثاني طلب لي','فرق عن غيره','ذوق وخدمة أطيب','ما توقعت الجودة بهالمستوى','طلعة سفر','قلت آخذة لعل، طلع كنز'],
  4: ['جيد جداً','حلو مع ملاحظات بسيطة','يستاهل التجربة','كويس جداً'],
  3: ['مقبول','متوسط','يمشي حاله'],
  2: ['ما وصل توقعاتي','رجعته واستردوا المبلغ'],
  1: ['للأسف ما نفع معي','تجربة ما أعيدها'],
};

/* flavor detection from product+category name */
function flavorOf(name, cat) {
  const s = `${name} ${cat || ''}`;
  if (/عطر|عود|بخور|مبخرة|فوحان|دهن عود|معمول/.test(s)) return 'perfume';
  if (/خلاط|قلاية|فرن|مطبخ|طهي|عصار|سكين|مقلاة|طقم مطبخ|أواني|حافظة طعام|تفريغ الهواء/.test(s)) return 'kitchen';
  if (/لعب|أطفال|طفل|ركن/.test(s)) return 'toys';
  if (/شعر|مجفف|فرد|تمليس|مكينة|حلاقة|مزيل/.test(s)) return 'hair';
  if (/حزام|مشد/.test(s)) return 'belts';
  if (/سيارة|كفر|مقعد سيارة|شنطة سيارة/.test(s)) return 'car';
  if (/تدليك|مساج|مسدل|طبية|صحية|ضغط|علاج|مقياس|حرارة/.test(s)) return 'health';
  if (/رياض|جيم|دمبل|يوجا|زجاجة مياه/.test(s)) return 'sports';
  if (/شاحن|سماعة|سماعات|ساعة|usb|led|كهربائي|مروحة|كاميرا|بروجكتور|بطارية|ذكي|شاشة/.test(s.toLowerCase())) return 'electronics';
  if (/منظم|رفوف|ممسحة|تنظيف|أرضيات|مفارش|ستائر|ديكور/.test(s)) return 'home';
  return 'gen';
}

function commentsFor(flavor, rating) {
  const five = C[`${flavor}5`] || [];
  const four = C[`${flavor}4`] || [];
  if (rating === 5) return five.length ? five : C.gen5;
  if (rating === 4) return four.length ? four : C.gen4;
  return C[`gen${rating}`];
}

/* pick target average in [3.9, 4.9] weighted toward 4.4-4.8 */
function targetAverage() {
  const r = Math.random();
  if (r < 0.10) return 3.9 + Math.random() * 0.2;   // 3.9-4.1
  if (r < 0.30) return 4.1 + Math.random() * 0.2;   // 4.1-4.3
  if (r < 0.75) return 4.3 + Math.random() * 0.3;   // 4.3-4.6
  return 4.6 + Math.random() * 0.3;                 // 4.6-4.9
}

/* review-count distribution: 2..100+ power-law; bestsellers boosted */
function reviewCount(isBestSeller) {
  const r = Math.random();
  let n;
  if (r < 0.30) n = randInt(2, 8);
  else if (r < 0.60) n = randInt(9, 16);
  else if (r < 0.80) n = randInt(17, 35);
  else if (r < 0.93) n = randInt(36, 70);
  else n = randInt(71, 118);
  if (isBestSeller) n = Math.max(n, randInt(40, 100));
  return n;
}

/* build rating list hitting target average ±0.07 */
function buildRatings(n, target) {
  const ratings = new Array(n).fill(5);
  const avg = () => ratings.reduce((a, b) => a + b, 0) / n;
  let guard = 0;
  while (avg() > target + 0.05 && guard++ < n * 30) {
    // swap one 5 → mostly 4, sometimes 3, rarely 2/1
    const r = Math.random();
    const nv = r < 0.62 ? 4 : r < 0.88 ? 3 : r < 0.96 ? 2 : 1;
    // replace a random 5
    const idxs = ratings.map((v, i) => (v === 5 ? i : -1)).filter((i) => i >= 0);
    if (!idxs.length) break;
    ratings[idxs[Math.floor(Math.random() * idxs.length)]] = nv;
  }
  return ratings;
}

function makeName() {
  const female = Math.random() < 0.52; // slightly more women reviewers (matches GCC buyer base)
  const first = female ? rand(WOMEN) : rand(MEN);
  return { name: `${first} ${rand(FAMILY)}`, female };
}

/* date within last 420 days, biased recent (65% within 130 days) */
function makeDate(now) {
  const days = Math.random() < 0.65 ? Math.random() ** 1.6 * 130 : 130 + Math.random() * 290;
  return new Date(now - Math.floor(days) * 86400000 - randInt(0, 86399) * 1000);
}

(async () => {
  const t0 = Date.now();
  /* ---- phase 0: clean previous seed ---- */
  const del = await p.review.deleteMany({ where: { id: { startsWith: 'seedrv' } } });
  console.log('removed previous seeded reviews:', del.count);

  const products = await p.product.findMany({
    select: {
      id: true, name: true, isBestSeller: true, price: true, salePrice: true,
      images: true, quantity: true,
      category: { select: { name: true } },
    },
  });
  console.log('products:', products.length);

  /* ---- phase 1: reviews for a random 80% ---- */
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  const target = shuffled.slice(0, Math.floor(products.length * 0.8));
  const now = Date.now();

  let serial = 0;
  const soldUpdates = [];
  const CHUNK = 800;
  let rows = [];
  let totalReviews = 0;

  for (const prod of target) {
    const n = reviewCount(prod.isBestSeller);
    const ratings = buildRatings(n, targetAverage());
    const flavor = flavorOf(prod.name, prod.category?.name);
    let soldFactor = randInt(8, 18);

    for (const rating of ratings) {
      const { name, female } = makeName();
      const pool = commentsFor(flavor, rating);
      let comment = rand(pool);
      // ~18% of reviews get a second sentence for organic variety
      if (Math.random() < 0.18) comment += '، ' + rand(pool);
      const ageDays = Math.floor((now - makeDate(now).getTime()) / 86400000);
      const helpful = Math.random() < 0.45 ? Math.min(46, randInt(1, 6) + Math.floor(Math.abs(ageDays) / 12)) : 0;
      rows.push({
        id: `seedrv${(++serial).toString(36).padStart(6, '0')}`,
        productId: prod.id,
        customerName: name,
        rating,
        title: Math.random() < 0.72 ? rand(TITLES[rating]) : null,
        comment: female && Math.random() < 0.2 ? comment : comment,
        isVerified: Math.random() < 0.88,
        isApproved: true,
        helpfulCount: helpful,
        createdAt: makeDate(now),
      });
      if (rows.length >= CHUNK) {
        await p.review.createMany({ data: rows });
        totalReviews += rows.length;
        rows = [];
        if (totalReviews % 8000 === 0) console.log('  inserted', totalReviews);
      }
    }
    soldUpdates.push({ id: prod.id, sold: Math.round(n * soldFactor) + randInt(0, 7) });
  }
  if (rows.length) { await p.review.createMany({ data: rows }); totalReviews += rows.length; }
  console.log('seeded reviews:', totalReviews, 'for', target.length, 'products (80%)');

  /* products NOT seeded keep soldCount from real orders only → reset */
  const seededIds = new Set(soldUpdates.map((u) => u.id));
  const notSeeded = products.filter((pr) => !seededIds.has(pr.id)).map((pr) => pr.id);
  for (let i = 0; i < notSeeded.length; i += 500) {
    await p.product.updateMany({ where: { id: { in: notSeeded.slice(i, i + 500) } }, data: { soldCount: 0 } });
  }

  /* real sold counts (non-cancelled orders) get added on top */
  const realSold = await p.orderItem.groupBy({
    by: ['productId'],
    where: { order: { status: { notIn: ['cancelled', 'pending_payment'] } } },
    _sum: { quantity: true },
  });
  const realMap = new Map(realSold.map((r) => [r.productId, r._sum.quantity || 0]));
  for (let i = 0; i < soldUpdates.length; i += 500) {
    const batch = soldUpdates.slice(i, i + 500);
    await Promise.all(
      batch.map((u) =>
        p.product.update({
          where: { id: u.id },
          data: { soldCount: u.sold + (realMap.get(u.id) || 0) },
        })
      )
    );
  }
  console.log('soldCount synced for', soldUpdates.length, 'products');

  /* ---- phase 2: demand ranking (research-based Gulf/Kuwait top demand) ---- */
  const TIER_A = ['عطر','عود','بخور','مبخرة','ساعة ذكية','سماعات','سماعة','ايربودز','قلاية','خلاط','عصارة','مكنسة','شاحن','بنك طاقة','بطارية متنقلة','مجفف شعر','فرد شعر','تمليس','كاميرا مراقبة','قفل ذكي','بروجكتور','عرض','air fryer','smart','earbuds','led','usb'];
  const TIER_B = ['مروحة','جهاز تدليك','مساج','مسدل','حزام','مشد','ماكينة حلاقة','مزيل شعر','فرشاة','منظم','حافظة','تفريغ','ممسحة','نظارة','حقيبة','شنطة','لعبة','أطفال','طفل','دراجة','سكوتر','لمبة','مصباح','مقياس ضغط','ميزان','ترمو'];
  const TIER_C = ['سيارة','طقم','أدوات','مقص','سكين','زجاجة','رياضية','يوجا','دمبل','ساعة','خشب','بلاستيك'];

  function score(pr) {
    const hay = `${pr.name} ${pr.category?.name || ''}`.toLowerCase();
    let s = 0;
    if (TIER_A.some((k) => hay.includes(k))) s += 30;
    if (TIER_B.some((k) => hay.includes(k))) s += 16;
    if (TIER_C.some((k) => hay.includes(k))) s += 7;
    if (pr.isBestSeller) s += 26;
    if (pr.price > pr.salePrice) s += 10; // discount present
    const price = pr.salePrice || pr.price;
    if (price >= 2 && price <= 25) s += 8; // impulse-buy sweet spot
    const sold = soldUpdates.find((u) => u.id === pr.id)?.sold || 0;
    s += Math.min(20, sold / 40);
    if ((pr.images || '').split(',').filter(Boolean).length > 1) s += 4;
    return s;
  }

  await p.product.updateMany({ where: { demandRank: { not: null } }, data: { demandRank: null } });
  const ranked = products
    .filter((pr) => (pr.quantity > 0) && (pr.images || '').trim() !== '')
    .map((pr) => ({ pr, s: score(pr) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 100);
  for (let i = 0; i < ranked.length; i++) {
    await p.product.update({ where: { id: ranked[i].pr.id }, data: { demandRank: i + 1 } });
  }
  console.log('demandRank assigned to top', ranked.length);

  /* marker for later audits */
  await p.siteSetting.upsert({
    where: { key: 'seeded_reviews_v1' },
    update: { value: { totalReviews, products: target.length, at: new Date().toISOString() } },
    create: { key: 'seeded_reviews_v1', value: { totalReviews, products: target.length, at: new Date().toISOString() } },
  });

  console.log('DONE in', Math.round((Date.now() - t0) / 1000), 's');
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
