'use client';

/**
 * AdminReviewsView — founder moderation panel for product reviews.
 * Pending queue (needs approval) + approved list, one-tap approve/reject/delete.
 *
 * Verified purchases auto-publish; unverified reviews wait here.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/components/admin/admin-products-view';
import { useAppStore } from '@/lib/stores/app-store';
import {
  Star,
  BadgeCheck,
  Check,
  X,
  Trash2,
  Search,
  Inbox,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminReview {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  product: { name: string; slug: string; thumb: string | null };
}

interface Stats {
  pending: number;
  approved: number;
  verified: number;
}

type Tab = 'pending' | 'approved';

export function AdminReviewsView() {
  const auth = useAdminAuth();
  const openProduct = useAppStore((s) => s.openProduct);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, verified: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: tab });
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`/api/admin/reviews?${params}`, { headers: auth });
      if (r.ok) {
        const d = await r.json();
        setReviews(d.reviews || []);
        setStats(d.stats || { pending: 0, approved: 0, verified: 0 });
      }
    } catch {
      toast.error('تعذر تحميل التقييمات');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function act(id: string, action: 'approve' | 'reject' | 'verify') {
    setBusyId(id);
    try {
      const r = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (r.ok) {
        toast.success(
          action === 'approve'
            ? 'تم نشر التقييم'
            : action === 'reject'
              ? 'تم إخفاء التقييم'
              : 'تم توثيق ونشر التقييم'
        );
        await load();
      } else toast.error('فشل تنفيذ العملية');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('حذف التقييم نهائياً؟')) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
        headers: auth,
      });
      if (r.ok) {
        toast.success('تم الحذف');
        await load();
      } else toast.error('فشل الحذف');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            تقييمات العملاء
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            المشتري الموثّق يُنشر تلقائياً — والباقي ينتظر موافقتك هنا
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          تحديث
        </Button>
      </div>

      {/* stats + tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tab === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('pending')}
          className="gap-2"
        >
          <Inbox className="h-3.5 w-3.5" />
          بانتظار المراجعة
          {stats.pending > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5">
              {stats.pending}
            </Badge>
          )}
        </Button>
        <Button
          variant={tab === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('approved')}
          className="gap-2"
        >
          <Check className="h-3.5 w-3.5" />
          المنشورة ({stats.approved})
        </Button>
        <Badge variant="secondary" className="gap-1">
          <BadgeCheck className="h-3 w-3" />
          مشترٍ موثّق: {stats.verified}
        </Badge>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="ابحث في التقييمات…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">
            {tab === 'pending' ? 'لا توجد تقييمات بانتظار المراجعة' : 'لا توجد تقييمات منشورة بعد'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            كل ما يصل سيظهر هنا فوراً
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rv) => (
            <div key={rv.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {rv.product.thumb && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={rv.product.thumb}
                      alt=""
                      className="h-12 w-12 rounded-lg object-contain bg-white border shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <button
                      onClick={() => openProduct(rv.product.slug)}
                      className="font-medium text-sm hover:text-primary text-right truncate block max-w-full"
                      title={rv.product.name}
                    >
                      {rv.product.name}
                    </button>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i <= rv.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/40'
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {rv.customerName}
                      </span>
                      {rv.isVerified && (
                        <Badge className="bg-green-100 text-green-800 gap-1 text-[10px]">
                          <BadgeCheck className="h-3 w-3" />
                          مشترٍ موثّق
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(rv.createdAt).toLocaleDateString('ar-KW')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!rv.isApproved ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => act(rv.id, 'approve')}
                        disabled={busyId === rv.id}
                        className="gap-1.5 h-8"
                      >
                        <Check className="h-3.5 w-3.5" />
                        نشر
                      </Button>
                      {!rv.isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(rv.id, 'verify')}
                          disabled={busyId === rv.id}
                          className="gap-1.5 h-8"
                          title="توثيق الشراء ونشر التقييم"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          توثيق
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act(rv.id, 'reject')}
                      disabled={busyId === rv.id}
                      className="gap-1.5 h-8"
                    >
                      <X className="h-3.5 w-3.5" />
                      إخفاء
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(rv.id)}
                    disabled={busyId === rv.id}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    title="حذف نهائي"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {(rv.title || rv.comment) && (
                <div className="mt-3 pt-3 border-t/50 border-t">
                  {rv.title && <p className="font-bold text-sm mb-1">{rv.title}</p>}
                  {rv.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {rv.comment}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
