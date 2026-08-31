'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type InfoPage } from '@/lib/stores/app-store';
import {
  Store, MessageCircle, Truck, ShieldCheck, RefreshCcw, HelpCircle,
  Lock, FileText, Phone, MapPin, ChevronDown,
} from 'lucide-react';
import { useBrand, waHref } from '@/components/store/header';
import { useT } from '@/lib/i18n';

interface ShippingInfo {
  price: number;
  freeThreshold: number;
  note: string;
}

/** pick Arabic or English inline */
function L(lang: 'ar' | 'en', ar: string, en: string) {
  return lang === 'en' ? en : ar;
}

const PAGE_TITLES: Record<InfoPage, { ar: string; en: string; icon: typeof Store }> = {
  about: { ar: 'من نحن', en: 'About Us', icon: Store },
  contact: { ar: 'تواصل معنا', en: 'Contact Us', icon: Phone },
  shipping: { ar: 'الشحن والتوصيل', en: 'Shipping & Delivery', icon: Truck },
  returns: { ar: 'الاستبدال والاسترجاع', en: 'Returns & Exchange', icon: RefreshCcw },
  faq: { ar: 'الأسئلة الشائعة', en: 'FAQ', icon: HelpCircle },
  privacy: { ar: 'سياسة الخصوصية', en: 'Privacy Policy', icon: Lock },
  terms: { ar: 'الشروط والأحكام', en: 'Terms & Conditions', icon: FileText },
};

