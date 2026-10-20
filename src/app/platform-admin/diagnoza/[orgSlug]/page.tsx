import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { citesteDiagnoza } from "@/lib/suport/diagnoza";

export const metadata = { title: "Diagnoza contului", robots: { index: false, follow: false } };

function data(d: Date | null): string {
  return d ? new Date(d).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function Da({ da }: { da: boolean }) {
  return <span className={da ? "font-semibold text-brand-green" : "text-muted"}>{da ? "da" : "nu"}</span>;
}

function Rand({ eticheta, children }: { eticheta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
      <span className="text-muted">{eticheta}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}

// Pagină doar pentru contul platformei, și doar pentru organizațiile care au acordat accesul de suport. Nu afișează conținut CRM.
export default async function DiagnozaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const { orgSlug } = await params;
  const d = await citesteDiagnoza(orgSlug, authUser.email);
  if (d.tip === "organizatie_inexistenta") notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/platform-admin" className="text-xs font-medium text-brand-blue hover:underline">
        ← Panou platformă
      </Link>

      {d.tip === "fara_acces" ? (
        <>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">Diagnoza contului: {d.orgNume}</h1>
          <div className="mt-6 rounded-xl border border-line bg-panel p-5 text-sm text-body">
            <p className="font-medium text-ink">Organizația nu a acordat accesul de suport.</p>
            <p className="mt-1 text-muted">
              Un owner sau admin al organizației îl poate acorda din CRM → Setări → „Acces suport” (1, 3 sau 7 zile). Până atunci nu poți vedea diagnoza contului.
            </p>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">Diagnoza contului: {d.orgNume}</h1>
          <p className="mt-1 text-sm text-muted">
            Acces de suport acordat la {data(d.acces.acordatLa)}, expiră {data(d.acces.expiraLa)}. Nu vezi conținut CRM (nume, sume, notițe), doar configurare, numărători și erori. Deschiderea acestei pagini
            este înregistrată în jurnalul de audit al organizației.
          </p>

          <h2 className="mt-8 text-sm font-semibold text-ink">Configurare</h2>
          <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
            <Rand eticheta="Pachet ales / efectiv">
              {d.configurare.pachetAles} / {d.configurare.pachetEfectiv}
            </Rand>
            <Rand eticheta="Status abonament">{d.configurare.statusAbonament}</Rand>
            <Rand eticheta="Acces plătit până la">{data(d.configurare.accesPlatitPana)}</Rand>
            <Rand eticheta="Cont creat">{data(d.configurare.creat)}</Rand>
            <Rand eticheta="Utilizatori suplimentari">{d.configurare.utilizatoriExtra}</Rand>
            <Rand eticheta="Acord de prelucrare a datelor (DPA) acceptat"><Da da={d.configurare.dpaAcceptat} /></Rand>
            <Rand eticheta="Logo / slogan setate">
              <Da da={d.configurare.logo} /> / <Da da={d.configurare.sloganSetat} />
            </Rand>
            <Rand eticheta="Domeniu propriu">{d.configurare.domeniuPropriu ?? "—"}</Rand>
            <Rand eticheta="Domenii permise pentru widget">{d.configurare.domeniiWidget}</Rand>
            <Rand eticheta="Plăți donații prin Stripe conectate"><Da da={d.configurare.stripeDonatii} /></Rand>
            <Rand eticheta="Card salvat / reînnoire automată">
              <Da da={d.configurare.cardSalvat} /> / <Da da={d.configurare.reinnoireAutomata} />
            </Rand>
            <Rand eticheta="Reînnoiri eșuate la rând">{d.configurare.reinnoiriEsuate}</Rand>
          </div>

          <h2 className="mt-8 text-sm font-semibold text-ink">Module după pachet</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {d.module.map((m) => (
              <span key={m.cheie} className={`rounded-full border px-3 py-1 text-xs font-medium ${m.activ ? "border-brand-green text-brand-green" : "border-line text-muted line-through"}`}>
                {m.nume}
              </span>
            ))}
          </div>

          <h2 className="mt-8 text-sm font-semibold text-ink">Numărători</h2>
          <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
            {d.numaratori.map((n) => (
              <Rand key={n.eticheta} eticheta={n.eticheta}>
                <span className="tabular-nums">{n.valoare.toLocaleString("ro-RO")}</span>
              </Rand>
            ))}
          </div>

          <h2 className="mt-8 text-sm font-semibold text-ink">
            Echipa <span className="font-normal text-muted">({d.membri.length}, e-mailuri mascate)</span>
          </h2>
          <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
            {d.membri.map((m, i) => (
              <Rand key={i} eticheta={`${m.rol} · ${m.email}`}>
                ultima autentificare: {data(m.ultimaAutentificare)}
              </Rand>
            ))}
          </div>

          <h2 className="mt-8 text-sm font-semibold text-ink">Erori recente</h2>
          {d.eroriPeZona.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              Ultimele 7 zile, pe zonă: {d.eroriPeZona.map((z) => `${z.zona} (${z.nr})`).join(", ")}
            </p>
          )}
          <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
            {d.erori.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">Nicio eroare jurnalizată pentru această organizație.</p>
            ) : (
              d.erori.map((e) => (
                <div key={e.id} className="px-4 py-2.5 text-sm">
                  <p className="text-xs text-muted">
                    {data(e.la)} · <span className="font-mono">{e.zona}</span>
                    {e.cod ? ` · cod ${e.cod}` : ""}
                  </p>
                  <p className="mt-0.5 break-words font-mono text-xs text-body">{e.mesaj}</p>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Mesajele sunt curățate automat de e-mailuri, telefoane, CNP, IBAN și tokenuri; textul liber nu poate fi garantat complet curat.</p>
        </>
      )}
    </main>
  );
}
