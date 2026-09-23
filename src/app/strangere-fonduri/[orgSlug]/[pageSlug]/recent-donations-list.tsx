import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

type Donatie = {
  id: string;
  numeDonator: string | null;
  suma: number;
  anonim: boolean;
  createdAt: Date;
};

function acumRelativ(data: Date, t: (typeof DONATION_DICT)[Locale]["recentList"]): string {
  const secunde = Math.max(0, (Date.now() - data.getTime()) / 1000);
  if (secunde < 60) return t.chiarAcum;
  const minute = Math.round(secunde / 60);
  if (minute < 60) return t.acumMin(minute);
  const ore = Math.round(minute / 60);
  if (ore < 24) return t.acumOra(ore);
  const zile = Math.round(ore / 24);
  return t.acumZi(zile);
}

// Listă compactă, sub butonul de donat — lista completă (cu "Top donatori"
// separat) rămâne mai jos pe pagină; aici e doar un extras rapid, ca omul să
// vadă imediat că alții au donat deja, fără să scroleze.
export function RecentDonationsList({ donatii, locale }: { donatii: Donatie[]; locale: Locale }) {
  const extras = donatii.slice(0, 5);
  const dict = DONATION_DICT[locale];
  const t = dict.recentList;

  if (!donatii.length) {
    return (
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">{t.donatori}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-2">{t.nicioDonatie}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
        {donatii.length} {donatii.length === 1 ? dict.campaignPage.donatie : dict.campaignPage.donatii}
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {extras.map((d) => {
          const nume = d.anonim || !d.numeDonator ? dict.campaignPage.susinatorAnonim : d.numeDonator;
          return (
            <div key={d.id} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-[13px] font-bold text-brand-blue">
                {nume.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{nume}</p>
                <p className="text-[11.5px] text-muted-2">
                  {dict.campaignPage.leiSuma(d.suma.toLocaleString(dict.numeLocale))} · {acumRelativ(d.createdAt, t)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {donatii.length > extras.length && (
        <a href="#toate-donatiile" className="mt-3 inline-block text-[12.5px] font-bold text-brand-blue hover:underline">
          {dict.campaignPage.vezToateDonatiile}
        </a>
      )}
    </div>
  );
}