export function InfoView() {
  const infoPage = useAppStore((s) => s.infoPage);
  const brand = useBrand();
  const { lang } = useT();
  const [shipping, setShipping] = useState<ShippingInfo | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch('/api/settings/shipping')
      .then((r) => r.json())
      .then((s) => {
        if (s && typeof s.price === 'number') setShipping(s);
      })
      .catch(() => {});
  }, [infoPage]);

  const meta = PAGE_TITLES[infoPage] ?? PAGE_TITLES.about;
  const Icon = meta.icon;

  const wa = (text: string) => waHref(brand.whatsapp, text);
  const waMsg = (ar: string, en: string) => waHref(brand.whatsapp, lang === 'en' ? en : ar);
  const kwd = (v: number) => v.toFixed(3);

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <Icon className="h-8 w-8 text-gold-deep" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{lang === 'en' ? meta.en : meta.ar}</h1>
        <div className="h-1 w-16 btn-gold rounded-full mx-auto mt-3" aria-hidden="true" />
      </div>

      {/* ===================== ABOUT ===================== */}
      {infoPage === 'about' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            {lang === 'en' ? (
              <>
                <b>{brand.siteName}</b> is a Kuwaiti online store built around one goal: a fast,
                effortless shopping experience — over <b>2,600 products</b> across toys,
                electronics, watches, perfumes, household tools and more, with clear prices in
                Kuwaiti Dinar and zero hidden fees.
              </>
            ) : (
              <>
                <b>{brand.siteName}</b> متجر إلكتروني كويتي، هدفنا نوفر لك تجربة تسوق سهلة
                وسريعة — أكثر من <b>2,600 منتج</b> في الألعاب والإلكترونيات والساعات
                والعطور والأدوات المنزلية وغيرها، بأسعار واضحة بالدينار الكويتي وبدون
                أي رسوم خفية.
              </>
            )}
          </p>
          <p>
            {lang === 'en' ? (
              <>
                We know your time is valuable, so everything stays simple: pick a product, enter
                your name, phone and address, and pay <b>on delivery</b> — no card, no
                complications. We deliver to every Kuwait governorate: Capital, Hawalli,
                Farwaniya, Jahra, Ahmadi and Mubarak Al-Kabeer.
              </>
            ) : (
              <>
                إحنا نعرف إن وقتك ثمين، عشان كذا خلينا كل شيء بسيط: تختار المنتج، تكتب
                اسمك ورقمك وعنوانك، وتدفع <b>عند الاستلام</b> — بدون بطاقة وبدون تعقيد.
                ونوصّل لكل محافظات الكويت: العاصمة، حولي، الفروانية، الجهراء، الأحمدي،
                ومبارك الكبير.
              </>
            )}
          </p>
          <p>
            {lang === 'en' ? (
              <>
                What sets us apart is our <b>smart assistant</b> that understands your taste:
                as you browse, it suggests products that fit you and helps you find what you
                need faster — try it anytime from the “Chat with Mahal” button.
              </>
            ) : (
              <>
                اللي يفرّقنا عن غيرنا إن عندنا <b>مساعد ذكي</b> يفهم ذوقك: من زيارك
                للمتجر يقترح لك منتجات تناسبك وتساعدك تلاقي اللي تدور عليه بأسرع وقت —
                جربه من زر «تحدث مع المحل» بأي وقت.
              </>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {(lang === 'en'
              ? [
                  ['2,600+', 'products available'],
                  ['All Kuwait', 'delivery to 6 governorates'],
                  ['Cash on delivery', 'safe & easy'],
                ]
              : [
                  ['+2,600', 'منتج متوفر'],
                  ['كل الكويت', 'توصيل للمحافظات الست'],
                  ['دفع عند الاستلام', 'آمن ومريح'],
                ]
            ).map(([v, l]) => (
              <div key={l} className="rounded-xl border bg-card p-4 text-center">
                <p className="font-extrabold text-gold-deep">{v}</p>
                <p className="text-xs text-muted-foreground mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== CONTACT ===================== */}
      {infoPage === 'contact' && (
        <div className="space-y-4">
          <p className="text-[15px] leading-8 text-foreground/90">
            {L(
              lang,
              'فريقنا موجود لخدمتك كل يوم من 9 صباحاً إلى 11 مساءً. أسرع طريقة توصلنا فيها هي الواتساب — ارسل رسالتك ونرد عليك بأقرب وقت.',
              'Our team is here for you every day from 9 AM to 11 PM. The fastest way to reach us is WhatsApp — send your message and we will reply shortly.'
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={waMsg('هلا محل شوب، عندي استفسار 🙏', 'Hi Mahal Shop, I have a question 🙏')}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border bg-card p-5 hover:border-green-500 transition-colors"
            >
              <MessageCircle className="h-7 w-7 text-green-600 mb-2" />
              <p className="font-bold mb-1">{L(lang, 'واتساب (الأسرع)', 'WhatsApp (fastest)')}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">+965 {brand.whatsapp}</p>
            </a>
            <a
              href={`tel:+965${brand.whatsapp.replace(/\D/g, '')}`}
              className="rounded-xl border bg-card p-5 hover:border-accent/50 transition-colors"
            >
              <Phone className="h-7 w-7 text-gold-deep mb-2" />
              <p className="font-bold mb-1">{L(lang, 'هاتف المتجر', 'Store phone')}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">+965 {brand.whatsapp}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {L(lang, 'اتصال مباشر خلال أوقات العمل', 'Direct call during working hours')}
              </p>
            </a>
            <div className="rounded-xl border bg-card p-5">
              <MapPin className="h-7 w-7 text-gold-deep mb-2" />
              <p className="font-bold mb-1">{L(lang, 'موقعنا', 'Our location')}</p>
              <p className="text-sm text-muted-foreground">
                {L(lang, 'الكويت — نخدم كل المحافظات', 'Kuwait — serving all governorates')}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <ShieldCheck className="h-7 w-7 text-gold-deep mb-2" />
              <p className="font-bold mb-1">{L(lang, 'أوقات الرد', 'Response hours')}</p>
              <p className="text-sm text-muted-foreground">
                {L(lang, 'يومياً 9 صباحاً – 11 مساءً', 'Daily 9 AM – 11 PM')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SHIPPING ===================== */}
      {infoPage === 'shipping' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5">
            <Truck className="h-6 w-6 text-gold-deep mb-2" />
            <p className="font-bold mb-1">{L(lang, 'سعر التوصيل الحالي', 'Current delivery price')}</p>
            {shipping ? (
              <p className="text-sm leading-7">
                {lang === 'en' ? (
                  <>
                    • Delivery: <b>{kwd(shipping.price)} KWD</b> to all Kuwait governorates
                    <br />
                    • <b>FREE</b> delivery for orders of <b>{kwd(shipping.freeThreshold)} KWD</b> and above
                  </>
                ) : (
                  <>
                    • التوصيل: <b>{kwd(shipping.price)} د.ك</b> لجميع محافظات الكويت
                    <br />
                    • توصيل <b>مجاني</b> للطلبات من <b>{kwd(shipping.freeThreshold)} د.ك</b> وما فوق
                  </>
                )}
                {shipping.note && (
                  <>
                    <br />• {shipping.note}
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm">{L(lang, 'جاري تحميل تفاصيل التوصيل...', 'Loading delivery details…')}</p>
            )}
          </div>
          <p>
            {lang === 'en' ? (
              <>
                We deliver to every Kuwait governorate: <b>Capital, Hawalli, Farwaniya, Ahmadi,
                Jahra and Mubarak Al-Kabeer</b> — the same price everywhere, no exceptions.
              </>
            ) : (
              <>
                نوصّل لكل محافظات الكويت: <b>العاصمة، حولي، الفروانية، الأحمدي، الجهراء،
                ومبارك الكبير</b> — نفس السعر لكل المناطق بدون استثناء.
              </>
            )}
          </p>
          <p>
            {lang === 'en' ? (
              <>
                After you order, it moves automatically to <b>“Shipped”</b> at <b>10 AM</b> every
                day, and <b>arrives at the time coordinated with our team and the courier</b> —
                our team calls you beforehand to confirm the time that suits you.
              </>
            ) : (
              <>
                بعد ما تطلب، طلبك يتحول تلقائياً إلى <b>«تم الشحن»</b> الساعة <b>10
                صباحاً</b> من كل يوم، و<b>سيصل في الميعاد المنسق مع خدمة العملاء
                والمندوب</b> — خدمة العملاء تتواصل معك قبلها لتأكيد الوقت المناسب لك.
              </>
            )}
          </p>
          <p>
            {lang === 'en' ? (
              <>
                Pay <b>on delivery</b> (cash) — hand the amount to the courier when your order
                arrives, and you may open and check the order before paying.
              </>
            ) : (
              <>
                الدفع <b>عند الاستلام</b> (كاش) — تعطي المندوب المبلغ عند وصول الطلب،
                وتقدر تفتح الطلب وتتأكد منه قبل الدفع.
              </>
            )}
          </p>
        </div>
      )}

      {/* ===================== RETURNS ===================== */}
      {infoPage === 'returns' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            {lang === 'en' ? (
              <>
                Your satisfaction comes first. If you receive a product <b>different from what
                you ordered</b> or with a <b>manufacturing defect</b>, you can request an
                exchange or return within <b>3 days</b> of delivery under these conditions:
              </>
            ) : (
              <>
                رضاك أهم شيء عندنا. إذا وصلك منتج <b>مختلف عن اللي طلبته</b> أو فيه
                <b> عيب مصنعي</b>، تقدر تطلبه استبداله أو استرجاعه خلال <b>3 أيام</b> من
                تاريخ الاستلام بالشروط التالية:
              </>
            )}
          </p>
          <ul className="space-y-2.5 pr-2">
            {(lang === 'en'
              ? [
                  'The product in its original condition with all accessories and packaging.',
                  'Include your order invoice or order number when contacting us.',
                  'Returns apply to unused products only (for hygiene reasons, perfumes and personal-care items cannot be exchanged once opened).',
                  `Original delivery fees (${shipping ? kwd(shipping.price) : '1.000'} KWD) are non-refundable on full-order returns.`,
                ]
              : [
                  'المنتج بحالته الأصلية وكامل ملحقاته وتغليفه.',
                  'إرفاق فاتورة الطلب أو رقم الطلب عند التواصل.',
                  'الاسترجاع متاح للمنتجات غير المستخدمة فقط (لأسباب صحية لا تُستبدل العطور والمنتجات الشخصية بعد الفتح).',
                  `رسوم التوصيل الأصلية (${shipping ? kwd(shipping.price) : '1.000'} د.ك) غير مسترجعة عند الاسترجاع الكامل للطلب.`,
                ]
            ).map((li, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-sm leading-7">{li}</span>
              </li>
            ))}
          </ul>
          <p>
            {lang === 'en' ? (
              <>
                To request an exchange or return, message us on WhatsApp{' '}
                <a href={waMsg('هلا، أبي أستبدل/أسترجع منتج، رقم طلبي: ', 'Hi, I want to exchange/return a product, my order number: ')} target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold hover:underline" dir="ltr">
                  +965 {brand.whatsapp}
                </a>{' '}
                with your order number and a photo of the product — our team will arrange
                everything with you.
              </>
            ) : (
              <>
                لطلب الاستبدال أو الاسترجاع، راسلنا على الواتساب{' '}
                <a href={waMsg('هلا، أبي أستبدل/أسترجع منتج، رقم طلبي: ', 'Hi, I want to exchange/return a product, my order number: ')} target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold hover:underline" dir="ltr">
                  +965 {brand.whatsapp}
                </a>{' '}
                مع رقم الطلب وصورة للمنتج، وفريقنا يرتب كل شيء معك.
              </>
            )}
          </p>
        </div>
      )}

      {/* ===================== FAQ ===================== */}
      {infoPage === 'faq' && (
        <div className="space-y-3">
          {(lang === 'en'
            ? [
                {
                  q: 'How do I order?',
                  a: 'Pick a product, tap “Add to Cart”, then “Checkout” — just enter your name, phone and address, done! We never ask for a card or bank details.',
                },
                {
                  q: 'How do I pay?',
                  a: 'Cash on Delivery — pay the courier when the order arrives at your door, and you can inspect it before paying.',
                },
                {
                  q: 'What are the delivery fees?',
                  a: shipping
                    ? `Delivery is ${kwd(shipping.price)} KWD to all Kuwait governorates, and FREE for orders of ${kwd(shipping.freeThreshold)} KWD and above.`
                    : 'Delivery is 1.00 KWD to all Kuwait governorates, and FREE for orders of 30.00 KWD and above.',
                },
                {
                  q: 'When will my order arrive?',
                  a: 'Orders ship automatically every day at 10 AM and arrive at the time coordinated with our team and the courier — usually within 24 to 48 hours inside Kuwait.',
                },
                {
                  q: 'What is my account and password?',
                  a: 'When you place your first order, an account is created automatically with your phone number — and your password is your phone number. Sign in from “My Account” to track orders and change your password anytime.',
                },
                {
                  q: 'Can I return or exchange a product?',
                  a: 'Yes — within 3 days of delivery if the product is different or has a manufacturing defect and is in original condition. Contact us on WhatsApp and we will take care of everything.',
                },
                {
                  q: 'Where do I track my order?',
                  a: 'From the “Track Order” page in the footer — enter your order number and phone to see the status step by step, or sign in from “My Account” to see all your orders.',
                },
              ]
            : [
                {
                  q: 'شلون أطلب؟',
                  a: 'اختر المنتج، اضغط «أضف للسلة»، بعدها «إتمام الطلب» — اكتب اسمك ورقم هاتفك وعنوانك فقط، وخلص! ما نطلب بطاقة ولا معلومات بنكية.',
                },
                {
                  q: 'شلون أدفع؟',
                  a: 'الدفع عند الاستلام (كاش) — تعطي المندوب المبلغ عند وصول الطلب لباب بيتك، وتقدر تشوف الطلب قبل ما تدفع.',
                },
                {
                  q: 'كم رسوم التوصيل؟',
                  a: shipping
                    ? `التوصيل ${kwd(shipping.price)} د.ك لكل محافظات الكويت، ومجاني للطلبات من ${kwd(shipping.freeThreshold)} د.ك وما فوق.`
                    : 'التوصيل 1.00 د.ك لكل محافظات الكويت، ومجاني للطلبات من 30.00 د.ك وما فوق.',
                },
                {
                  q: 'متى يوصل طلبي؟',
                  a: 'الطلبات تشحن تلقائياً كل يوم الساعة 10 صباحاً، والطلب يصلك في الميعاد المنسق مع خدمة العملاء والمندوب — عادة خلال 24 إلى 48 ساعة داخل الكويت.',
                },
                {
                  q: 'شنو هو حسابي وكلمة المرور؟',
                  a: 'أول ما تسوي طلب، ينشأ لك حساب تلقائياً برقم هاتفك — وكلمة المرور هي نفس رقم هاتفك. تقدر تدخل من «حسابي» وتتابع طلباتك وتغيّر كلمة المرور متى ما تبي.',
                },
                {
                  q: 'أقدر أرجّع أو أستبدل منتج؟',
                  a: 'نعم — خلال 3 أيام من الاستلام إذا كان المنتج مختلف أو فيه عيب مصنعي وبحالته الأصلية. تواصل معنا على الواتساب ونتكفل بكل شيء.',
                },
                {
                  q: 'وين أتابع طلبي؟',
                  a: 'من صفحة «تتبع طلبك» في الفوتر — اكتب رقم الطلب ورقم هاتفك وشوف حالة الطلب خطوة بخطوة، أو سجل دخولك من «حسابي» وشوف كل طلباتك.',
                },
              ]
          ).map((f, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-start cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <span className="font-bold text-[15px]">{f.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm leading-7 text-foreground/80 border-t pt-3">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===================== PRIVACY ===================== */}
      {infoPage === 'privacy' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            {lang === 'en' ? (
              <>
                Your privacy is a trust we take seriously. We only collect the data needed to
                fulfil your order: name, phone number and address — all stored on secure
                servers and visible only to our order-fulfilment team.
              </>
            ) : (
              <>
                خصوصيتك أمانة عندنا. نجمع فقط البيانات اللازمة لتنفيذ طلبك:
                الاسم، رقم الهاتف، والعنوان — وكلها محفوظة على سيرفرات آمنة ولا يطلع
                عليها أحد غير فريق تنفيذ الطلبات.
              </>
            )}
          </p>
          <ul className="space-y-2.5 pr-2">
            {(lang === 'en'
              ? [
                  'We never ask for or store bank card numbers — Cash on Delivery only.',
                  'We never sell or share your data with any third party for marketing purposes.',
                  'We use anonymous analytics tools solely to improve the shopping experience.',
                  'You can request deletion of your data and account anytime by contacting us on WhatsApp.',
                  'Your phone number is used only to confirm the order and coordinate delivery with the courier.',
                ]
              : [
                  'لا نطلب ولا نخزّن أرقام بطاقات بنكية — الدفع عند الاستلام فقط.',
                  'لا نبيع ولا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية.',
                  'نستخدم أدوات تحليل وإحصاء مجهولة الهوية لتحسين تجربة التسوق فقط.',
                  'يمكنك طلب حذف بياناتك وحسابك في أي وقت عبر التواصل معنا على الواتساب.',
                  'رقم هاتفك يُستخدم فقط للتأكيد على الطلب وتنسيق التوصيل مع المندوب.',
                ]
            ).map((li, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-sm leading-7">{li}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===================== TERMS ===================== */}
      {infoPage === 'terms' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            {lang === 'en'
              ? `By using ${brand.siteName} you agree to the following terms:`
              : `باستخدامك موقع ${brand.siteName} فأنت توافق على الشروط التالية:`}
          </p>
          <ul className="space-y-2.5 pr-2">
            {(lang === 'en'
              ? [
                  'Prices are shown in Kuwaiti Dinar and cover the product only; delivery is added at checkout according to the published shipping policy.',
                  'The store may adjust prices or cancel an order in case of an obvious pricing error, notifying you immediately.',
                  'An order becomes confirmed after our team calls you to confirm the address and delivery time.',
                  'Cash on Delivery is collected by the courier only after handing over the order — we never request prepayment.',
                  'Product photos are illustrative; the actual item may differ slightly (color/packaging) without affecting the specifications.',
                  'The store may decline any order containing incorrect data or signs of abuse.',
                ]
              : [
                  'الأسعار المعروضة بالدينار الكويتي وتشمل المنتج فقط، والتوصيل يُضاف عند الدفع حسب سياسة الشحن المعروضة.',
                  'يحق للمتجر تعديل الأسعار أو إلغاء الطلب إذا كان فيه خطأ واضح في السعر، مع إشعارك فوراً.',
                  'الطلب يصبح مؤكداً بعد اتصال خدمة العملاء بك لتأكيد العنوان وميعاد التوصيل.',
                  'الدفع عند الاستلام يُطلب من المندوب فقط بعد تسليم الطلب — لا نطلب أي دفع مسبق.',
                  'صور المنتجات توضيحية، وقد يختلف المنتج الفعلي بشكل بسيط عن الصورة (اللون/التغليف) دون تأثير على المواصفات.',
                  'يحق للمتجر رفض أي طلب فيه بيانات غير صحيحة أو إساءة استخدام.',
                ]
            ).map((li, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-sm leading-7">{li}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground border-t pt-4">
            {L(lang, 'آخر تحديث: ', 'Last updated: ')}
            {new Date().toLocaleDateString(lang === 'en' ? 'en-KW' : 'ar-KW', { year: 'numeric', month: 'long' })}
          </p>
        </div>
      )}

      {/* bottom CTA */}
      <div className="mt-10 rounded-xl bg-primary text-primary-foreground p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 hero-glow" aria-hidden="true" />
        <p className="relative font-bold mb-1">{L(lang, 'عندك سؤال ثاني؟', 'Got another question?')}</p>
        <p className="relative text-sm text-primary-foreground/70 mb-4">
          {L(lang, 'فريقنا يرد عليك بأسرع وقت على الواتساب', 'Our team replies fastest on WhatsApp')}
        </p>
        <a
          href={waMsg('هلا محل شوب، عندي سؤال 🙏', 'Hi Mahal Shop, I have a question 🙏')}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 text-sm font-bold transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span dir="ltr">+965 {brand.whatsapp}</span>
        </a>
      </div>
    </div>
  );
}
