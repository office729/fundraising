import { CATEGORII, EXECUTANTI, formateazaMinute, totaluri, type Categorie, type Executant } from "@/lib/timp-custom";

import { citesteTimpOrg } from "./actions";

export const dynamic = "force-dynamic";

// Timpul alocat organizației pentru modificări custom, integrări și suport: doar timp (nu tarife), cu totaluri și lista intrărilor.
export default async function TimpAlocatPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const intrari = await citesteTimpOrg(orgSlug);
  const tot = totaluri(intrari, null);

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Timp alocat</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Cât timp am alocat modificărilor custom, integrărilor cu alte instrumente și suportului pentru organizația ta: timpul lucrat de Claude și de echipa Alexandrit, cu ce s-a făcut.
        </p>
      </div>

      <section aria-label="Totaluri" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <p className="text-[12px] text-[var(--ci-text-muted)]">Total timp alocat</p>
          <p className="mt-1 text-2xl font-bold text-[var(--ci-text)] tabular-nums">{formateazaMinute(tot.minute)}</p>
        </div>
        {(Object.keys(EXECUTANTI) as Executant[]).map((e) => (
          <div key={e} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
            <p className="text-[12px] text-[var(--ci-text-muted)]">{EXECUTANTI[e]}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--ci-text)] tabular-nums">{formateazaMinute(tot.peExecutant[e])}</p>
          </div>
        ))}
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
                <th scope="col" className="px-3 py-2 font-medium">Cine</th>
                <th scope="col" className="px-3 py-2 font-medium">Categorie</th>
                <th scope="col" className="px-3 py-2 font-medium">Ce s-a făcut</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Durată</th>
              </tr>
            </thead>
            <tbody>
              {intrari.map((i) => (
                <tr key={i.id} className="border-b border-[var(--ci-border)] last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{new Date(`${i.data}T00:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{EXECUTANTI[i.executant]}</td>
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
