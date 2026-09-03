'use client';

/**
 * GuideRenderer — عارض موحّد لصفحات دليل التسويق (مركز المسوقين).
 * كل دليل = مصفوفة أقسام، كل قسم = عنوان + بلوكات (فقرة / قائمة / جدول / تنبيه).
 * ثنائي اللغة: عربي كامل + إنجليزي مختصر.
 */
import type { ReactNode } from 'react';

export type Block =
  | { type: 'p'; ar: string; en: string }
  | { type: 'list'; ar: string[]; en: string[] }
  | { type: 'table'; head: [string, string]; rows: [string, string][] }
  | { type: 'callout'; ar: string; en: string };

export interface Section {
  h: string;
  hEn: string;
  blocks: Block[];
}

function renderBlock(b: Block, en: boolean, key: number): ReactNode {
  if (b.type === 'p')
    return (
      <p key={key} className="leading-8 text-foreground/85">
        {en ? b.en : b.ar}
      </p>
    );
  if (b.type === 'list')
    return (
      <ul key={key} className="space-y-2.5">
        {(en ? b.en : b.ar).map((item, i) => (
          <li key={i} className="flex gap-2.5 leading-7 text-foreground/85">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-deep" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  if (b.type === 'table')
    return (
      <div key={key} className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="px-3 py-2.5 text-start font-bold whitespace-nowrap">
                {en ? b.head[1] : b.head[0]}
              </th>
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2.5 align-top leading-7 text-foreground/85">
                  {en ? row[1] : row[0]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div key={key} className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3.5 leading-7 font-medium">
      💡 {en ? b.en : b.ar}
    </div>
  );
}

export function GuideRenderer({ sections, en }: { sections: Section[]; en: boolean }) {
  return (
    <div className="space-y-9">
      {sections.map((s, i) => (
        <section key={i} className="space-y-4">
          <h2 className="flex items-center gap-2.5 text-lg font-extrabold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-xs font-black text-gold-deep" aria-hidden="true">
              {i + 1}
            </span>
            {en ? s.hEn : s.h}
          </h2>
          <div className="space-y-4">
            {s.blocks.map((b, j) => renderBlock(b, en, j))}
          </div>
        </section>
      ))}
    </div>
  );
}
