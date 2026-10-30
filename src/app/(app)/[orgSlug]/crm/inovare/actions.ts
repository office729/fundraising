"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { valideazaPropunere } from "@/lib/inovare/model";
import { propune, raporteaza, voteaza } from "@/lib/inovare/server";

// Orice membru al organizației poate propune și vota (un vot pe organizație pentru fiecare idee). Ideile se văd între organizații, fără adrese de email.
export const propuneIdee = withOrgSession(async (ctx, intrare: unknown) => {
  const v = valideazaPropunere(intrare);
  if (!v.ok) return { ok: false as const, eroare: "Verifică câmpurile marcate.", erori: v.erori };
  const r = await propune(ctx, v.date);
  return r.ok ? { ok: true as const, id: r.id } : { ok: false as const, eroare: r.eroare, erori: {} };
});

export const voteazaIdee = withOrgSession(async (ctx, id: string, vot: boolean) => voteaza(ctx, String(id), vot === true));

// Raportare: ideea cu date personale sau conținut inadecvat se ascunde imediat și ajunge la echipă.
export const raporteazaIdee = withOrgSession(async (ctx, id: string, motiv: string) => raporteaza(ctx, String(id), typeof motiv === "string" ? motiv : ""));
