'use client';

/**
 * i18n dictionary — Arabic (default) / English.
 * Customer-facing surface: header, footer, home, shop, product, cart,
 * checkout, reviews, search, chat, wishlist, account, tracking, info pages.
 */
import { useLangStore, type Lang } from '@/lib/stores/lang-store';

type Dict = Record<string, { ar: string; en: string }>;

export const DICT: Dict = {
  /* ===== header ===== */
  'hdr.announcement': {
    ar: 'توصيل لجميع محافظات الكويت — دفع عند الاستلام',
    en: 'Delivery across all Kuwait — Cash on Delivery',
  },
  'hdr.track': { ar: 'تتبع طلبك', en: 'Track Order' },
  'hdr.account': { ar: 'حسابي', en: 'My Account' },
  'hdr.wishlist': { ar: 'المفضلة', en: 'Wishlist' },
  'hdr.cart': { ar: 'السلة', en: 'Cart' },
  'hdr.menu': { ar: 'القائمة', en: 'Menu' },
  'hdr.searchPh': { ar: 'تدور على شنو؟ اكتبه هنا…', en: 'What are you looking for? Type it here…' },
  'hdr.allProducts': { ar: 'كل المنتجات', en: 'All Products' },
  'hdr.accountLogin': { ar: 'حسابي / تسجيل', en: 'My Account / Sign in' },
  'hdr.whatsapp': { ar: 'واتساب المتجر', en: 'WhatsApp Us' },
  'hdr.home': { ar: 'الرئيسية', en: 'Home' },
  'hdr.langSwitch': { ar: 'EN', en: 'عربي' },
  'hdr.langSwitchTitle': { ar: 'Switch to English', en: 'التبديل إلى العربية' },

  /* ===== search box ===== */
  'sb.search': { ar: 'بحث', en: 'Search' },
  'sb.recent': { ar: 'آخر بحثك', en: 'Recent searches' },
  'sb.popular': { ar: 'الأكثر بحثاً', en: 'Popular right now' },
  'sb.allResults': { ar: 'شاهد كل النتائج', en: 'See all results' },
  'sb.noResults': { ar: 'ما لقينا نتائج — جرب كلمة ثانية', en: 'No results — try another word' },
  'sb.searching': { ar: 'ندور…', en: 'Searching…' },
  'sb.products': { ar: 'منتجات', en: 'Products' },
  'sb.categories': { ar: 'أقسام', en: 'Categories' },

  /* ===== home ===== */
  'home.features.delivery': { ar: 'توصيل سريع', en: 'Fast Delivery' },
  'home.features.deliveryD': { ar: 'لكل المحافظات', en: 'To all governorates' },
  'home.features.cod': { ar: 'دفع آمن', en: 'Secure Payment' },
  'home.features.codD': { ar: 'عند الاستلام', en: 'Cash on delivery' },
  'home.features.picked': { ar: 'منتجات مختارة', en: 'Carefully Picked' },
  'home.features.pickedD': { ar: 'بعناية وفقاءة', en: 'Quality you can trust' },
  'home.features.support': { ar: 'دعم يومي', en: 'Daily Support' },
  'home.features.supportD': { ar: 'واتساب 9ص–11م', en: 'WhatsApp 9AM–11PM' },
  'home.categories': { ar: 'تسوق حسب القسم', en: 'Shop by Category' },
  'home.viewAll': { ar: 'عرض الكل', en: 'View All' },
  'home.allProducts': { ar: 'كل المنتجات', en: 'All Products' },
  'home.bestsellers': { ar: 'الأكثر مبيعاً', en: 'Best Sellers' },
  'home.newest': { ar: 'أحدث المنتجات', en: 'New Arrivals' },
  'home.topDemand': { ar: 'الأكثر طلباً في الكويت والخليج', en: "Kuwait & Gulf's Most Wanted" },
  'home.topDemandSub': {
    ar: 'أفضل 100 منتج الكويت يدورون عليهم الحين — مختارين من بيانات الطلب الفعلية',
    en: "The top 100 products Kuwait is searching for right now — ranked from real demand data",
  },
  'home.topDemandMore': { ar: 'شاهد المزيد من الأكثر طلباً', en: 'Show more most-wanted' },
  'home.productCount': { ar: 'منتج', en: 'items' },
  'home.browseAll': { ar: 'تصفح كل المنتجات', en: 'Browse all products' },
  'home.shopNow': { ar: 'تسوق الآن', en: 'Shop Now' },
  'home.discover': { ar: 'اكتشف العرض', en: 'Discover the Deal' },
  'home.faq': { ar: 'الأسئلة الشائعة عن محل شوب', en: 'Mahal Shop FAQ' },
  'home.landingBadge': { ar: 'عرض خاص لفترة محدودة', en: 'Limited-time special offer' },

  /* ===== shop ===== */
  'shop.all': { ar: 'كل المنتجات', en: 'All Products' },
  'shop.results': { ar: 'نتائج البحث عن', en: 'Search results for' },
  'shop.byCategory': { ar: 'تسوق حسب الفئة', en: 'Shop by category' },
  'shop.products': { ar: 'منتج', en: 'products' },
  'shop.filter': { ar: 'فلتر', en: 'Filter' },
  'shop.sort': { ar: 'ترتيب', en: 'Sort' },
  'shop.sort.newest': { ar: 'الأحدث', en: 'Newest' },
  'shop.sort.priceAsc': { ar: 'السعر: تصاعدي', en: 'Price: Low to High' },
  'shop.sort.priceDesc': { ar: 'السعر: تنازلي', en: 'Price: High to Low' },
  'shop.sort.name': { ar: 'الاسم', en: 'Name' },
  'shop.sort.rating': { ar: 'الأعلى تقييماً', en: 'Top Rated' },
  'shop.filters': { ar: 'الفلاتر', en: 'Filters' },
  'shop.clearAll': { ar: 'مسح الكل', en: 'Clear all' },
  'shop.searchLabel': { ar: 'البحث', en: 'Search' },
  'shop.searchPh': { ar: 'اسم المنتج...', en: 'Product name...' },
  'shop.searchBtn': { ar: 'ابحث', en: 'Search' },
  'shop.categories': { ar: 'الفئات', en: 'Categories' },
  'shop.allCategories': { ar: 'كل الفئات', en: 'All categories' },
  'shop.bestsellerOnly': { ar: 'الأكثر مبيعاً فقط', en: 'Best sellers only' },
  'shop.priceRange': { ar: 'نطاق السعر', en: 'Price range' },
  'shop.minPrice': { ar: 'أقل سعر', en: 'Min price' },
  'shop.maxPrice': { ar: 'أعلى سعر', en: 'Max price' },
  'shop.perPage': { ar: 'لكل صفحة', en: 'Per page' },
  'shop.noMatch': { ar: 'لا توجد منتجات مطابقة', en: 'No matching products' },
  'shop.reset': { ar: 'إعادة ضبط الفلاتر', en: 'Reset filters' },
  'shop.prev': { ar: 'السابق', en: 'Previous' },
  'shop.next': { ar: 'التالي', en: 'Next' },

  /* ===== product ===== */
  'p.bestseller': { ar: 'الأكثر مبيعاً', en: 'Best Seller' },
  'p.reviews': { ar: 'تقييم', en: 'reviews' },
  'p.soldTimes': { ar: 'طُلب {n} مرة', en: 'Ordered {n} times' },
  'p.inStock': { ar: 'متوفر', en: 'In stock' },
  'p.pieces': { ar: 'قطعة', en: 'pcs' },
  'p.lowStock': { ar: 'الكمية محدودة — اطلبها الآن', en: 'Low stock — order now' },
  'p.oos': { ar: 'نفذ المخزون', en: 'Out of stock' },
  'p.save': { ar: 'وفّر', en: 'Save' },
  'p.shipping1': { ar: 'الشحن لكل الكويت 1 د.ك — مجاني للطلبات من 30 د.ك · الدفع عند الاستلام', en: 'Shipping 1 KWD across Kuwait — FREE over 30 KWD · Cash on delivery' },
  'p.noDesc': { ar: 'لا يوجد وصف متاح لهذا المنتج.', en: 'No description available for this product.' },
  'p.qty': { ar: 'الكمية', en: 'Qty' },
  'p.addToCart': { ar: 'أضف للسلة', en: 'Add to Cart' },
  'p.delivery': { ar: 'توصيل خلال 2-5 أيام', en: 'Delivery in 2-5 days' },
  'p.warranty': { ar: 'ضمان استبدال 7 أيام', en: '7-day replacement warranty' },
  'p.cod': { ar: 'دفع عند الاستلام', en: 'Cash on delivery' },
  'p.related': { ar: 'منتجات ذات صلة', en: 'Related Products' },
  'p.total': { ar: 'الإجمالي', en: 'Total' },
  'p.added': { ar: 'تمت الإضافة إلى السلة', en: 'Added to cart' },
  'p.notFound': { ar: 'المنتج غير موجود', en: 'Product not found' },
  'p.loadFail': { ar: 'فشل تحميل المنتج', en: 'Failed to load product' },
  'p.products': { ar: 'المنتجات', en: 'Products' },
  'p.kwRank': { ar: 'في الكويت', en: 'in Kuwait' },

  /* ===== reviews ===== */
  'r.customerReviews': { ar: 'تقييمات العملاء', en: 'Customer Reviews' },
  'r.write': { ar: 'اكتب تقييمك', en: 'Write a review' },
  'r.basedOn': { ar: 'بناءً على {n} تقييم', en: 'Based on {n} reviews' },
  'r.verified': { ar: 'مشترٍ موثّق', en: 'Verified Buyer' },
  'r.helpful': { ar: '{n} وجدوه مفيداً', en: '{n} found this helpful' },
  'r.empty': { ar: 'لا توجد تقييمات بعد لهذا المنتج', en: 'No reviews yet for this product' },
  'r.emptySub': {
    ar: 'كن أول من يشارك تجربته — رأيك يساعد بقية العملاء على الاختيار بثقة',
    en: 'Be the first to share your experience — your opinion helps others buy with confidence',
  },
  'r.yourRating': { ar: 'تقييمك العام *', en: 'Your overall rating *' },
  'r.name': { ar: 'اسمك *', en: 'Your name *' },
  'r.phone': { ar: 'رقم هاتفك (اختياري — لتوثيق الشراء)', en: 'Phone (optional — to verify purchase)' },
  'r.titlePh': { ar: 'عنوان مختصر (اختياري)', en: 'Short title (optional)' },
  'r.commentPh': { ar: 'شاركنا تجربتك مع المنتج…', en: 'Share your experience with this product…' },
  'r.phoneNote': {
    ar: 'رقم الهاتف يستخدم فقط لمطابقة طلبك الفعلي — لو اشتريت المنتج من عندنا يظهر تقييمك فوراً مع علامة «مشترٍ موثّق»، وإلا فيُنشر بعد مراجعة سريعة.',
    en: 'Your phone is only used to match your real order — if you bought this product your review publishes instantly with a Verified Buyer badge; otherwise after a quick review.',
  },
  'r.send': { ar: 'أرسل التقييم', en: 'Submit review' },
  'r.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'r.starsFirst': { ar: 'اختر عدد النجوم أولاً', en: 'Pick the star rating first' },
  'r.fail': { ar: 'تعذر إرسال التقييم', en: 'Could not submit the review' },
  'r.netFail': { ar: 'تعذر الاتصال، جرب مرة أخرى', en: 'Connection failed, try again' },
  'r.prev': { ar: '← السابق', en: '← Previous' },
  'r.next': { ar: 'التالي →', en: 'Next →' },
  'r.today': { ar: 'اليوم', en: 'Today' },
  'r.yesterday': { ar: 'أمس', en: 'Yesterday' },
  'r.daysAgo': { ar: 'قبل {n} يوم', en: '{n} days ago' },
  'r.monthsAgo': { ar: 'قبل {n} شهر', en: '{n} months ago' },
  'r.yearsAgo': { ar: 'قبل {n} سنة', en: '{n} years ago' },

  /* ===== cart ===== */
  'c.cart': { ar: 'سلة التسوق', en: 'Shopping Cart' },
  'c.empty': { ar: 'سلتك فاضية', en: 'Your cart is empty' },
  'c.emptySub': { ar: 'دور على اللي يعجبك واضفه هنا', en: 'Find something you love and add it here' },
  'c.startShopping': { ar: 'ابدأ التسوق', en: 'Start shopping' },
  'c.subtotal': { ar: 'المجموع الفرعي', en: 'Subtotal' },
  'c.shipping': { ar: 'الشحن', en: 'Shipping' },
  'c.free': { ar: 'مجاني', en: 'FREE' },
  'c.total': { ar: 'الإجمالي', en: 'Total' },
  'c.checkout': { ar: 'إتمام الطلب', en: 'Checkout' },
  'c.continue': { ar: 'أكمل التسوق', en: 'Continue shopping' },
  'c.shippingNote': { ar: '* الشحن 1 د.ك — مجاني للطلبات من 30 د.ك', en: '* Shipping 1 KWD — FREE for orders 30 KWD+' },
  'c.shippingNoteFree': { ar: '* شحنك صار مجاني 🎉', en: '* Your shipping is FREE 🎉' },
  'c.addMore': { ar: 'أضف {v} واحصل على شحن مجاني', en: 'Add {v} more for FREE shipping' },
  'c.freeUnlocked': { ar: 'مبروك! حصلت على شحن مجاني 🎉', en: "Congrats! You've unlocked FREE shipping 🎉" },
  'c.progress': { ar: '{v} من 30 د.ك', en: '{v} of 30 KWD' },
  'c.item': { ar: 'قطعة', en: 'item' },
  'c.remove': { ar: 'إزالة', en: 'Remove' },

  /* ===== checkout ===== */
  'ck.title': { ar: 'إتمام الطلب', en: 'Checkout' },
  'ck.name': { ar: 'الاسم الكامل', en: 'Full name' },
  'ck.phone': { ar: 'رقم الهاتف', en: 'Phone number' },
  'ck.gov': { ar: 'المحافظة', en: 'Governorate' },
  'ck.area': { ar: 'المنطقة', en: 'Area' },
  'ck.address': { ar: 'العنوان بالتفصيل', en: 'Full address' },
  'ck.notes': { ar: 'ملاحظات (اختياري)', en: 'Notes (optional)' },
  'ck.payment': { ar: 'طريقة الدفع', en: 'Payment method' },
  'ck.cod': { ar: 'الدفع عند الاستلام', en: 'Cash on Delivery' },
  'ck.codDesc': { ar: 'ادفع نقداً للمندوب عند وصول طلبك', en: 'Pay cash to the courier on arrival' },
  'ck.place': { ar: 'تأكيد الطلب', en: 'Place Order' },
  'ck.summary': { ar: 'ملخص الطلب', en: 'Order summary' },
  'ck.addForFree': { ar: 'أضف بقيمة {v} للحصول على شحن مجاني', en: 'Add {v} more for free shipping' },
  'ck.processing': { ar: 'جاري تأكيد طلبك…', en: 'Placing your order…' },

  /* ===== chat ===== */
  'ch.title': { ar: 'تحدث مع المحل', en: 'Chat with Mahal' },
  'ch.sub': { ar: 'اكتب اللي تدور عليه — نجيبه لك', en: 'Tell us what you need — we got you' },
  'ch.welcome': {
    ar: 'هلا والله! 👋 أنا «المحل» — مساعدك الذكي في محل شوب.\nاكتب لي شنو تدور عليه (مثلاً: ساعة رجالية، لعبة للأطفال، عطر) وأجيبه لك بأحسن سعر 🛒',
    en: "Hey there! 👋 I'm Mahal — your smart shopping assistant at Mahal Shop.\nTell me what you're looking for (e.g. men's watch, kids toy, perfume) and I'll find it at the best price 🛒",
  },
  'ch.placeholder': { ar: 'اكتب اللي تدور عليه...', en: 'Type what you need...' },
  'ch.send': { ar: 'إرسال', en: 'Send' },
  'ch.searching': { ar: 'أدور لك... ⏳', en: 'Looking it up... ⏳' },
  'ch.error': { ar: 'صار خطأ بسيط بالاتصال.. جرّب مرة ثانية بعد شوي 🙏', en: 'Small connection hiccup.. please try again 🙏' },
  'ch.sug1': { ar: 'عطور', en: 'Perfumes' },
  'ch.sug2': { ar: 'ساعات', en: 'Watches' },
  'ch.sug3': { ar: 'لعبة أطفال', en: "Kids' toys" },
  'ch.sug4': { ar: 'إكسسوارات موبايل', en: 'Mobile accessories' },

  /* ===== footer ===== */
  'f.about': { ar: 'عن محل شوب', en: 'About Mahal Shop' },
  'f.links': { ar: 'روابط سريعة', en: 'Quick Links' },
  'f.contact': { ar: 'تواصل معنا', en: 'Contact Us' },
  'f.rights': { ar: 'جميع الحقوق محفوظة', en: 'All rights reserved' },

  /* ===== misc / social proof ===== */
  'm.freeShip': { ar: 'شحن مجاني', en: 'Free shipping' },
  'm.ordered': { ar: 'طُلب', en: 'Ordered' },
  'm.times': { ar: 'مرة', en: 'times' },
  'm.liveViewers': { ar: '{n} شخص يشاهد هذا المنتج الحين', en: '{n} people are viewing this now' },
  'm.recentlyViewed': { ar: 'آخر ما شاهدته', en: 'Recently Viewed' },
  'm.keepShopping': { ar: 'كمّل تسوقك — سلتك تنتظرك 🛒', en: 'Keep shopping — your cart is waiting 🛒' },
  'm.wait': { ar: 'لحظة! قبل تروح…', en: 'Wait! Before you go…' },
  'm.exitMsg': {
    ar: 'خلصت تسوقك؟ سلتك لسه محفوظة — والشحن مجاني فوق 30 د.ك. تحب نكمل معك؟',
    en: 'Done shopping? Your cart is still saved — and shipping is FREE over 30 KWD. Want to finish up?',
  },
  'm.backToCart': { ar: 'ارجع لسلتي', en: 'Back to my cart' },
  'm.stay': { ar: 'أكمل تسوق', en: 'Keep shopping' },
};

export function translate(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let s = entry ? entry[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

/** React hook — re-renders with the active language */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars);
  return { t, lang };
}
