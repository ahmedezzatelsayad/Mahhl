'use client';

/**
 * AdminSeoView — search engine optimization control panel.
 * Edit site-wide title/description/keywords, canonical domain,
 * Google & Bing verification codes, plus SEO health links
 * (sitemap.xml, robots.txt, llms.txt) and a launch checklist.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Search, Save, Loader2, Globe, KeyRound, ListChecks,
  MapPin, Bot, ExternalLink, BadgeCheck,
} from 'lucide-react';

interface SeoForm {
  siteTitle: string;
  titleTemplate: string;
  description: string;
  keywords: string;
  siteUrl: string;
  googleVerification: string;
  bingVerification: string;
}

const CHECKLIST: { title: string; body: string }[] = [
  {
    title: '1. اربط دومينك الحقيقي',
    body: 'بعد نشر الموقع على دومينك (مثال mahalshop.com) ضع الرابط الكامل في حقل "رابط الموقع" هنا واحفظ. كل الروابطCanonical وsitemap وllms.txt ستتحدث تلقائياً.',
  },
  {
    title: '2. أضف الموقع لـ Google Search Console',
    body: 'ادخل search.google.com/search-console → أضف المورد (URL Prefix) → الصق رابط موقعك → حمّل ملف التحقق أو استخدم HTML tag والصق كود التحقق في الحقل أدناه ثم أكّد الملكية.',
  },
  {
    title: '3. أرسل خريطة الموقع',
    body: 'من Search Console → Sitemaps → اكتب sitemap.xml وأرسلها. تحتوي على كل الـ 2638 منتج و38 فئة بروابط مباشرة.',
  },
  {
    title: '4. Bing Webmaster Tools',
    body: 'نفس الخطوات في bing.com/webmasters — يمكن استيراد الموقع مباشرة من Google Search Console. الصق كود التحقق في الحقل المخصص.',
  },
  {
    title: '5. تهيئة الذكاء الاصطناعي (مكتملة تلقائياً)',
    body: 'ملف llms.txt وllms-full.txt مفعّلان ويعرضان كل المنتجات وأسعارها بالدينار الكويتي للـ ChatGPT وPerplexity وClaude، وrobots.txt يسمح لكل عناكب الذكاء الاصطناعي بالوصول.',
  },
];

export function AdminSeoView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const [form, setForm] = useState<SeoForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/seo', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) setForm(await res.json());
      } catch {
        toast.error('فشل تحميل إعدادات SEO');
      } finally {
        setLoading(false);
      }
    })();
  }, [adminToken]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setForm(d.settings);
        toast.success('تم حفظ إعدادات SEO — سارية على كل صفحات الموقع');
      } else {
        toast.error('فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const seoLinks = [
    { label: 'sitemap.xml — خريطة كل المنتجات', href: '/sitemap.xml' },
    { label: 'robots.txt — عناكب البحث والذكاء', href: '/robots.txt' },
    { label: 'llms.txt — ملف نماذج الذكاء (مختصر)', href: '/llms.txt' },
    { label: 'llms-full.txt — كل المنتجات بالأسعار', href: '/llms-full.txt' },
    { label: 'manifest.json — تطبيق الجوال', href: '/manifest.webmanifest' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-primary" />
          تحسين محركات البحث SEO
        </h1>
        <p className="text-sm text-muted-foreground">
          هوية الموقع في نتائج البحث — تُطبّق على كل الصفحات والمنتجات تلقائياً
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              الهوية الأساسية
            </CardTitle>
            <CardDescription>
              العنوان والوصف الذي يظهران في نتائج Google لصفحة الرئيسية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seo-title">عنوان الموقع (Title)</Label>
              <Input
                id="seo-title"
                value={form.siteTitle}
                maxLength={120}
                onChange={(e) => setForm((f) => f && { ...f, siteTitle: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                {form.siteTitle.length}/120 حرف — يظهر كعنوان أزرق في نتائج البحث
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-template">قالب عناوين الصفحات</Label>
              <Input
                id="seo-template"
                dir="ltr"
                value={form.titleTemplate}
                maxLength={80}
                onChange={(e) => setForm((f) => f && { ...f, titleTemplate: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                استخدم %s لموضع اسم الصفحة — مثال: &quot;%s | محل شوب&quot;
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-desc">وصف الموقع (Meta Description)</Label>
              <Textarea
                id="seo-desc"
                value={form.description}
                maxLength={400}
                rows={3}
                onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                {form.description.length}/400 — جملتان تذكران: عدد المنتجات + الكويت + دفع عند الاستلام
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-keywords">الكلمات المفتاحية (مفصولة بفواصل)</Label>
              <Textarea
                id="seo-keywords"
                value={form.keywords}
                maxLength={1000}
                rows={2}
                onChange={(e) => setForm((f) => f && { ...f, keywords: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              الدومين والروابط
            </CardTitle>
            <CardDescription>
              الرابط الرسمي للموقع — تُبنى عليه كل روابط المنتجات وخريطة الموقع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seo-url">رابط الموقع (Site URL)</Label>
              <Input
                id="seo-url"
                dir="ltr"
                placeholder="https://mahalshop.com"
                value={form.siteUrl}
                onChange={(e) => setForm((f) => f && { ...f, siteUrl: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                اتركه فارغاً قبل شراء الدومين — سيُستخدم رابط البيئة تلقائياً
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-accent" />
              أكواد التحقق (Search Console / Bing)
            </CardTitle>
            <CardDescription>
              من Google Search Console → الإعدادات → التحقق من الملكية → HTML tag → انسخ الكود فقط
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="seo-google">Google (google-site-verification)</Label>
              <Input
                id="seo-google"
                dir="ltr"
                placeholder="abc123..."
                value={form.googleVerification}
                onChange={(e) => setForm((f) => f && { ...f, googleVerification: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seo-bing">Bing (msvalidate.01)</Label>
              <Input
                id="seo-bing"
                dir="ltr"
                placeholder="abc123..."
                value={form.bingVerification}
                onChange={(e) => setForm((f) => f && { ...f, bingVerification: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="btn-gold border-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ إعدادات SEO
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            ملفات البحث والذكاء الاصطناعي
          </CardTitle>
          <CardDescription>
            مولّدة تلقائياً من قاعدة البيانات — كل منتج وكل فئة بروابطها وأسعارها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {seoLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm hover:border-accent/50 hover:bg-accent/5 transition-colors"
            >
              <span className="font-medium">{l.label}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-accent" />
            خطة الوصول للصفحة الأولى
          </CardTitle>
          <CardDescription>خطوات التحقق والإرسال لمحركات البحث</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {CHECKLIST.map((c, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-sm text-right">
                  <span className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
                    {c.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {c.body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
