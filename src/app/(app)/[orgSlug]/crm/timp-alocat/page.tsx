import { requireOrgAccess } from "@/lib/auth/guard";
import { aziBucuresti, bancaOre, CATEGORII, formateazaMinute, minuteInLuna, numeLuna, totaluri, urmatorulReset, type Categorie } from "@/lib/timp-custom";

import { personalizareEfectiva } from "../personalizare-efectiva";
import { citesteTimpOrg } from "./actions";

export const dynamic = "force-dynamic";

// Timpul alocat organizației pentru modificări custom, integrări și suport, cu banca de ore (pachet vs folosit). Doar timp: tariful și suma de facturat nu apar niciodată aici, iar
// munca făcută cu asistență AI se vede ca timp normal (marcajul „cu AI” rămâne intern, în panoul platformei).
export default async function TimpAlocatPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [intrari, pers] = await Promise.all([citesteTimpOrg(orgSlug), personalizareEfectiva(orgSlug, access.userEmail)]);
  const tot = totaluri(intrari, null);
  const azi = aziBucuresti();
  // Pachet lunar: banca numără doar luna curentă și se resetează la începutul lunii următoare; totalul de la început rămâne vizibil.
  const lunar = pers?.pachetLunar === true && !!pers.orePachet;
  const minuteBanca = lunar ? minuteInLuna(intrari, azi) : tot.minute;
  const banca = bancaOre(minuteBanca, pers?.orePachet);
  const culoare = banca.stare === "depasit" ? "var(--ci-danger, #b91c1c)" : banca.stare === "atentie" ? "#d97706" : "var(--ci-accent, #16a34a)";

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Timp alocat</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Cât timp a alocat echipa Alexandrit modificărilor custom, integrărilor cu alte instrumente și suportului pentru organizația ta, cu ce s-a făcut.
        </p>
      </div>

      <section aria-label="Banca de ore" className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{banca.stare === "fara_pachet" ? "Total timp alocat" : lunar ? `Banca de ore · ${numeLuna(azi)}` : "Banca de ore"}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--ci-text)] tabular-nums">
              {formateazaMinute(banca.stare === "fara_pachet" ? tot.minute : minuteBanca)}
              {banca.stare !== "fara_pachet" && <span className="text-base font-normal text-[var(--ci-text-muted)]"> din {formateazaMinute(banca.minutePachet)} incluse în pachet{lunar ? " luna aceasta" : ""}</span>}
            </p>
          </div>
          {lunar && <p className="text-[12px] text-[var(--ci-text-muted)]">Total de la început: {formateazaMinute(tot.minute)}</p>}
        </div>
        {banca.stare !== "fara_pachet" && (
          <>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--ci-border)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(banca.procent * 100)}
              aria-label="Pachet de ore folosit"
            >
              <div className="h-full rounded-full" style={{ width: `${Math.round(banca.procent * 100)}%`, background: culoare }} />
            </div>
            <p className="mt-2 text-[13px] text-[var(--ci-text)]" role={banca.stare === "in_limita" ? undefined : "status"}>
              {banca.stare === "depasit"
                ? `Pachetul de ore a fost depășit cu ${formateazaMinute(-banca.minuteRamase)}. Te contactăm pentru pașii următori.`
                : `Rămase: ${formateazaMinute(banca.minuteRamase)}.`}
              {banca.stare === "atentie" && " Pachetul se apropie de sfârșit."}
              {lunar && ` Se resetează pe ${urmatorulReset(azi)}.`}
            </p>
          </>
        )}
      </section>
      {tot.minute > 0 && (
        <p className="text-[12px] text-[var(--ci-text-muted)]">
          {(Object.keys(CATEGORII) as Categorie[])
            .filter((c) => tot.peCategorie[c] > 0)
            .map((c) => `${CATEGORII[c]}: ${formateazaMinute(tot.peCategorie[c])}`)
            .join(" · ")}
        </p>
      )}

      {intrari.length === 0 ? (
        <p className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 text-[13px] text-[var(--ci-text-muted)]">Nu există încă timp înregistrat.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Intrările de timp alocat</caption>
            <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Data</th>
                <th scope="col" className="px-3 py-2 font-medium">Categorie</th>
                <th scope="col" className="px-3 py-2 font-medium">Ce s-a făcut</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Durată</th>
              </tr>
            </thead>
            <tbody>
              {intrari.map((i) => (
                <tr key={i.id} className="border-b border-[var(--ci-border)] last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{new Date(`${i.data}T00:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-2">{CATEGORII[i.categorie]}</td>
                  <td className="px-3 py-2">{i.descriere}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formateazaMinute(i.minute)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
