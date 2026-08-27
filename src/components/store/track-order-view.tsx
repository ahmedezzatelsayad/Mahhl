'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { Search, PackageSearch, Loader2, MessageCircle } from 'lucide-react';
import { OrderCard, TrackOrder } from '@/components/store/order-tracking';
import { useAppStore } from '@/lib/stores/app-store';
import { useBrand, waHref } from '@/components/store/header';

/** Guest order tracking — order number + phone, no login needed */
export function TrackOrderView() {
  const { t, lang } = useT();
  const setView = useAppStore((s) => s.setView);
  const trackPrefill = useAppStore((s) => s.trackPrefill);
  const setTrackPrefill = useAppStore((s) => s.setTrackPrefill);
  const brand = useBrand();
  const [form, setForm] = useState({ orderNumber: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [autoTracked, setAutoTracked] = useState(false);

  // Prefill coming from the AI agent receipt card (order + phone)
  useEffect(() => {
    if (trackPrefill && !autoTracked) {
      setForm({ orderNumber: trackPrefill.orderNumber, phone: trackPrefill.phone });
      setAutoTracked(true);
      // auto-submit once so the customer lands directly on their order
      (async () => {
        setBusy(true);
        try {
          const res = await fetch('/api/orders/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber: trackPrefill.orderNumber, phone: trackPrefill.phone }),
          });
          const data = await res.json();
          if (res.ok) setOrder(data.order);
        } catch {
          /* customer can retry manually */
        } finally {
          setBusy(false);
          setTrackPrefill(null);
        }
      })();
    }
  }, [trackPrefill, autoTracked, setTrackPrefill]);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOrder(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
      } else {
        toast.error(data.error || t('tr.notFound'));
      }
    } catch {
      toast.error(t('tr.connFail'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <PackageSearch className="h-8 w-8 text-gold-deep" />
        </div>
        <h1 className="text-2xl font-extrabold">{t('tr.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('tr.sub')}
        </p>
      </div>

      <form onSubmit={handleTrack} className="border rounded-xl bg-card p-5 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1 block">{t('tr.orderNo')}</Label>
            <Input
              dir="ltr" required placeholder="ORD-XXXXXXX"
              className="font-mono"
              value={form.orderNumber}
              onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block">{t('tr.phone')}</Label>
            <Input
              type="tel" dir="ltr" required placeholder="5xxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" className="w-full btn-gold border-0" size="lg" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              <Search className="h-4 w-4 ml-1" /> {t('tr.search')}
            </>
          )}
        </Button>
      </form>

      {order && (
        <div className="space-y-4 animate-in fade-in">
          <OrderCard order={order} />
        </div>
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
        <p>{t('tr.noNumber')}</p>
        <div className="flex justify-center gap-2">
          <a
            href={waHref(brand.whatsapp, lang === 'en' ? 'Hi Mahal Shop, I am looking for my order number 🙏' : 'هلا محل شوب، أدور على رقم طلبي 🙏')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white px-4 py-2 font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> {t('tr.whatsapp')}
          </a>
          <Button variant="outline" onClick={() => setView('account')}>
            {t('tr.loginHint')}
          </Button>
        </div>
      </div>
    </div>
  );
}
