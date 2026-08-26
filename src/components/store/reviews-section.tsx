'use client';

/**
 * ReviewsSection — customer ratings & reviews for a product.
 *
 * Global best practice: products with reviews convert up to 270% better
 * (Kissmetrics) and 92% of buyers hesitate without reviews. Verified-purchase
 * reviews (matched against real orders server-side) publish instantly;
 * unverified ones await founder moderation.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, BadgeCheck, ThumbsUp, PenLine, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

export interface ReviewItem {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewSummary {
  count: number;
  average: number;
  distribution: { '5': number; '4': number; '3': number; '2': number; '1': number };
  reviews: ReviewItem[];
  soldCount: number;
  page?: number;
  pages?: number;
}

const EMPTY: ReviewSummary = {
  count: 0,
  average: 0,
  distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  reviews: [],
  soldCount: 0,
};

/** shared hook — powers the compact header line (page 1) AND the paged section */
export function useReviewSummary(slug: string | undefined, page = 1) {
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY);

  const refresh = useCallback(async () => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}&page=${page}`);
      if (r.ok) setSummary(await r.json());
    } catch {
      /* keep empty */
    }
  }, [slug, page]);

  useEffect(() => {
    // reset stale summary when switching products, then fetch fresh data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(EMPTY);
    refresh();
  }, [refresh]);

  return { summary, refresh };
}

export function StarsRow({ value, size = 4 }: { value: number; size?: 3 | 4 }) {
  const rounded = Math.round(value);
  const dim = size === 3 ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const { t } = useT();
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={t('r.starsOf', { v: value })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${dim} ${
            i <= rounded ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
          }`}
        />
      ))}
    </span>
  );
}

function timeAgo(iso: string, lang: 'ar' | 'en', t: (k: string, v?: Record<string, string | number>) => string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return t('r.today');
  if (days === 1) return t('r.yesterday');
  if (days < 30) return t('r.daysAgo', { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t('r.monthsAgo', { n: months });
  return t('r.yearsAgo', { n: Math.floor(months / 12) });
}

/** compact numbered pagination: 1 … 4 5 6 … 17 */
function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, current - 1, current, current + 1, total - 1, total].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}

function firstName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[0] + (parts.length > 1 ? ' ' + (parts[parts.length - 1][0] || '') + '.' : '');
}

export function ReviewsSection({ slug }: { slug: string }) {
  const { t, lang } = useT();
  const [page, setPage] = useState(1);
  const { summary, refresh } = useReviewSummary(slug, page);
  const listTopRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (rating < 1) {
      setFeedback({ ok: false, msg: t('r.starsFirst') });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, customerName: name, rating, title, comment, phone }),
      });
      const d = await r.json();
      if (!r.ok) {
        setFeedback({ ok: false, msg: d.error || t('r.fail') });
      } else {
        // success toast (form closes, so an inline message would be hidden)
        toast.success(d.message || t('r.sent'));
        setRating(0);
        setTitle('');
        setComment('');
        await refresh();
        setShowForm(false);
      }
    } catch {
      setFeedback({ ok: false, msg: t('r.netFail') });
    } finally {
      setBusy(false);
    }
  }

  const dist = summary.distribution;

  return (
    <section id="reviews" className="scroll-mt-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          {t('r.customerReviews')}
          {summary.count > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({summary.count})
            </span>
          )}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5"
        >
          <PenLine className="h-3.5 w-3.5" />
          {t('r.write')}
        </Button>
      </div>

      {/* submit form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mb-6 rounded-xl border bg-muted/30 p-4 space-y-3"
        >
          <div>
            <p className="text-sm font-medium mb-1.5">{t('r.yourRating')}</p>
            <div className="flex gap-1" role="radiogroup" aria-label={t('r.yourRating')}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={(hover || rating) === i}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(i)}
                  className="cursor-pointer p-0.5"
                >
                  <Star
                    className={`h-7 w-7 transition-transform ${
                      i <= (hover || rating)
                        ? 'fill-yellow-400 text-yellow-400 scale-110'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder={t('r.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
            />
            <Input
              placeholder={t('r.phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              dir="ltr"
              className="text-left placeholder:text-right"
            />
          </div>
          <Input
            placeholder={t('r.titlePh')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder={t('r.commentPh')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <p className="text-[11px] text-muted-foreground">
            {t('r.phoneNote')}
          </p>
          {feedback && (
            <p className={`text-sm ${feedback.ok ? 'text-green-700' : 'text-destructive'}`}>
              {feedback.msg}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('r.send')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {t('r.cancel')}
            </Button>
          </div>
        </form>
      )}

      {summary.count === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium mb-1">{t('r.empty')}</p>
          <p className="text-sm text-muted-foreground">
            {t('r.emptySub')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* summary card */}
          <div className="rounded-xl border bg-muted/30 p-4 h-fit">
            <div className="text-center mb-3">
              <p className="text-4xl font-extrabold">{summary.average.toFixed(1)}</p>
              <StarsRow value={summary.average} />
              <p className="text-xs text-muted-foreground mt-1">
                {t('r.basedOn', { n: summary.count })}
              </p>
            </div>
            <div className="space-y-1.5">
              {(['5', '4', '3', '2', '1'] as const).map((k) => {
                const n = dist[k];
                const pct = summary.count ? Math.round((n / summary.count) * 100) : 0;
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted-foreground shrink-0">{k} ★</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-muted-foreground tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* list */}
          <div className="md:col-span-2 space-y-4">
            <div ref={listTopRef} />
            {summary.reviews.map((rv) => (
              <article key={rv.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{firstName(rv.customerName)}</span>
                    {rv.isVerified && (
                      <Badge className="bg-green-100 text-green-800 border border-green-200 gap-1 text-[10px]">
                        <BadgeCheck className="h-3 w-3" />
                        {t('r.verified')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(rv.createdAt, lang, t)}
                  </span>
                </div>
                <StarsRow value={rv.rating} size={3} />
                {rv.title && <p className="font-bold mt-2">{rv.title}</p>}
                {rv.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 whitespace-pre-wrap">
                    {rv.comment}
                  </p>
                )}
                {rv.helpfulCount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {t('r.helpful', { n: rv.helpfulCount })}
                  </p>
                )}
              </article>
            ))}

            {/* Amazon-style numbered pagination — 7 reviews per page */}
            {(summary.pages || 1) > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2 flex-wrap" dir="rtl">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(summary.page || 1) <= 1}
                  onClick={() => {
                    setPage((pv) => Math.max(1, pv - 1));
                    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {t('r.prev')}
                </Button>
                {pageNumbers(summary.page || 1, summary.pages || 1).map((pn, i) =>
                  pn === '…' ? (
                    <span key={`gap${i}`} className="px-1 text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={pn}
                      variant={pn === (summary.page || 1) ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8 text-sm"
                      aria-current={pn === (summary.page || 1) ? 'page' : undefined}
                      onClick={() => {
                        setPage(pn);
                        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      {pn}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(summary.page || 1) >= (summary.pages || 1)}
                  onClick={() => {
                    setPage((pv) => Math.min(summary.pages || 1, pv + 1));
                    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {t('r.next')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
