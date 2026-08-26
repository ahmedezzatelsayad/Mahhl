'use client';

/**
 * HeroSlider — premium auto-playing carousel with CLEAR, high-contrast copy.
 *
 * Built to the industry checklist (Baymard 10 UX Requirements, NN/g carousel
 * guidelines, W3C carousel pattern, WCAG 2.2.2, web.dev carousel/LCP advice):
 *  ✅ 5–7s autoplay (founder-controlled) — pauses on hover / hidden tab
 *  ✅ STOPS autoplay after the visitor interacts (arrow / dot / swipe)
 *  ✅ Visible pause/play control (WCAG 2.2.2 "pause, stop, hide")
 *  ✅ Keyboard: ← → navigate (direction-aware), dots + arrows for everyone
 *  ✅ aria-live polite announcements + roledescription carousel
 *  ✅ Inactive slides aria-hidden + their CTAs un-focusable (no ghost tabs)
 *  ✅ Crossfade (no motion sickness) + Ken-Burns only when motion allowed
 *  ✅ First slide eager + fetchPriority=high (LCP), others lazy
 *  ✅ Bilingual: Arabic copy by default, English fields when lang=en
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { useLangStore } from '@/lib/stores/lang-store';
import { useT } from '@/lib/i18n';
import { localizedSlide, type SliderSlide } from '@/lib/slider-types';

export type Slide = SliderSlide;
export type { SlideAction } from '@/lib/slider-types';

const DEFAULT_AUTOPLAY_MS = 5200;

/** Gradient darkens the side the copy sits on — guarantees readable text. */
const SCRIM_RTL =
  'linear-gradient(to left, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 42%, rgba(12,10,9,0.30) 100%)';
const SCRIM_LTR =
  'linear-gradient(to right, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 42%, rgba(12,10,9,0.30) 100%)';

