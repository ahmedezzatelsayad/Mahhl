'use client';

/**
 * SlidePreview — WYSIWYG mini-render of a slide exactly as the storefront
 * shows it: tone gradient → real photo → readability scrim → copy → CTA.
 * aspect 21/9 keeps previews compact inside the dashboard.
 */

import type { SliderSlide } from '@/lib/slider-types';

export function SlidePreview({ slide }: { slide: SliderSlide }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-primary" style={{ aspectRatio: '21 / 9' }}>
      <div className={`absolute inset-0 tone-${slide.tone || 'dark'}`} />
      {slide.image && (
         
        <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to left, rgba(12,10,9,0.28) 0%, rgba(12,10,9,0.66) 46%, rgba(12,10,9,0.93) 100%)',
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 hero-glow opacity-70" aria-hidden="true" />

      <div className="relative h-full flex items-center px-4 md:px-8">
        <div className="max-w-[70%] text-right">
          {slide.eyebrow && (
            <span className="inline-block mb-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/25">
              {slide.eyebrow}
            </span>
          )}
          <h3 className="text-white text-sm md:text-xl font-extrabold leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            {slide.title}
            {slide.highlight ? (
              <>
                {' '}
                <span className="text-gold-gradient drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                  {slide.highlight}
                </span>
              </>
            ) : null}
          </h3>
          <p className="hidden md:block text-white/85 text-xs leading-relaxed mt-1 line-clamp-2 drop-shadow">
            {slide.subtitle}
          </p>
          {slide.chips && slide.chips.length > 0 && (
            <div className="hidden md:flex flex-wrap gap-1.5 mt-2">
              {slide.chips.map((c) => (
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
            {slide.cta?.label || 'تسوق الآن'}
          </span>
        </div>
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
