import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { CANALE, ETICHETE_CANAL, ETICHETE_TIP, etichetaSursa, TIPURI } from "@/lib/atribuire/clasificare";
import { MODELE, rata } from "@/lib/atribuire/model";
import { filtrePlatformaDinParametri, incarcaPlatforma } from "@/lib/atribuire/rapoarte-platforma";
import { PERIOADE_RAPORT } from "@/lib/atribuire/rapoarte";
import { isPlatformAdmin } from "@/lib/billing/trial";

import { GeneratorPlatforma } from "./generator-platforma";

export const dynamic = "force-dynamic";

const nr = (n: number) => n.toLocaleString("ro-RO");
const pct = (n: number, d: number) => {
  const r = rata(n, d);
  return r === null ? "—" : `${r.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}%`;
};
const dataRo = (iso: string) => iso.split("-").reverse().join(".");
const dataOra = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });
const camp = "h-9 rounded-lg border border-line bg-panel px-2.5 text-sm text-ink";
const th = "px-3 py-2 text-left font-medium whitespace-nowrap";
const thr = "px-3 py-2 text-right font-medium whitespace-nowrap";
const td = "px-3 py-2 text-right tabular-nums whitespace-nowrap";
const PACHETE: Record<string, string> = { trial: "Probă gratuită", start: "Start", crestere: "Creștere", impact: "Impact", custom: "Personalizat" };