export function HeroSlider({
  slides,
  loading,
  autoplayMs,
}: {
  slides: Slide[];
  loading?: boolean;
  /** founder-controlled autoplay speed (ms) */
  autoplayMs?: number;
}) {
  const speed = Math.min(12000, Math.max(3000, autoplayMs || DEFAULT_AUTOPLAY_MS));
  const lang = useLangStore((s) => s.lang);
  const { t } = useT();
  const rtl = lang === 'ar';

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /** once the visitor navigates manually, autoplay stops for good (Baymard #3) */
  const [userTookOver, setUserTookOver] = useState(false);
  const touchX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const count = slides.length;

  const openCategory = useAppStore((s) => s.openCategory);
  const categoryMap = useAppStore((s) => s.categoryMap);
  const setView = useAppStore((s) => s.setView);
  const openLanding = useAppStore((s) => s.openLanding);
  const openProduct = useAppStore((s) => s.openProduct);

  const go = useCallback(
    (next: number, manual = false) => {
      if (count === 0) return;
      if (manual) setUserTookOver(true);
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  // Preload the first slide's photo so the hero paints fast (LCP)
  useEffect(() => {
    const img = slides[0]?.image;
    if (!img || !img.startsWith('http')) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = img;
    link.fetchPriority = 'high';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [slides]);

  // Autoplay — paused on hover / hidden tab / after user takeover
  const autoplayOn = !paused && !userTookOver && count > 1;
  useEffect(() => {
    if (!autoplayOn) return;
    const onVis = () => setPaused(!!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => setIndex((i) => (i + 1) % count), speed);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [autoplayOn, count, speed]);

  // Keyboard navigation — direction-aware (W3C carousel pattern)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count <= 1) return;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) {
      e.preventDefault();
      go(index + 1, true);
    } else if (e.key === back) {
      e.preventDefault();
      go(index - 1, true);
    }
  };

  // Localized copy for the active language (AR primary, EN fallback-aware)
  const loc = useMemo(
    () => slides.map((s) => localizedSlide(s, lang)),
    [slides, lang]
  );

  if (loading || count === 0) {
    return (
      <section className="relative bg-primary/90 animate-pulse" style={{ minHeight: 380 }}>
        <div className="container mx-auto px-4 py-16 text-primary-foreground/40 font-extrabold text-2xl">
          {t('hs.loading')}
        </div>
      </section>
    );
  }

  const act = (a: Slide['cta']) => {
    if (!a) return;
    if (a.action === 'shop') setView('shop');
    else if (a.action === 'category') {
      // resolve the category slug (if known) so the URL stays shareable: /?cat=<slug>
      const slug = a.payload
        ? Object.keys(categoryMap).find((sl) => categoryMap[sl] === a.payload) || null
        : null;
      openCategory(a.payload || null, a.payload ? slug : undefined);
    } else if (a.action === 'landing' && a.payload) openLanding(a.payload);
    else if (a.action === 'product' && a.payload) openProduct(a.payload);
    else if (a.action === 'track') setView('track-order');
  };

  const current = slides[index];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      aria-roledescription="carousel"
      aria-label={t('hs.label')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        if (start != null && end != null) {
          const dx = end - start;
          // physical swipe direction → logical slide direction
          if (Math.abs(dx) > 48) go(dx < 0 ? index + 1 : index - 1, true);
        }
        touchX.current = null;
        // research: after a touch the visitor is in control — no autoplay resume
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        const L = loc[i];
        return (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            role="group"
            aria-roledescription="slide"
            aria-label={t('hs.slideOf', { n: i + 1, total: count })}
            aria-hidden={!active}
          >
            {/* background layer */}
            <div className={`absolute inset-0 tone-${s.tone || 'dark'}`} />
            {s.image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={s.image}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding={i === 0 ? 'sync' : 'async'}
                fetchPriority={i === 0 ? 'high' : 'low'}
                className={`absolute inset-0 h-full w-full object-cover ${active ? 'kenburns' : ''}`}
              />
            )}
            {/* readability scrim — dark side follows the copy side (lang-aware) */}
            <div
              className="absolute inset-0"
              style={{ background: rtl ? SCRIM_RTL : SCRIM_LTR }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 hero-glow opacity-70" aria-hidden="true" />

            {/* copy */}
            <div className="relative h-full container mx-auto px-4 flex items-center">
              <div className="max-w-2xl py-14 md:py-20 text-start">
                {L.eyebrow && (
                  <span className="inline-block mb-3 px-4 py-1.5 rounded-full text-xs font-bold bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                    {L.eyebrow}
                  </span>
                )}
                <h2 className="text-white text-[26px] leading-[1.3] sm:text-4xl md:text-[44px] md:leading-[1.25] font-extrabold mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                  {L.title}
                  {L.highlight && (
                    <>
                      {' '}
                      <span className="text-gold-gradient drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                        {L.highlight}
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-white/95 text-sm md:text-lg leading-relaxed mb-5 max-w-xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  {L.subtitle}
                </p>
                {L.chips && L.chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {L.chips.map((c) => (
                      <span
                        key={c}
                        className="px-3 py-1 rounded-full bg-white/12 border border-white/20 text-white text-[11px] md:text-xs font-semibold backdrop-blur-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => act(s.cta)}
                    tabIndex={active ? 0 : -1}
                    className="btn-gold rounded-xl px-7 py-3.5 font-extrabold text-sm md:text-base cursor-pointer"
                  >
                    {L.ctaLabel}
                  </button>
                  {s.ctaSecondary && L.ctaLabel2 && (
                    <button
                      onClick={() => act(s.ctaSecondary!)}
                      tabIndex={active ? 0 : -1}
                      className="rounded-xl px-6 py-3.5 font-bold text-sm md:text-base border border-white/40 text-white hover:bg-white/15 transition-colors cursor-pointer backdrop-blur-sm"
                    >
                      {L.ctaLabel2}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* arrows (desktop) */}
      {count > 1 && (
        <>
          <button
            onClick={() => go(index - 1, true)}
            aria-label={t('hs.prev')}
            tabIndex={-1}
            className={`hidden md:flex absolute ${rtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/60 backdrop-blur-sm transition-colors cursor-pointer`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={rtl ? '' : 'rotate-180'}>
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => go(index + 1, true)}
            aria-label={t('hs.next')}
            tabIndex={-1}
            className={`hidden md:flex absolute ${rtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/60 backdrop-blur-sm transition-colors cursor-pointer`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={rtl ? '' : 'rotate-180'}>
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {/* dots + progress + pause (research: visible controls, position + play state) */}
      <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-2.5 px-4">
        {count > 1 && (
          <button
            onClick={() => {
              setPaused((p) => !p);
              setUserTookOver((v) => (paused ? v : true));
            }}
            aria-label={autoplayOn ? t('hs.pause') : t('hs.play')}
            aria-pressed={!autoplayOn}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/65 backdrop-blur-sm transition-colors cursor-pointer"
          >
            {autoplayOn ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5z" />
              </svg>
            )}
          </button>
        )}
        <div className="flex items-center gap-2" role="tablist" aria-label={t('hs.dots')}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === index}
              aria-label={t('hs.goTo', { n: i + 1 })}
              onClick={() => go(i, true)}
              className={`relative h-2.5 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                i === index ? 'w-8 bg-white/40' : 'w-2.5 bg-white/45 hover:bg-white/70'
              }`}
            >
              {i === index && (
                <span
                  key={`p-${index}-${autoplayOn}`}
                  className="absolute inset-y-0 start-0 rounded-full bg-white"
                  style={
                    autoplayOn
                      ? { animation: `hs-progress ${speed}ms linear forwards` }
                      : { width: '100%', background: 'rgba(255,255,255,0.85)' }
                  }
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* screen-reader announcement of the current slide (WCAG) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {current ? t('hs.announce', { n: index + 1, total: count, title: loc[index]?.title || '' }) : ''}
      </div>

      {/* spacer that sets the height (first slide is absolute) */}
      <div style={{ height: 440 }} className="w-full" aria-hidden="true" />
    </section>
  );
}
