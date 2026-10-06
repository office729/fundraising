import { sql, type SQL } from "drizzle-orm";

import { faraDiacritice } from "@/lib/cautare";

// Județ comparat normalizat: fără diacritice / majuscule, fără „Municipiul” / „Județul”; „București Sector 3” = „București”.
export function normalizeazaJudet(judet: string | null | undefined): string {
  const n = faraDiacritice((judet ?? "").trim()).replace(/^(municipiul|mun\.?|judetul|jud\.?)\s+/, "");
  return n.startsWith("bucuresti") ? "bucuresti" : n;
}

// București + Ilfov = o singură zonă (lista de județe normalizate din aceeași zonă).
export function zonaJudet(judet: string | null | undefined): string[] {
  const n = normalizeazaJudet(judet);
  if (!n) return [];
  return n === "bucuresti" || n === "ilfov" ? ["bucuresti", "ilfov"] : [n];
}

// Aceeași normalizare, în SQL, pe o coloană (ex. companies.judet).
export function sqlJudetNormalizat(coloana: SQL): SQL {
  return sql`regexp_replace(lower(translate(regexp_replace(trim(coalesce(${coloana}, '')), '^(municipiul|mun[.]?|judetul|jud[.]?)[[:space:]]+', '', 'i'), 'ăâîșțşţĂÂÎȘȚŞŢ', 'aaiststAAISTST')), '^bucuresti.*$', 'bucuresti')`;
}
