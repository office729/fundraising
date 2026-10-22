import { NOTA_CRM_DICT } from "@/lib/i18n/dictionaries/nota-crm";
import type { Locale } from "@/lib/i18n/config";

// Panou explicativ pe pagina publică: mulți oameni din ONG-urile mici nu știu ce înseamnă „CRM”, iar termenul apare în tot site-ul.
export function NotaCrmMarketing({ locale }: { locale: Locale }) {
  const t = NOTA_CRM_DICT[locale];
  return (
    <section className="px-[6%] py-14" aria-labelledby="nota-crm-titlu">
      <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-panel p-6 md:p-8">
        <h2 id="nota-crm-titlu" className="font-display text-[26px] font-bold text-ink">
          {t.titlu}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-body">{t.intro}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {t.puncte.map((p) => (
            <li key={p.t} className="rounded-xl bg-panel-2 p-4">
              <p className="font-display text-sm font-bold text-ink">{p.t}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{p.d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl border border-line p-4 text-[14px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">{t.exempluTitlu}: </span>
          {t.exemplu}
        </p>
      </div>
    </section>
  );
}
