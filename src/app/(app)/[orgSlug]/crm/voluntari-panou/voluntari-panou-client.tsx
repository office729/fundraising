"use client";

import { Check, Copy, ExternalLink, Link2, Power, RefreshCw, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CANALE_VOLUNTAR } from "@/lib/voluntari-panou";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Input, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";

import {
  comutaLinkAction,
  creeazaLinkAction,
  salveazaMesajImplicitAction,
  scoateCampaniaSaptamaniiAction,
  schimbaLinkAction,
  stergeVoluntarPanouAction,
  seteazaCampaniaSaptamaniiAction,
  seteazaSetariCampanieAction,
  type CampaniePentruEchipa,
  type DatePanou,
} from "./actions";

const data = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function VoluntariPanouClient({ orgSlug, date }: { orgSlug: string; date: DatePanou }) {
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  // Rulează o acțiune de server, afișează rezultatul și reîncarcă datele paginii.
  function ruleaza(f: (orgSlug: string) => Promise<{ ok: true } | { ok: false; eroare: string }>, ok: string) {
    start(async () => {
      const r = await f(orgSlug);
      setMesaj(r.ok ? { tip: "ok", text: ok } : { tip: "eroare", text: r.eroare });
      if (r.ok) router.refresh();
    });
  }

  const { cifre } = date;
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Panoul voluntarilor</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            O pagină publică, fără cont, unde voluntarii dau mai departe campaniile organizației. Împarți un singur link; vezi aici cine a distribuit și ce.
          </p>
        </div>
        <Link href={`/${orgSlug}/crm-voluntari`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
          ← CRM Voluntari
        </Link>
      </div>

      {mesaj && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-green-soft)] text-[var(--ci-green)]"}`}>
          {mesaj.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { e: "Voluntari înscriși", n: cifre.voluntari },
          { e: "Activi în ultimele 7 zile", n: cifre.activi7 },
          { e: "Distribuiri în total", n: cifre.distribuiri },
          { e: "Distribuiri, ultimele 7 zile", n: cifre.distribuiri7 },
        ].map((x) => (
          <Card key={x.e}>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{x.e}</p>
            <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{x.n}</p>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[
          { key: "link", label: "Link și campania săptămânii" },
          { key: "campanii", label: `Campanii (${date.campanii.filter((c) => c.status === "activa").length})` },
          { key: "voluntari", label: `Voluntari (${date.voluntari.length})` },
        ]}
      >
        {(tab) =>
          tab === "link" ? (
            <div className="space-y-5">
              <LinkCard date={date} pending={pending} ruleaza={ruleaza} setMesaj={setMesaj} />
              <SaptamaniCard date={date} pending={pending} ruleaza={ruleaza} />
            </div>
          ) : tab === "campanii" ? (
            <CampaniiTab campanii={date.campanii} orgSlug={orgSlug} ruleaza={ruleaza} pending={pending} />
          ) : (
            <VoluntariTab date={date} ruleaza={ruleaza} />
          )
        }
      </Tabs>
    </div>
  );
}

type Ruleaza = (f: (orgSlug: string) => Promise<{ ok: true } | { ok: false; eroare: string }>, ok: string) => void;

