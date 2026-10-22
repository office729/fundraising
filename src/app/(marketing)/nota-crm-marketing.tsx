import { NOTA_CRM_DICT } from "@/lib/i18n/dictionaries/nota-crm";
import type { Locale } from "@/lib/i18n/config";

// Panou explicativ pe pagina publică: mulți oameni din ONG-urile mici nu știu ce înseamnă „CRM”, iar termenul apare în tot site-ul.
export function NotaCrmMarketing({ locale }: { locale: Locale }) {
  const t = NOTA_CRM_DICT[locale];
  const titluSectiune = "text-xs font-semibold tracking-wide text-muted uppercase";
  return (
    <section className="px-[6%] py-14" aria-labelledby="nota-crm-titlu">
      <div className="mx-auto max-w-5xl rounded-2xl border border-line bg-panel p-6 md:p-8">
        <h2 id="nota-crm-titlu" className="font-display text-[26px] font-bold text-ink">
          {t.titlu}
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-body">{t.intro}</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className={titluSectiune}>{t.cuvinteTitlu}</p>
            <ul className="mt-2 space-y-2.5">
              {t.cuvinte.map((c) => (
                <li key={c.termen} className="rounded-xl bg-panel-2 p-4">
                  <p className="font-display text-sm font-bold text-ink">
                    {c.termen} <span className="font-normal text-muted">· {c.sens}</span>
                  </p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.d}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={titluSectiune}>{t.tehnicTitlu}</p>
            <div className="mt-2 rounded-xl bg-panel-2 p-4">
              <p className="text-[13.5px] leading-relaxed text-body">{t.tehnicIntro}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-muted">
                {t.tehnic.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-line p-4 text-[14px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">{t.exempluTitlu}: </span>
          {t.exemplu}
        </p>
      </div>
    </section>
  );
}
