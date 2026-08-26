'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type InfoPage } from '@/lib/stores/app-store';
import { Button } from '@/components/ui/button';
import {
  Store, MessageCircle, Truck, ShieldCheck, RefreshCcw, HelpCircle,
  Lock, FileText, Phone, MapPin, ChevronDown,
} from 'lucide-react';
import { useBrand, waHref } from '@/components/store/header';

interface ShippingInfo {
  price: number;
  freeThreshold: number;
  note: string;
}

const PAGE_TITLES: Record<InfoPage, { title: string; icon: typeof Store }> = {
  about: { title: 'من نحن', icon: Store },
  contact: { title: 'تواصل معنا', icon: Phone },
  shipping: { title: 'الشحن والتوصيل', icon: Truck },
  returns: { title: 'الاستبدال والاسترجاع', icon: RefreshCcw },
  faq: { title: 'الأسئلة الشائعة', icon: HelpCircle },
  privacy: { title: 'سياسة الخصوصية', icon: Lock },
  terms: { title: 'الشروط والأحكام', icon: FileText },
};

export function InfoView() {
  const infoPage = useAppStore((s) => s.infoPage);
  const brand = useBrand();
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

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <Icon className="h-8 w-8 text-gold-deep" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{meta.title}</h1>
        <div className="h-1 w-16 btn-gold rounded-full mx-auto mt-3" aria-hidden="true" />
      </div>

      {/* ===================== ABOUT ===================== */}
      {infoPage === 'about' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            <b>{brand.siteName}</b> متجر إلكتروني كويتي، هدفنا نوفر لك تجربة تسوق سهلة
            وسريعة — أكثر من <b>2,600 منتج</b> في الألعاب والإلكترونيات والساعات
            والعطور والأدوات المنزلية وغيرها، بأسعار واضحة بالدينار الكويتي وبدون
            أي رسوم خفية.
          </p>
          <p>
            إحنا نعرف إن وقتك ثمين، عشان كذا خلينا كل شيء بسيط: تختار المنتج، تكتب
            اسمك ورقمك وعنوانك، وتدفع <b>عند الاستلام</b> — بدون بطاقة وبدون تعقيد.
            ونوصّل لكل محافظات الكويت: العاصمة، حولي، الفروانية، الجهراء، الأحمدي،
            ومبارك الكبير.
          </p>
          <p>
            اللي يفرّقنا عن غيرنا إن عندنا <b>مساعد ذكي</b> يفهم ذوقك: من زيارك
            للمتجر يقترح لك منتجات تناسبك وتساعدك تلاقي اللي تدور عليه بأسرع وقت —
            جربه من زر «تحدث مع المحل» بأي وقت.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              ['+2,600', 'منتج متوفر'],
              ['كل الكويت', 'توصيل للمحافظات الست'],
              ['دفع عند الاستلام', 'آمن ومريح'],
            ].map(([v, l]) => (
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
            فريقنا موجود لخدمتك كل يوم من 9 صباحاً إلى 11 مساءً. أسرع طريقة توصلنا
            فيها هي الواتساب — ارسل رسالتك ونرد عليك بأقرب وقت.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={wa('هلا محل شوب، عندي استفسار 🙏')}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border bg-card p-5 hover:border-green-500 transition-colors"
            >
              <MessageCircle className="h-7 w-7 text-green-600 mb-2" />
              <p className="font-bold mb-1">واتساب (الأسرع)</p>
              <p className="text-sm text-muted-foreground" dir="ltr">+965 {brand.whatsapp}</p>
            </a>
            <a
              href={`tel:+965${brand.whatsapp.replace(/\D/g, '')}`}
              className="rounded-xl border bg-card p-5 hover:border-accent/50 transition-colors"
            >
              <Phone className="h-7 w-7 text-gold-deep mb-2" />
              <p className="font-bold mb-1">هاتف المتجر</p>
              <p className="text-sm text-muted-foreground" dir="ltr">+965 {brand.whatsapp}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">اتصال مباشر خلال أوقات العمل</p>
            </a>
            <div className="rounded-xl border bg-card p-5">
              <MapPin className="h-7 w-7 text-gold-deep mb-2" />
              <p className="font-bold mb-1">موقعنا</p>
              <p className="text-sm text-muted-foreground">الكويت — نخدم كل المحافظات</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <ShieldCheck className="h-7 w-7 text-gold-deep mb-2" />
              <p className="font-bold mb-1">أوقات الرد</p>
              <p className="text-sm text-muted-foreground">يومياً 9 صباحاً – 11 مساءً</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SHIPPING ===================== */}
      {infoPage === 'shipping' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5">
            <Truck className="h-6 w-6 text-gold-deep mb-2" />
            <p className="font-bold mb-1">سعر التوصيل الحالي</p>
            {shipping ? (
              <p className="text-sm leading-7">
                • التوصيل: <b>{shipping.price.toFixed(2)} د.ك</b> لجميع محافظات الكويت
                <br />
                • توصيل <b>مجاني</b> للطلبات من <b>{shipping.freeThreshold.toFixed(2)} د.ك</b> وما فوق
                {shipping.note && (
                  <>
                    <br />• {shipping.note}
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm">جاري تحميل تفاصيل التوصيل...</p>
            )}
          </div>
          <p>
            نوصّل لكل محافظات الكويت: <b>العاصمة، حولي، الفروانية، الأحمدي، الجهراء،
            ومبارك الكبير</b> — نفس السعر لكل المناطق بدون استثناء.
          </p>
          <p>
            بعد ما تطلب، طلبك يتحول تلقائياً إلى <b>«تم الشحن»</b> الساعة <b>10
            صباحاً</b> من كل يوم، و<b>سيصل في الميعاد المنسق مع خدمة العملاء
            والمندوب</b> — خدمة العملاء تتواصل معك قبلها لتأكيد الوقت المناسب لك.
          </p>
          <p>
            الدفع <b>عند الاستلام</b> (كاش) — تعطي المندوب المبلغ عند وصول الطلب،
            وتقدر تفتح الطلب وتتأكد منه قبل الدفع.
          </p>
        </div>
      )}

      {/* ===================== RETURNS ===================== */}
      {infoPage === 'returns' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            رضاك أهم شيء عندنا. إذا وصلك منتج <b>مختلف عن اللي طلبته</b> أو فيه
            <b> عيب مصنعي</b>، تقدر تطلبه استبداله أو استرجاعه خلال <b>3 أيام</b> من
            تاريخ الاستلام بالشروط التالية:
          </p>
          <ul className="space-y-2.5 pr-2">
            {[
              'المنتج بحالته الأصلية وكامل ملحقاته وتغليفه.',
              'إرفاق فاتورة الطلب أو رقم الطلب عند التواصل.',
              'الاسترجاع متاح للمنتجات غير المستخدمة فقط (لأسباب صحية لا تُستبدل العطور والمنتجات الشخصية بعد الفتح).',
              `رسوم التوصيل الأصلية (${shipping ? shipping.price.toFixed(2) : '1.00'} د.ك) غير مسترجعة عند الاسترجاع الكامل للطلب.`,
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-sm leading-7">{t}</span>
              </li>
            ))}
          </ul>
          <p>
            لطلب الاستبدال أو الاسترجاع، راسلنا على الواتساب{' '}
            <a href={wa('هلا، أبي أستبدل/أسترجع منتج، رقم طلبي: ')} target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold hover:underline" dir="ltr">
              +965 {brand.whatsapp}
            </a>{' '}
            مع رقم الطلب وصورة للمنتج، وفريقنا يرتب كل شيء معك.
          </p>
        </div>
      )}

      {/* ===================== FAQ ===================== */}
      {infoPage === 'faq' && (
        <div className="space-y-3">
          {[
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
                ? `التوصيل ${shipping.price.toFixed(2)} د.ك لكل محافظات الكويت، ومجاني للطلبات من ${shipping.freeThreshold.toFixed(2)} د.ك وما فوق.`
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
          ].map((f, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
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
            خصوصيتك أمانة عندنا. نجمع فقط البيانات اللازمة لتنفيذ طلبك:
            الاسم، رقم الهاتف، والعنوان — وكلها محفوظة على سيرفرات آمنة ولا يطلع
            عليها أحد غير فريق تنفيذ الطلبات.
          </p>
          <ul className="space-y-2.5 pr-2">
            {[
              'لا نطلب ولا نخزّن أرقام بطاقات بنكية — الدفع عند الاستلام فقط.',
              'لا نبيع ولا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية.',
              'نستخدم أدوات تحليل وإحصاء مجهولة الهوية لتحسين تجربة التسوق فقط.',
              'يمكنك طلب حذف بياناتك وحسابك في أي وقت عبر التواصل معنا على الواتساب.',
              'رقم هاتفك يُستخدم فقط للتأكيد على الطلب وتنسيق التوصيل مع المندوب.',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-sm leading-7">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===================== TERMS ===================== */}
      {infoPage === 'terms' && (
        <div className="space-y-5 text-[15px] leading-8 text-foreground/90">
          <p>
            باستخدامك موقع {brand.siteName} فأنت توافق على الشروط التالية:
          </p>
          <ul className="space-y-2.5 pr-2">
            {[
              'الأسعار المعروضة بالدينار الكويتي وتشمل المنتج فقط، والتوصيل يُضاف عند الدفع حسب سياسة الشحن المعروضة.',
              'يحق للمتجر تعديل الأسعار أو إلغاء الطلب إذا كان فيه خطأ واضح في السعر، مع إشعارك فوراً.',
              'الطلب يصبح مؤكداً بعد اتصال خدمة العملاء بك لتأكيد العنوان وميعاد التوصيل.',
              'الدفع عند الاستلام يُطلب من المندوب فقط بعد تسليم الطلب — لا نطلب أي دفع مسبق.',
              'صور المنتجات توضيحية، وقد يختلف المنتج الفعلي بشكل بسيط عن الصورة (اللون/التغليف) دون تأثير على المواصفات.',
              'يحق للمتجر رفض أي طلب فيه بيانات غير صحيحة أو إساءة استخدام.',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-sm leading-7">{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground border-t pt-4">
            آخر تحديث: {new Date().toLocaleDateString('ar-KW', { year: 'numeric', month: 'long' })}
          </p>
        </div>
      )}

      {/* bottom CTA */}
      <div className="mt-10 rounded-xl bg-primary text-primary-foreground p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 hero-glow" aria-hidden="true" />
        <p className="relative font-bold mb-1">عندك سؤال ثاني؟</p>
        <p className="relative text-sm text-primary-foreground/70 mb-4">فريقنا يرد عليك بأسرع وقت على الواتساب</p>
        <a
          href={wa('هلا محل شوب، عندي سؤال 🙏')}
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
