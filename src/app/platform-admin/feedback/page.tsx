import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { ARII_NOTE, MODULE_FOLOSITE, categorieNps, rezumaChestionare } from "@/lib/feedback/calcule";

import { listeazaFeedbackAction, type FeedbackAdminRand } from "./actions";
import { SugestiiAdmin } from "./sugestii-admin";

export const dynamic = "force-dynamic";

const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

const CULOARE_NPS = { promotor: "bg-brand-green-soft text-brand-green", pasiv: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200", detractor: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" } as const;

function Bara({ valoare, max, clasa = "bg-brand-green" }: { valoare: number; max: number; clasa?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
      <div className={`h-full rounded-full ${clasa}`} style={{ width: `${Math.min(100, max > 0 ? (valoare / max) * 100 : 0)}%` }} />
    </div>
  );
}

// Doar pentru contul platformei: ce spun utilizatorii (NPS, satisfacție pe arii) și sugestiile lor, cu răspuns.
export default async function FeedbackAdminPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const randuri = await listeazaFeedbackAction();
  const chestionare = randuri.filter((r) => r.tip === "chestionar");
  const sugestii = randuri.filter((r) => r.tip === "sugestie");
  const rez = rezumaChestionare(chestionare.map((r) => ({ nps: r.nps, satisfactie: r.satisfactie, note: r.note, module: r.module, createdAt: new Date(r.createdAt) })));
  const organizatiiCareAuRaspuns = new Set(chestionare.map((r) => r.orgSlug)).size;
  const etichetaModul = (c: string) => MODULE_FOLOSITE.find((m) => m.cheie === c)?.eticheta ?? c;
  const maxModul = Math.max(1, ...rez.moduleFrecvente.map((m) => m.nr));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">Feedback de la utilizatori</h1>
      <p className="mt-1 text-sm text-muted">Chestionarul de satisfacție și sugestiile primite de la organizațiile din platformă. Vizibil doar contului platformei.</p>

      <h2 className="mt-8 text-sm font-semibold text-ink">Satisfacția clienților</h2>
      {rez.nr === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-line bg-panel p-6 text-sm text-muted">Nu a răspuns nimeni la chestionar încă. Invitația apare utilizatorilor în CRM la 5 zile după înscriere.</p>
      ) : (
        <>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Net Promoter Score</p>
              <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{rez.nps.nps === null ? "—" : rez.nps.nps > 0 ? `+${rez.nps.nps}` : rez.nps.nps}</p>
              <p className="mt-1 text-xs text-muted">de la −100 la +100; peste 0 e bine, peste 50 e foarte bine</p>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
                <div className="bg-brand-green" style={{ width: `${(rez.nps.promotori / rez.nps.nr) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(rez.nps.pasivi / rez.nps.nr) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(rez.nps.detractori / rez.nps.nr) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted tabular-nums">
                {rez.nps.promotori} promotori · {rez.nps.pasivi} pasivi · {rez.nps.detractori} detractori
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Satisfacție generală</p>
              <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">
                {rez.satisfactieMedie === null ? "—" : rez.satisfactieMedie.toLocaleString("ro-RO")}
                <span className="text-base font-semibold text-muted"> / 5</span>
              </p>
              <p className="mt-1 text-xs text-muted">media răspunsurilor</p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Răspunsuri</p>
              <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{rez.nr}</p>
              <p className="mt-1 text-xs text-muted">din {organizatiiCareAuRaspuns} {organizatiiCareAuRaspuns === 1 ? "organizație" : "organizații"}</p>
            </div>
          </div>
          {rez.nr < 10 && <p className="mt-2 text-xs text-muted">Sub 10 răspunsuri scorul se schimbă mult de la un răspuns la altul; folosește-l ca indiciu, nu ca verdict.</p>}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-panel p-5">
              <h3 className="text-sm font-semibold text-ink">Pe arii (medie de la 1 la 5)</h3>
              <div className="mt-3 space-y-3">
                {rez.mediiArii.map((a) => (
                  <div key={a.cheie}>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-body">{a.eticheta}</span>
                      <span className="font-semibold text-ink tabular-nums">{a.medie === null ? "—" : a.medie.toLocaleString("ro-RO")}{a.nr > 0 && <span className="font-normal text-muted"> ({a.nr})</span>}</span>
                    </div>
                    <Bara valoare={a.medie ?? 0} max={5} clasa={a.medie !== null && a.medie < 3 ? "bg-red-500" : a.medie !== null && a.medie < 4 ? "bg-amber-400" : "bg-brand-green"} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-panel p-5">
              <h3 className="text-sm font-semibold text-ink">Ce folosesc cel mai mult</h3>
              {rez.moduleFrecvente.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nimeni nu a bifat încă module.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {rez.moduleFrecvente.map((m) => (
                    <div key={m.cheie}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-body">{etichetaModul(m.cheie)}</span>
                        <span className="font-semibold text-ink tabular-nums">{m.nr}</span>
                      </div>
                      <Bara valoare={m.nr} max={maxModul} clasa="bg-brand-blue" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {rez.pelUna.length > 1 && (
            <div className="mt-4 rounded-xl border border-line bg-panel p-5">
              <h3 className="text-sm font-semibold text-ink">Evoluție pe luni</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="py-1 pr-4 font-semibold">Luna</th>
                      <th className="py-1 pr-4 font-semibold">Răspunsuri</th>
                      <th className="py-1 font-semibold">NPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rez.pelUna.map((l) => (
                      <tr key={l.luna} className="border-t border-line">
                        <td className="py-1.5 pr-4 text-body tabular-nums">{l.luna}</td>
                        <td className="py-1.5 pr-4 text-body tabular-nums">{l.nr}</td>
                        <td className="py-1.5 font-semibold text-ink tabular-nums">{l.nps === null ? "—" : l.nps > 0 ? `+${l.nps}` : l.nps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <h2 className="mt-8 text-sm font-semibold text-ink">
            Răspunsuri la chestionar <span className="font-normal text-muted">({chestionare.length})</span>
          </h2>
          <div className="mt-2 space-y-3">
            {chestionare.slice(0, 50).map((r) => (
              <RaspunsChestionar key={r.id} r={r} />
            ))}
          </div>
          {chestionare.length > 50 && <p className="mt-2 text-xs text-muted">Se arată ultimele 50 din {chestionare.length}.</p>}
        </>
      )}

      <h2 className="mt-10 text-sm font-semibold text-ink">
        Sugestii <span className="font-normal text-muted">({sugestii.length})</span>
      </h2>
      <p className="mt-1 text-xs text-muted">Starea și răspunsul se văd autorului în pagina lui „Părerea ta”. Adresa de e-mail apare doar dacă a bifat că poate fi contactat.</p>
      <div className="mt-2">
        <SugestiiAdmin initial={sugestii} />
      </div>
    </main>
  );
}

function RaspunsChestionar({ r }: { r: FeedbackAdminRand }) {
  const cat = r.nps === null ? null : categorieNps(r.nps);
  const note = ARII_NOTE.filter((a) => typeof r.note[a.cheie] === "number");
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-semibold text-ink">{r.orgNume}</span>
        <span className="text-muted">{dataRo(r.createdAt)}</span>
        {cat && r.nps !== null && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CULOARE_NPS[cat]}`}>NPS {r.nps}</span>}
        {r.satisfactie !== null && <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-semibold text-body">Satisfacție {r.satisfactie}/5</span>}
        {r.contact && (
          <a href={`mailto:${r.contact}`} className="ml-auto text-xs font-semibold text-brand-blue underline">
            {r.contact}
          </a>
        )}
      </div>
      {note.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          {note.map((a) => `${a.eticheta}: ${r.note[a.cheie]}`).join(" · ")}
        </p>
      )}
      {r.cePlace && (
        <p className="mt-2 text-[13px] text-body">
          <span className="font-semibold text-ink">Îi place: </span>
          {r.cePlace}
        </p>
      )}
      {r.ceLipseste && (
        <p className="mt-1.5 text-[13px] text-body">
          <span className="font-semibold text-ink">Ar îmbunătăți / îi lipsește: </span>
          {r.ceLipseste}
        </p>
      )}
    </div>
  );
}
