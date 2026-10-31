"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { NUME_CONECTOR } from "@/lib/prospectare/motor";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_UI_DICT, intlLocale } from "@/lib/i18n/dictionaries/companii-ui";

import { creditePrelucrare, type CreditFurnizor } from "./prospectare-actions";

// Siglele instrumentelor (pictogramele oficiale de pe site-urile lor, în public/furnizori), folosite doar ca să se recunoască instrumentul conectat.
const SIGLA: Record<CreditFurnizor["furnizor"], string> = {
  lusha: "/furnizori/lusha.png",
  apollo: "/furnizori/apollo.svg",
  prospeo: "/furnizori/prospeo.png",
  hunter: "/furnizori/hunter.png",
  waalaxy: "/furnizori/waalaxy.png",
};
const ORDINE = ["apollo", "prospeo", "hunter", "lusha", "waalaxy"] as const;


function MarcaFurnizor({ furnizor, activ }: { furnizor: CreditFurnizor["furnizor"]; activ: boolean }) {
  return (
    <Image
      src={SIGLA[furnizor]}
      alt=""
      aria-hidden
      width={28}
      height={28}
      unoptimized
      className="h-7 w-7 shrink-0 rounded-md border border-[var(--ci-border)] bg-white object-contain"
      style={{ opacity: activ ? 1 : 0.4, filter: activ ? undefined : "grayscale(1)" }}
    />
  );
}

// Starea unui instrument: text vizibil (nu doar în tooltip), ca să se citească și pe telefon și de la tastatură.
function stare(c: CreditFurnizor, ui: (typeof COMPANII_UI_DICT)["ro"]["credite"], fmt: Intl.NumberFormat): { text: string; ton: "normal" | "avertisment" | "eroare" } {
  if (!c.conectat) return { text: ui.neconectat, ton: "normal" };
  if (c.eroare) return { text: ui.cheieDeVerificat, ton: "eroare" };
  if (c.credite?.ramase != null) return c.credite.ramase <= 0 ? { text: ui.zeroCredite, ton: "avertisment" } : { text: ui.credite(fmt.format(c.credite.ramase)), ton: c.credite.ramase < 10 ? "avertisment" : "normal" };
  if (c.furnizor === "apollo") return { text: ui.apolloConectat, ton: "normal" };
  return { text: ui.conectat, ton: "normal" };
}

const CULOARE_TON = { normal: "text-[var(--ci-text-muted)]", avertisment: "text-[#7a3e00]", eroare: "text-[#9b1c1c]" } as const;

// Instrumentele conectate ale organizației și creditele rămase în conturile lor. Creditele se citesc live, cu apeluri de cont gratuite.
export function CrediteFurnizori({ orgSlug, versiune }: { orgSlug: string; versiune: number }) {
  const locale = useLocale();
  const ui = COMPANII_UI_DICT[locale].credite;
  const fmt = new Intl.NumberFormat(intlLocale(locale));
  const [date, setDate] = useState<CreditFurnizor[] | null>(null);
  const [reincarca, setReincarca] = useState(0);

  useEffect(() => {
    let activ = true;
    creditePrelucrare(orgSlug).then((r) => {
      if (activ) setDate(r);
    });
    return () => {
      activ = false;
    };
  }, [orgSlug, versiune, reincarca]);

  // Citirea a eșuat complet (rezultat gol): nu se arată o listă goală, ci un mesaj cu reîncercare.
  if (date !== null && date.length === 0) {
    return (
      <p role="status" className="mb-3 text-xs text-[var(--ci-text-muted)]">
        {ui.nuAmPututCitit}{" "}
        <button type="button" onClick={() => { setDate(null); setReincarca((v) => v + 1); }} className="min-h-8 font-medium text-[var(--ci-text)] underline underline-offset-2">
          {ui.reincearca}
        </button>
      </p>
    );
  }

  const lista: CreditFurnizor[] = date ?? ORDINE.map((furnizor) => ({ furnizor, conectat: false, credite: null }));

  return (
    <ul className="mb-3 flex flex-wrap gap-2" aria-label={ui.aria} aria-busy={date === null}>
      {lista.map((c) => {
        const s = stare(c, ui, fmt);
        return (
          <li key={c.furnizor} className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 py-1.5" title={c.eroare}>
            <MarcaFurnizor furnizor={c.furnizor} activ={c.conectat} />
            <span className="leading-tight">
              <span className={`block text-[13px] font-semibold ${c.conectat ? "text-[var(--ci-text)]" : "text-[var(--ci-text-faint)]"}`}>{NUME_CONECTOR[c.furnizor]}</span>
              <span className={`block text-xs tabular-nums ${date === null ? "animate-pulse text-[var(--ci-text-faint)]" : CULOARE_TON[s.ton]}`}>{date === null ? ui.seIncarca : s.text}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
