// Ferestrele fiscale care contează pentru fundraisingul corporate, cu numărătoarea inversă până la termen. Modul pur, fără importuri: se testează direct.
//  - D177 (redirecționarea până la 20% din impozitul pe profit): se poate depune până pe 25 iunie, deci fereastra e deschisă din octombrie până pe 25 iunie.
//  - Sponsorizarea cu contract (deductibilă în limita a 20% din impozitul pe profit și 0,75% din cifra de afaceri): contractele trebuie semnate până pe 31 decembrie,
//    deci fereastra e deschisă octombrie–decembrie.
// Termenele sunt cele confirmate de contabil pentru D177 (25 iunie) și de sfârșit de an fiscal (31 decembrie): verifică-le anual pe anaf.ro.

export type CheieFereastra = "d177" | "sponsorizare20";
export type FereastraFiscala = { cheie: CheieFereastra; titlu: string; termen: string; termenText: string; zileRamase: number };

// Data curentă în România, ca (an, lună 1-12, zi).
function dataBucuresti(acum: Date): { an: number; luna: number; zi: number } {
  const parti = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(acum);
  const v = (t: string) => Number(parti.find((p) => p.type === t)?.value ?? 0);
  return { an: v("year"), luna: v("month"), zi: v("day") };
}

const iso = (an: number, luna: number, zi: number) => `${an}-${String(luna).padStart(2, "0")}-${String(zi).padStart(2, "0")}`;
const zileIntre = (de: { an: number; luna: number; zi: number }, la: { an: number; luna: number; zi: number }) =>
  Math.round((Date.UTC(la.an, la.luna - 1, la.zi) - Date.UTC(de.an, de.luna - 1, de.zi)) / 86_400_000);

// Ferestrele deschise acum (maximum două); lista goală în afara lor.
export function ferestreFiscale(acum: Date): FereastraFiscala[] {
  const azi = dataBucuresti(acum);
  const rez: FereastraFiscala[] = [];
  const d177Deschisa = azi.luna >= 10 || azi.luna <= 5 || (azi.luna === 6 && azi.zi <= 25);
  if (d177Deschisa) {
    const an = azi.luna >= 10 ? azi.an + 1 : azi.an;
    rez.push({ cheie: "d177", titlu: "Fereastra D177: redirecționarea impozitului pe profit", termen: iso(an, 6, 25), termenText: "25 iunie", zileRamase: zileIntre(azi, { an, luna: 6, zi: 25 }) });
  }
  if (azi.luna >= 10) {
    rez.push({ cheie: "sponsorizare20", titlu: "Fereastra sponsorizării (20%): contracte până la sfârșitul anului", termen: iso(azi.an, 12, 31), termenText: "31 decembrie", zileRamase: zileIntre(azi, { an: azi.an, luna: 12, zi: 31 }) });
  }
  return rez;
}
