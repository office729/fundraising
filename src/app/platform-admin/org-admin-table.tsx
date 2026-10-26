"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { TRIAL_DAYS } from "@/lib/billing/trial";

import { ajusteazaOrgAction, stergeOrgExpirataAction, type OrgRand } from "./actions";

const PACHETE = ["trial", "start", "crestere", "impact", "custom"];
const STATUSURI = ["trialing", "active", "past_due", "canceled", "incomplete"];

function zileRamaseProba(createdAt: Date): number {
  const sfarsit = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((sfarsit.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

const DOMENII: Record<string, string> = {
  copii: "Copii",
  animale: "Animale",
  mediu: "Mediu",
  educatie: "Educație",
  sanatate: "Sănătate",
  social_incluziune: "Social și incluziune",
  cultura: "Cultură",
  sport: "Sport",
  altele: "Altele",
};

// Telefonul pentru linkul tel: (cifre și + inițial, fără spații).
const telefonLink = (t: string) => t.replace(/[^\d+]/g, "");

// Contactele organizațiilor ca CSV (cu BOM, ca Excel să citească diacriticele); celulele care încep cu = + - @ se prefixează, ca să nu fie citite ca formule.
function exportaCsv(orgs: OrgRand[]) {
  const celula = (v: string | null) => {
    let t = (v ?? "").replace(/[\r\n]+/g, " ");
    if (/^[=+\-@\t]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const antet = ["Organizație", "Adresa în platformă", "Nume contact", "E-mail", "Telefon", "CIF", "Județ", "Domeniu", "Pachet", "Status", "Creat la", "Ultima autentificare"];
  const randuri = orgs.map((o) => [o.nume, o.slug, o.proprietarNume, o.proprietarEmail, o.telefon, o.cif, o.judet, o.domeniuActivitate ? (DOMENII[o.domeniuActivitate] ?? o.domeniuActivitate) : null, o.package, o.subscriptionStatus, formatData(o.createdAt), formatData(o.proprietarUltimaAutentificare)]);
  const csv = "\uFEFF" + [antet, ...randuri].map((r) => r.map(celula).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `organizatii-alexandrit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatData(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

// `personalizari`: ce diferă față de standard la fiecare organizație (după slug), generat din configurare; `nota`: există o notiță internă.
export type PersonalizariOrg = Record<string, { linii: string[]; nota: boolean }>;

export function OrgAdminTable({ initial, personalizari = {}, timp = {} }: { initial: OrgRand[]; personalizari?: PersonalizariOrg; timp?: Record<string, string> }) {
  const [orgs, setOrgs] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{ package: string; subscriptionStatus: string; currentPeriodEnd: string }>({
    package: "trial",
    subscriptionStatus: "trialing",
    currentPeriodEnd: "",
  });
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Ștergerea definitivă: organizația aleasă și adresa (slug-ul) scrisă de administrator ca să confirme.
  const [deSters, setDeSters] = useState<string | null>(null);
  const [confirmare, setConfirmare] = useState("");

  const onSterge = (o: OrgRand) => {
    start(async () => {
      setEroare(null);
      const r = await stergeOrgExpirataAction(o.id, confirmare);
      if (r.error) {
        setEroare(r.error);
        return;
      }
      setOrgs((prev) => prev.filter((x) => x.id !== o.id));
      setDeSters(null);
      setConfirmare("");
    });
  };

  const deschideEdit = (o: OrgRand) => {
    setForm({
      package: o.package,
      subscriptionStatus: o.subscriptionStatus,
      currentPeriodEnd: o.currentPeriodEnd ? new Date(o.currentPeriodEnd).toISOString().slice(0, 10) : "",
    });
    setEditId(o.id);
    setEroare(null);
  };

  const onSalveaza = (id: string) => {
    start(async () => {
      try {
        await ajusteazaOrgAction(id, { ...form, currentPeriodEnd: form.currentPeriodEnd || null });
        setOrgs((prev) =>
          prev.map((o) =>
            o.id === id
              ? { ...o, package: form.package, subscriptionStatus: form.subscriptionStatus, currentPeriodEnd: form.currentPeriodEnd ? new Date(form.currentPeriodEnd) : null }
              : o,
          ),
        );
        setEditId(null);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div>
      {eroare && <p className="mb-2 text-xs text-red-600">{eroare}</p>}
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => exportaCsv(orgs)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-panel-2">
          Exportă contactele (CSV)
        </button>
      </div>
      <div className="divide-y divide-line rounded-xl border border-line bg-panel">
        {orgs.map((o) => {
          const inProba = o.package === "trial";
          const zileRamase = inProba ? zileRamaseProba(o.createdAt) : null;
          return (
            <div key={o.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">
                    {o.nume} <span className="font-mono text-xs text-muted-2">/{o.slug}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {o.proprietarEmail ?? "fără proprietar"} · ultima autentificare: {formatData(o.proprietarUltimaAutentificare)} · creat {formatData(o.createdAt)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    {o.proprietarNume && <span className="font-medium text-ink">{o.proprietarNume}</span>}
                    {o.proprietarEmail && (
                      <a href={`mailto:${o.proprietarEmail}`} className="text-brand-blue hover:underline">
                        {o.proprietarEmail}
                      </a>
                    )}
                    {o.telefon ? (
                      <a href={`tel:${telefonLink(o.telefon)}`} className="text-brand-blue hover:underline">
                        {o.telefon}
                      </a>
                    ) : (
                      <span>telefon necompletat</span>
                    )}
                    {o.cif && <span>CIF {o.cif}</span>}
                    {o.judet && <span>{o.judet}</span>}
                    {o.domeniuActivitate && <span>{DOMENII[o.domeniuActivitate] ?? o.domeniuActivitate}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-semibold text-ink">{o.package}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      o.subscriptionStatus === "active"
                        ? "bg-brand-green-soft text-brand-green"
                        : o.subscriptionStatus === "past_due" || o.subscriptionStatus === "canceled"
                          ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {o.subscriptionStatus}
                  </span>
                  {inProba && (
                    <span className={`text-xs font-medium ${zileRamase === 0 ? "text-red-600" : "text-muted"}`}>
                      {zileRamase === 0 ? "probă expirată" : `${zileRamase} zile probă`}
                    </span>
                  )}
                  <Link
                    prefetch={false}
                    href={`/platform-admin/diagnoza/${o.slug}`}
                    title={o.suportExpiraLa ? `Acces de suport activ până la ${formatData(o.suportExpiraLa)}` : "Organizația nu a acordat accesul de suport"}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${o.suportExpiraLa ? "border-brand-green text-brand-green hover:bg-panel-2" : "border-line text-muted hover:bg-panel-2"}`}
                  >
                    Diagnoză{o.suportExpiraLa ? "" : " (fără acces)"}
                  </Link>
                  <Link
                    prefetch={false}
                    href={`/platform-admin/personalizare/${o.slug}`}
                    title={
                      personalizari[o.slug]?.linii.length
                        ? `Personalizat:\n${personalizari[o.slug].linii.join("\n")}`
                        : "Aspectul dashboardului: meniu, familie vizuală, blocuri, cu previzualizare pe date de exemplu (fără datele organizației)"
                    }
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-panel-2 ${
                      personalizari[o.slug]?.linii.length ? "border-brand-blue text-brand-blue" : "border-line text-ink"
                    }`}
                  >
                    Aspect
                    {personalizari[o.slug]?.linii.length ? ` · ${personalizari[o.slug].linii.length} diferențe` : ""}
                    {personalizari[o.slug]?.nota ? " · notiță" : ""}
                  </Link>
                  <Link prefetch={false} href={`/platform-admin/timp/${o.slug}`} title="Timp alocat: timer, intrări, tarife și suma de facturat" className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-panel-2">
                    Timp{timp[o.id] ? ` · ${timp[o.id]}` : ""}
                  </Link>
                  <button type="button" onClick={() => deschideEdit(o)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-panel-2">
                    Ajustează
                  </button>
                  {o.poateSterge && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeSters(o.id);
                        setConfirmare("");
                        setEroare(null);
                      }}
                      title="Proba de 30 de zile a expirat și nu are abonament: poți șterge organizația"
                      className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                    >
                      Șterge
                    </button>
                  )}
                </div>
              </div>

              {deSters === o.id && (
                <div role="alertdialog" aria-label={`Șterge ${o.nume}`} className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                  <p className="font-semibold">Ștergi definitiv „{o.nume}”?</p>
                  <p className="mt-1">
                    Proba de 30 de zile a expirat și organizația nu are abonament. Se șterg toate datele ei (contacte, donatori, campanii, setări, fișiere) și nu se mai pot recupera. Contul de utilizator al proprietarului ({o.proprietarEmail ?? "—"}) rămâne.
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div>
                      <label htmlFor={`sterge-${o.id}`} className="mb-1 block">
                        Scrie adresa organizației ca să confirmi: <span className="font-mono font-semibold">{o.slug}</span>
                      </label>
                      <input
                        id={`sterge-${o.id}`}
                        value={confirmare}
                        onChange={(e) => setConfirmare(e.target.value)}
                        autoComplete="off"
                        className="h-8 w-72 max-w-full rounded-md border border-red-300 bg-white px-2 font-mono text-xs text-ink dark:bg-panel"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onSterge(o)}
                      disabled={pending || confirmare.trim() !== o.slug}
                      className="h-8 rounded-md bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {pending ? "Se șterge…" : "Șterge definitiv"}
                    </button>
                    <button type="button" onClick={() => setDeSters(null)} disabled={pending} className="h-8 rounded-md px-2 text-xs hover:underline">
                      Anulează
                    </button>
                  </div>
                </div>
              )}

              {editId === o.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2.5 rounded-lg border border-line bg-panel-2 p-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Pachet</label>
                    <select value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink">
                      {PACHETE.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Status abonament</label>
                    <select value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })} className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink">
                      {STATUSURI.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Acces plătit până la</label>
                    <input
                      type="date"
                      value={form.currentPeriodEnd}
                      onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })}
                      className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink"
                    />
                  </div>
                  <button type="button" onClick={() => onSalveaza(o.id)} disabled={pending} className="h-8 rounded-md bg-brand-blue px-3 text-xs font-semibold text-white disabled:opacity-50">
                    Salvează
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="h-8 rounded-md px-2 text-xs text-muted hover:text-ink">
                    Anulează
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