// ===== Link =====
function LinkCard({ date, pending, ruleaza, setMesaj }: { date: DatePanou; pending: boolean; ruleaza: Ruleaza; setMesaj: (m: { tip: "ok" | "eroare"; text: string } | null) => void }) {
  const link = date.link;
  const [copiat, setCopiat] = useState(false);
  const [mesajImplicit, setMesajImplicit] = useState(link?.mesajImplicit ?? "");

  async function copiaza() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      setMesaj({ tip: "eroare", text: "Nu am putut copia automat. Selectează linkul și copiază-l manual." });
    }
  }

  if (!link) {
    return (
      <Card>
        <CardHeader title="Linkul voluntarilor" subtitle="Nu ai creat încă linkul. Îl poți porni sau opri oricând." />
        <Button variant="primary" loading={pending} onClick={() => ruleaza((s) => creeazaLinkAction(s), "Link creat.")}>
          <Link2 className="size-4" aria-hidden /> Creează linkul
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Linkul voluntarilor"
        subtitle="Același link pentru toți voluntarii. Cine îl are poate intra, fără cont."
        action={<Badge tone={link.activ ? "green" : "neutral"}>{link.activ ? "Activ" : "Oprit"}</Badge>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input readOnly value={link.url} aria-label="Linkul voluntarilor" onFocus={(e) => e.currentTarget.select()} className="min-w-[260px] flex-1 font-mono text-[12.5px]" />
        <Button onClick={copiaza}>
          {copiat ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiat ? "Copiat" : "Copiază"}
        </Button>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-sm text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
          <ExternalLink className="size-4" aria-hidden /> Deschide
        </a>
      </div>
      {link.schimbatLa && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">Codul a fost schimbat ultima dată pe {data(link.schimbatLa)}.</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          loading={pending}
          onClick={() => {
            if (window.confirm("Schimbi linkul? Cel vechi încetează să funcționeze imediat, iar voluntarii trebuie să primească linkul nou.")) ruleaza((s) => schimbaLinkAction(s), "Linkul a fost schimbat. Trimite-l voluntarilor.");
          }}
        >
          <RefreshCw className="size-4" aria-hidden /> Schimbă linkul
        </Button>
        <Button loading={pending} onClick={() => ruleaza((s) => comutaLinkAction(s, !link.activ), link.activ ? "Linkul a fost oprit." : "Linkul a fost pornit.")}>
          <Power className="size-4" aria-hidden /> {link.activ ? "Oprește linkul" : "Pornește linkul"}
        </Button>
      </div>

      <div className="mt-5 border-t border-[var(--ci-border)] pt-4">
        <label htmlFor="mesaj-implicit" className="mb-1 block text-[13px] font-medium text-[var(--ci-text)]">
          Mesajul implicit de distribuire <span className="font-normal text-[var(--ci-text-muted)]">(opțional)</span>
        </label>
        <p className="mb-2 text-[12px] text-[var(--ci-text-muted)]">
          Folosit pentru campaniile fără mesaj propriu. Poți scrie <code>{"{titlu}"}</code> și <code>{"{link}"}</code>. Lăsat gol, platforma generează mesajul și îl variază (6 începuturi diferite), ca să nu pară trimis în serie.
        </p>
        <Textarea id="mesaj-implicit" rows={4} maxLength={1200} value={mesajImplicit} onChange={(e) => setMesajImplicit(e.target.value)} placeholder="ex. Susține și tu campania „{titlu}”: {link}" />
        <div className="mt-2">
          <Button size="sm" loading={pending} onClick={() => ruleaza((s) => salveazaMesajImplicitAction(s, mesajImplicit), "Mesajul implicit a fost salvat.")}>
            Salvează mesajul
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ===== Campania săptămânii =====
function SaptamaniCard({ date, pending, ruleaza }: { date: DatePanou; pending: boolean; ruleaza: Ruleaza }) {
  const active = date.campanii.filter((c) => c.status === "activa");
  const [luni, setLuni] = useState(date.saptamani[0]?.luni ?? "");
  const [campanie, setCampanie] = useState(active[0]?.id ?? "");
  const titlu = (id: string | null) => date.campanii.find((c) => c.id === id)?.titlu ?? "campanie ștearsă";
  const programate = date.saptamani.filter((s) => s.campaignId);

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-4 text-[var(--ci-amber)]" aria-hidden /> Campania săptămânii
          </span>
        }
        subtitle="Apare prima în panou, ca o carte mare, și are prioritate în misiunea zilnică a voluntarilor. O săptămână are o singură campanie; o alegere nouă o înlocuiește."
      />
      {active.length === 0 ? (
        <EmptyState icon={Star} title="Nicio campanie activă" description="Creează sau activează o campanie în Strângere de fonduri ca s-o poți alege." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="sapt-luni" className="mb-1.5 block text-[13px] font-medium">
              Săptămâna
            </label>
            <Select id="sapt-luni" value={luni} onChange={(e) => setLuni(e.target.value)}>
              {date.saptamani.map((s) => (
                <option key={s.luni} value={s.luni}>
                  {s.eticheta}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="sapt-campanie" className="mb-1.5 block text-[13px] font-medium">
              Campania
            </label>
            <Select id="sapt-campanie" value={campanie} onChange={(e) => setCampanie(e.target.value)}>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titlu}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" loading={pending} disabled={!luni || !campanie} onClick={() => ruleaza((s) => seteazaCampaniaSaptamaniiAction(s, luni, campanie), "Campania săptămânii a fost setată.")}>
            Setează
          </Button>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Program</p>
        {programate.length === 0 ? (
          <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">Nicio săptămână programată. Fără alegere, panoul nu are campanie vedetă.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--ci-border)]">
            {programate.map((s) => (
              <li key={s.luni} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="text-[var(--ci-text-muted)]">{s.eticheta}</span>
                <span className="min-w-0 flex-1 truncate text-right font-medium text-[var(--ci-text)]">{titlu(s.campaignId)}</span>
                <Button size="sm" variant="ghost" aria-label={`Scoate campania din ${s.eticheta}`} onClick={() => ruleaza((slug) => scoateCampaniaSaptamaniiAction(slug, s.luni), "Săptămâna a fost eliberată.")}>
                  <Trash2 className="size-4" aria-hidden /> Scoate
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ===== Campanii =====
function CampaniiTab({ campanii, orgSlug, ruleaza, pending }: { campanii: CampaniePentruEchipa[]; orgSlug: string; ruleaza: Ruleaza; pending: boolean }) {
  if (campanii.length === 0) {
    return <EmptyState icon={Star} title="Nicio campanie încă" description="Campaniile din Strângere de fonduri apar aici și în panoul voluntarilor." />;
  }
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">
        Voluntarii văd doar campaniile active și nemascate. Poți ascunde o campanie de panou sau îi poți da un mesaj propriu de distribuit (<code>{"{titlu}"}</code> și <code>{"{link}"}</code> se înlocuiesc automat).
      </p>
      {campanii.map((c) => (
        <CampanieRand key={c.id} c={c} orgSlug={orgSlug} ruleaza={ruleaza} pending={pending} />
      ))}
    </div>
  );
}

function CampanieRand({ c, orgSlug, ruleaza, pending }: { c: CampaniePentruEchipa; orgSlug: string; ruleaza: Ruleaza; pending: boolean }) {
  const [mesaj, setMesaj] = useState(c.mesaj);
  const inchisa = c.status === "inchisa";
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-[var(--ci-text)]">{c.titlu}</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            {c.distribuiri} distribuiri · {c.distribuiri7} în ultimele 7 zile
            {Object.keys(c.pecanale).length > 0 && (
              <>
                {" · "}
                {CANALE_VOLUNTAR.filter((x) => c.pecanale[x.id]).map((x) => `${x.nume} ${c.pecanale[x.id]}`).join(", ")}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inchisa ? <Badge tone="neutral">Închisă</Badge> : c.ascunsa ? <Badge tone="amber">Ascunsă voluntarilor</Badge> : <Badge tone="green">Vizibilă</Badge>}
          <a href={`/strangere-fonduri/${orgSlug}/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
            Pagina campaniei
          </a>
        </div>
      </div>
      {!inchisa && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`m-${c.id}`} className="block text-[12.5px] font-medium text-[var(--ci-text)]">
            Mesaj propriu <span className="font-normal text-[var(--ci-text-muted)]">(opțional; gol = mesaj generat și variat)</span>
          </label>
          <Textarea id={`m-${c.id}`} rows={3} maxLength={1200} value={mesaj} onChange={(e) => setMesaj(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={pending} onClick={() => ruleaza((s) => seteazaSetariCampanieAction(s, c.id, { ascunsa: c.ascunsa, mesaj }), "Mesajul campaniei a fost salvat.")}>
              Salvează mesajul
            </Button>
            <Button size="sm" variant="ghost" loading={pending} onClick={() => ruleaza((s) => seteazaSetariCampanieAction(s, c.id, { ascunsa: !c.ascunsa, mesaj: c.mesaj }), c.ascunsa ? "Campania e din nou vizibilă voluntarilor." : "Campania a fost ascunsă voluntarilor.")}>
              {c.ascunsa ? "Arată voluntarilor" : "Ascunde de voluntari"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ===== Voluntari =====
function VoluntariTab({ date, ruleaza }: { date: DatePanou; ruleaza: Ruleaza }) {
  if (date.voluntari.length === 0) {
    return <EmptyState icon={Link2} title="Niciun voluntar încă" description={date.link ? "Trimite linkul voluntarilor. Cei care intră apar aici." : "Creează linkul, apoi trimite-l voluntarilor."} />;
  }
  return (
    <Card padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
              <th className="px-4 py-2.5 font-medium">Voluntar</th>
              <th className="px-3 py-2.5 font-medium">Fișă CRM</th>
              <th className="px-3 py-2.5 text-right font-medium">Distribuiri</th>
              <th className="px-3 py-2.5 text-right font-medium">7 zile</th>
              <th className="px-4 py-2.5 font-medium">Ultima activitate</th>
              <th className="px-3 py-2.5"><span className="sr-only">Acțiuni</span></th>
            </tr>
          </thead>
          <tbody>
            {[...date.voluntari].sort((a, b) => a.prenume.localeCompare(b.prenume, "ro")).map((v) => (
              <tr key={v.id} className="border-b border-[var(--ci-border)] last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-[var(--ci-text)]">{v.prenume}</span>
                  {v.telefon && <span className="ml-2 text-[12px] text-[var(--ci-text-muted)]">…{v.telefon.slice(-4)}</span>}
                </td>
                <td className="px-3 py-2.5">{v.voluntarId ? <Badge tone="green">{v.legatDe ?? "Legat"}</Badge> : <span className="text-[var(--ci-text-faint)]">{v.telefon ? "Nu s-a găsit" : "Fără telefon"}</span>}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{v.distribuiri}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{v.distribuiri7}</td>
                <td className="px-4 py-2.5 text-[var(--ci-text-muted)]">{dataOra(v.ultimaActivitateLa)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Șterge ${v.prenume} din panou`}
                    onClick={() => {
                      if (window.confirm(`Ștergi ${v.prenume} din panou? Se șterg și distribuirile lui. Nu se poate anula.`)) ruleaza((s) => stergeVoluntarPanouAction(s, v.id), "Voluntarul a fost șters din panou.");
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--ci-border)] px-4 py-2.5 text-[12px] text-[var(--ci-text-muted)]">Sortat alfabetic. Din motive de confidențialitate, se afișează doar ultimele 4 cifre ale telefonului.</p>
    </Card>
  );
}
