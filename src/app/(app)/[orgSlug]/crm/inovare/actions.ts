"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { INOVARE_UI_DICT, traduEroareCamp, traduMesajServer } from "@/lib/i18n/dictionaries/inovare-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { valideazaPropunere } from "@/lib/inovare/model";
import { propune, raporteaza, voteaza } from "@/lib/inovare/server";

// Orice membru al organizației poate propune și vota (un vot pe organizație pentru fiecare idee). Ideile se văd între organizații, fără adrese de email.
// Mesajele întoarse sunt în limba curentă (cele din biblioteca server rămân în română acolo și se traduc aici, prin potrivire exactă).
export const propuneIdee = withOrgSession(async (ctx, intrare: unknown) => {
  const locale = await getLocale();
  const v = valideazaPropunere(intrare);
  if (!v.ok) {
    const erori = Object.fromEntries(Object.entries(v.erori).map(([camp, mesaj]) => [camp, traduEroareCamp(locale, camp, mesaj ?? "")])) as typeof v.erori;
    return { ok: false as const, eroare: INOVARE_UI_DICT[locale].erori.verifica, erori };
  }
  const r = await propune(ctx, v.date);
  return r.ok ? { ok: true as const, id: r.id } : { ok: false as const, eroare: traduMesajServer(locale, r.eroare), erori: {} };
});

export const voteazaIdee = withOrgSession(async (ctx, id: string, vot: boolean) => {
  const locale = await getLocale();
  const r = await voteaza(ctx, String(id), vot === true);
  return r.eroare ? { ...r, eroare: traduMesajServer(locale, r.eroare) } : r;
});

// Raportare: ideea cu date personale sau conținut inadecvat se ascunde imediat și ajunge la echipă.
export const raporteazaIdee = withOrgSession(async (ctx, id: string, motiv: string) => {
  const locale = await getLocale();
  const r = await raporteaza(ctx, String(id), typeof motiv === "string" ? motiv : "");
  return r.eroare ? { ...r, eroare: traduMesajServer(locale, r.eroare) } : r;
});
