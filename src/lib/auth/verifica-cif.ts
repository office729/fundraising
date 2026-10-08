import "server-only";

import { cautaCifAnaf } from "@/lib/anaf";
import { gasesteJudet } from "@/lib/judete";
import { raporteazaAvertisment } from "@/lib/monitoring";

export type RezultatVerificareCif =
  | { ok: true; verificat: boolean; adresaSediu: string | null; judet: string | null }
  | { ok: false; motiv: "negasit" | "inactiv" };

// Verifică CIF-ul organizației în ANAF la înscriere: respinge CIF-urile inexistente și organizațiile inactive/radiate, iar
// pentru cele găsite întoarce adresa și județul sediului, ca să nu le mai ceară înaintea primei plăți (date de facturare).
// Dacă ANAF nu răspunde, înscrierea continuă (fără adresă preluată) — un serviciu extern nu trebuie să blocheze utilizatorii.
export async function verificaCifLaInscriere(cif: string): Promise<RezultatVerificareCif> {
  const r = await cautaCifAnaf(cif);
  if (r.tip === "indisponibil") {
    raporteazaAvertisment("anaf-inscriere", "ANAF indisponibil la înscriere — CIF acceptat fără verificare", {});
    return { ok: true, verificat: false, adresaSediu: null, judet: null };
  }
  if (r.tip === "negasit") return { ok: false, motiv: "negasit" };
  const s = r.stare;
  const radiat = /radiat/i.test(s.stareInregistrare ?? "");
  if (!s.activ || radiat) return { ok: false, motiv: "inactiv" };
  return { ok: true, verificat: true, adresaSediu: s.adresa, judet: gasesteJudet(s.judet) ?? gasesteJudet(s.adresa) };
}
