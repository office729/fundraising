// Defalcarea unei sponsorizări: cui a fost redirecționată suma (toată sau parțial). O alocare e fie o campanie din platformă
// (pageId), fie un destinatar liber (ex. „Cazul Maria P.”). Suma alocată nu poate depăși suma sponsorizării.

export type AlocareSponsorizare = { tip: "campanie" | "altul"; pageId: string | null; nume: string; suma: number };

// Mesajul de eroare e în limba cerută prin `locale` (implicit română).
export function valideazaAlocari(sumaSponsorizare: number, brut: unknown, locale: "ro" | "en" = "ro"): { ok: true; alocari: AlocareSponsorizare[] } | { ok: false; eroare: string } {
  const en = locale === "en";
  if (!Array.isArray(brut)) return { ok: true, alocari: [] };
  const alocari: AlocareSponsorizare[] = [];
  for (const r of brut.slice(0, 50)) {
    const o = (r ?? {}) as Partial<AlocareSponsorizare>;
    const suma = Math.round(Number(o.suma));
    const nume = String(o.nume ?? "").trim().slice(0, 200);
    if (!nume && !(Number.isFinite(suma) && suma > 0)) continue; // rând gol
    if (!nume) return { ok: false, eroare: en ? "Choose the campaign or type who the amount was redirected to." : "Alege campania sau scrie cui ai redirecționat suma." };
    if (!Number.isFinite(suma) || suma <= 0) return { ok: false, eroare: en ? `The amount for “${nume}” must be a positive number.` : `Suma pentru „${nume}” trebuie să fie un număr pozitiv.` };
    const pageId = o.tip === "campanie" && typeof o.pageId === "string" && o.pageId ? o.pageId : null;
    alocari.push({ tip: pageId ? "campanie" : "altul", pageId, nume, suma });
  }
  const total = alocari.reduce((s, a) => s + a.suma, 0);
  if (total > sumaSponsorizare) {
    return {
      ok: false,
      eroare: en
        ? `You allocated ${total.toLocaleString("en-GB")} RON, more than the sponsorship amount (${sumaSponsorizare.toLocaleString("en-GB")} RON).`
        : `Ai alocat ${total.toLocaleString("ro-RO")} RON, mai mult decât suma sponsorizării (${sumaSponsorizare.toLocaleString("ro-RO")} RON).`,
    };
  }
  return { ok: true, alocari };
}
