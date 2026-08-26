'use client';

/**
 * SlidePreview — WYSIWYG mini-render of a slide exactly as the storefront
 * shows it: tone gradient → real photo → readability scrim → copy → CTA.
 * aspect 21/9 keeps previews compact inside the dashboard.
 *
 * Bilingual: an AR/EN pill lets the founder flip the preview language and
 * see exactly what English visitors get (fallback Arabic is flagged).
 */

import { useState } from 'react';
import { localizedSlide, slideEnComplete, type SliderSlide } from '@/lib/slider-types';

export function SlidePreview({ slide }: { slide: SliderSlide }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const L = localizedSlide(slide, lang);
  const enOk = slideEnComplete(slide);
  const rtl = lang === 'ar';

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border bg-primary"
      style={{ aspectRatio: '21 / 9' }}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <div className={`absolute inset-0 tone-${slide.tone || 'dark'}`} />
      {slide.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: rtl
            ? 'linear-gradient(to left, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 42%, rgba(12,10,9,0.30) 100%)'
            : 'linear-gradient(to right, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 42%, rgba(12,10,9,0.30) 100%)',
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 hero-glow opacity-70" aria-hidden="true" />

      <div className="relative h-full flex items-center px-4 md:px-8">
        <div className="max-w-[70%] text-start">
          {L.eyebrow && (
            <span className="inline-block mb-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/25">
              {L.eyebrow}
            </span>
          )}
          <h3 className="text-white text-sm md:text-xl font-extrabold leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            {L.title}
            {L.highlight ? (
              <>
                {' '}
                <span className="text-gold-gradient drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                  {L.highlight}
                </span>
              </>
            ) : null}
          </h3>
          <p className="hidden md:block text-white/85 text-xs leading-relaxed mt-1 line-clamp-2 drop-shadow">
            {L.subtitle}
          </p>
          {L.chips && L.chips.length > 0 && (
            <div className="hidden md:flex flex-wrap gap-1.5 mt-2">
              {L.chips.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded-full bg-white/12 border border-white/20 text-white text-[10px] font-semibold"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <span className="btn-gold inline-block mt-2.5 rounded-lg px-4 py-1.5 text-white text-[11px] md:text-xs font-extrabold">
            {L.ctaLabel}
          </span>
        </div>
      </div>

      {/* language flip + EN completeness */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <div className="flex rounded-full overflow-hidden border border-white/30 bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white">
          {(['ar', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLang(l);
              }}
              className={`px-2.5 py-0.5 cursor-pointer transition-colors ${lang === l ? 'bg-white/85 text-black' : 'hover:bg-white/20'}`}
            >
              {l === 'ar' ? 'عربي' : 'EN'}
            </button>
          ))}
        </div>
        {lang === 'en' && !enOk && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-extrabold">
            نص EN ناقص
          </span>
        )}
        {lang === 'en' && enOk && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-extrabold">
            EN ✓
          </span>
        )}
      </div>

      {!slide.active && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
          <span className="px-3 py-1 rounded-full bg-white/90 text-black text-xs font-extrabold">
            غير مفعّلة
          </span>
        </div>
      )}
    </div>
  );
}