// Doar pentru contul platformei: de unde vin ONG-urile care ajung pe site, cer informații și își creează cont, pentru toate pachetele.
export default async function SursePlatformaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const sp = await searchParams;
  const f = filtrePlatformaDinParametri(sp);
  const r = await incarcaPlatforma(f);
  const model = MODELE.find((m) => m.cheie === f.model)!;
  const siteUrl = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://alexandrit.ro").origin;
    } catch {
      return "https://alexandrit.ro";
    }
  })();
  const surse = [...new Set(r.tabel.map((x) => x.sursa))].sort();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">De unde vin ONG-urile</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Vizitatorii site-ului public, cererile „Descoperă Alexandrit” și conturile create, după sursă și tipul promovării (organică sau plătită), pentru toate pachetele. Doar echipa platformei vede această pagină.
      </p>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel p-4">
        <label className="text-xs font-medium text-muted">
          De la
          <input type="date" name="de" defaultValue={f.de} className={`${camp} mt-1 block`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Până la
          <input type="date" name="pana" defaultValue={f.pana} className={`${camp} mt-1 block`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Sursă
          <select name="sursa" defaultValue={f.sursa ?? ""} className={`${camp} mt-1 block`}>
            <option value="">Toate</option>
            {surse.map((s) => (
              <option key={s} value={s}>
                {etichetaSursa(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Canal
          <select name="canal" defaultValue={f.canal ?? ""} className={`${camp} mt-1 block`}>
            <option value="">Toate</option>
            {CANALE.map((c) => (
              <option key={c} value={c}>
                {ETICHETE_CANAL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Organic / plătit
          <select name="tip" defaultValue={f.tip ?? ""} className={`${camp} mt-1 block`}>
            <option value="">Toate</option>
            {TIPURI.map((t) => (
              <option key={t} value={t}>
                {ETICHETE_TIP[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Model de atribuire
          <select name="model" defaultValue={f.model} className={`${camp} mt-1 block`}>
            {MODELE.map((m) => (
              <option key={m.cheie} value={m.cheie}>
                {m.eticheta}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white">
          Aplică
        </button>
        <span className="flex flex-wrap gap-1.5 text-xs">
          {PERIOADE_RAPORT.map((p) => (
            <Link key={p.cheie} href={`/platform-admin/surse?perioada=${p.cheie}`} className="rounded-lg border border-line px-2.5 py-1.5 text-muted hover:bg-panel-2">
              {p.eticheta}
            </Link>
          ))}
        </span>
      </form>

      <div className="mt-4 rounded-xl border border-line bg-panel-2 px-4 py-3 text-xs leading-relaxed text-muted">
        <p>
          Perioada {dataRo(f.de)} – {dataRo(f.pana)} (ora României). Model: <strong className="text-ink">{model.eticheta}</strong>. {model.descriere} Se măsoară doar traficul observabil: vizitatorii care au refuzat sau nu au dat acordul pentru statistici apar doar ca vizite pe zi, iar linkurile fără etichete rămân „Direct” sau „Nedeterminat” (absența UTM nu înseamnă organic).
          {r.fracFaraAcord !== null && r.fracFaraAcord > 0 ? ` ${r.fracFaraAcord.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}% dintre vizitatori sunt fără acord.` : ""}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi eticheta="Vizitatori pe site" valoare={nr(r.vizitatori)} nota={`${nr(r.sesiuni)} sesiuni`} />
        <Kpi eticheta="Cereri „Descoperă”" valoare={nr(r.leaduri)} nota={`vizitator → cerere: ${pct(r.leaduri, r.vizitatori)}`} />
        <Kpi eticheta="Conturi create" valoare={nr(r.conturi)} nota={`vizitator → cont: ${pct(r.conturi, r.vizitatori)}`} />
        <Kpi eticheta="Fără sursă măsurată" valoare={nr(r.conturiFaraAtribuire)} nota="create înainte de activarea măsurării sau fără istoric" />
        <Kpi eticheta="Prin cod de recomandare" valoare={nr(r.conturiPrinRecomandare)} nota="de la alte organizații" />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Organic, plătit și nedeterminat</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className={th}>Tip promovare</th>
              <th className={thr}>Vizitatori</th>
              <th className={thr}>Cereri</th>
              <th className={thr}>Conturi create</th>
              <th className={thr}>Rată vizitator → cont</th>
            </tr>
          </thead>
          <tbody>
            {r.perTip.map((x) => (
              <tr key={x.tip} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{ETICHETE_TIP[x.tip]}</td>
                <td className={td}>{nr(x.vizitatori)}</td>
                <td className={td}>{nr(x.leaduri)}</td>
                <td className={td}>{nr(x.conturi)}</td>
                <td className={td}>{pct(x.conturi, x.vizitatori)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Conturi create, pe pachet</h2>
      <p className="mt-1 text-xs text-muted">Pachetul ales acum de organizațiile cu sursă măsurată în perioadă.</p>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
        {r.perPachet.map((p) => (
          <Kpi key={p.pachet} eticheta={PACHETE[p.pachet]!} valoare={nr(p.conturi)} />
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Evoluție pe zile</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className={th}>Ziua</th>
              <th className={thr}>Vizitatori</th>
              <th className={thr}>Cereri</th>
              <th className={thr}>Conturi</th>
            </tr>
          </thead>
          <tbody>
            {[...r.serie].reverse().filter((z) => z.vizitatori + z.leaduri + z.conturi > 0).slice(0, 60).map((z) => (
              <tr key={z.ziua} className="border-b border-line last:border-0">
                <td className="px-3 py-1.5 text-muted">{dataRo(z.ziua)}</td>
                <td className={td}>{nr(z.vizitatori)}</td>
                <td className={td}>{nr(z.leaduri)}</td>
                <td className={td}>{nr(z.conturi)}</td>
              </tr>
            ))}
            {r.serie.every((z) => z.vizitatori + z.leaduri + z.conturi === 0) && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted">
                  Încă nu sunt date în această perioadă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Pe sursă și campanie de marketing</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className={th}>Sursă</th>
              <th className={th}>Canal</th>
              <th className={th}>Tip</th>
              <th className={th}>Campanie</th>
              <th className={thr}>Vizitatori</th>
              <th className={thr}>Cereri</th>
              <th className={thr}>din care înscrise</th>
              <th className={thr}>Conturi</th>
              <th className={thr}>Probă</th>
              <th className={thr}>Start</th>
              <th className={thr}>Creștere</th>
              <th className={thr}>Impact</th>
              <th className={thr}>Pers.</th>
            </tr>
          </thead>
          <tbody>
            {r.tabel.map((x) => (
              <tr key={`${x.sursa}|${x.canal}|${x.tip}|${x.campanie}`} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{etichetaSursa(x.sursa)}</td>
                <td className="px-3 py-2 text-muted">{ETICHETE_CANAL[x.canal].replace(" (organic sau plătit nedeterminat)", "")}</td>
                <td className="px-3 py-2 text-muted">{ETICHETE_TIP[x.tip]}</td>
                <td className="px-3 py-2 text-muted">{x.campanie || "—"}</td>
                <td className={td}>{nr(x.vizitatori)}</td>
                <td className={td}>{nr(x.leaduri)}</td>
                <td className={td}>{nr(x.leaduriInscrise)}</td>
                <td className={td}>{nr(x.conturi)}</td>
                <td className={td}>{nr(x.trial)}</td>
                <td className={td}>{nr(x.start)}</td>
                <td className={td}>{nr(x.crestere)}</td>
                <td className={td}>{nr(x.impact)}</td>
                <td className={td}>{nr(x.custom)}</td>
              </tr>
            ))}
            {r.tabel.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-4 text-center text-muted">
                  Încă nu sunt date măsurate în această perioadă. Folosește generatorul de mai jos pentru linkurile campaniilor către ONG-uri.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Conturile create în perioadă</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className={th}>Organizație</th>
              <th className={th}>Creat</th>
              <th className={th}>Pachet</th>
              <th className={th}>Sursă</th>
              <th className={th}>Tip</th>
              <th className={th}>Campanie</th>
            </tr>
          </thead>
          <tbody>
            {r.conturiNoi.map((c) => (
              <tr key={c.orgId} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{c.nume}</td>
                <td className="px-3 py-2 text-muted">{dataOra(c.creatLa)}</td>
                <td className="px-3 py-2 text-muted">{PACHETE[c.pachet] ?? c.pachet}</td>
                <td className="px-3 py-2 text-muted">
                  {c.sursa ? `${etichetaSursa(c.sursa)}${c.canal ? ` · ${ETICHETE_CANAL[c.canal].replace(" (organic sau plătit nedeterminat)", "")}` : ""}` : c.recomandat ? "Cod de recomandare" : "Fără sursă măsurată"}
                </td>
                <td className="px-3 py-2 text-muted">{c.tip ? ETICHETE_TIP[c.tip] : "—"}</td>
                <td className="px-3 py-2 text-muted">{c.campanie || "—"}</td>
              </tr>
            ))}
            {r.conturiNoi.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted">
                  Niciun cont creat în perioada aleasă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Generator de linkuri pentru campaniile către ONG-uri</h2>
      <p className="mt-1 text-xs text-muted">Aceleași convenții ca în CRM, cu linkuri către site-ul public. Linkurile din reclame și postări trebuie etichetate, altfel sursa rămâne „Direct” sau „Nedeterminat”.</p>
      <div className="mt-2">
        <GeneratorPlatforma siteUrl={siteUrl} />
      </div>
    </main>
  );
}

function Kpi({ eticheta, valoare, nota }: { eticheta: string; valoare: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-xs text-muted">{eticheta}</p>
      <p className="font-display mt-1 text-xl font-bold text-ink tabular-nums">{valoare}</p>
      {nota && <p className="mt-0.5 text-[11px] text-muted">{nota}</p>}
    </div>
  );
}
