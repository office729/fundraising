"use client";

import { Check, Copy, ExternalLink, Link2, Power, RefreshCw, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { traduEticheteSaptamana, VOLUNTARI_UI_DICT } from "@/lib/i18n/dictionaries/voluntari-ui";
import { CANALE_VOLUNTAR } from "@/lib/voluntari-panou";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Input, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";
import { useLocale } from "../lib/locale-context";

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

const data = (iso: string, numere: string) => new Date(iso).toLocaleDateString(numere, { day: "2-digit", month: "short", year: "numeric" });
const dataOra = (iso: string, numere: string) => new Date(iso).toLocaleString(numere, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function VoluntariPanouClient({ orgSlug, date }: { orgSlug: string; date: DatePanou }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.panou;
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
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            {d.desc}
          </p>
        </div>
        <Link href={`/${orgSlug}/crm-voluntari`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
          {d.inapoi}
        </Link>
      </div>

      {mesaj && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-green-soft)] text-[var(--ci-green)]"}`}>
          {mesaj.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { e: d.cifre.voluntari, n: cifre.voluntari },
          { e: d.cifre.activi7, n: cifre.activi7 },
          { e: d.cifre.distribuiri, n: cifre.distribuiri },
          { e: d.cifre.distribuiri7, n: cifre.distribuiri7 },
        ].map((x) => (
          <Card key={x.e}>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{x.e}</p>
            <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{x.n}</p>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[
          { key: "link", label: d.taburi.link },
          { key: "campanii", label: `${d.taburi.campanii} (${date.campanii.filter((c) => c.status === "activa").length})` },
          { key: "voluntari", label: `${d.taburi.voluntari} (${date.voluntari.length})` },
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
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.panou.linkCard;
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
      setMesaj({ tip: "eroare", text: dict.comun.eroareCopiere });
    }
  }

  if (!link) {
    return (
      <Card>
        <CardHeader title={d.titlu} subtitle={d.creeazaSub} />
        <Button variant="primary" loading={pending} onClick={() => ruleaza((s) => creeazaLinkAction(s), d.creat)}>
          <Link2 className="size-4" aria-hidden /> {dict.prezentare.creeazaLink}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={d.titlu}
        subtitle={d.sub}
        action={<Badge tone={link.activ ? "green" : "neutral"}>{link.activ ? d.activ : d.oprit}</Badge>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input readOnly value={link.url} aria-label={d.aria} onFocus={(e) => e.currentTarget.select()} className="min-w-[260px] flex-1 font-mono text-[12.5px]" />
        <Button onClick={copiaza}>
          {copiat ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiat ? dict.comun.copiat : dict.comun.copiaza}
        </Button>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-sm text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
          <ExternalLink className="size-4" aria-hidden /> {dict.comun.deschide}
        </a>
      </div>
      {link.schimbatLa && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{d.schimbatLa(data(link.schimbatLa, dict.numere))}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          loading={pending}
          onClick={() => {
            if (window.confirm(d.confirmaSchimba)) ruleaza((s) => schimbaLinkAction(s), d.schimbat);
          }}
        >
          <RefreshCw className="size-4" aria-hidden /> {d.schimba}
        </Button>
        <Button loading={pending} onClick={() => ruleaza((s) => comutaLinkAction(s, !link.activ), link.activ ? d.oprit2 : d.pornit)}>
          <Power className="size-4" aria-hidden /> {link.activ ? d.opreste : d.porneste}
        </Button>
      </div>

      <div className="mt-5 border-t border-[var(--ci-border)] pt-4">
        <label htmlFor="mesaj-implicit" className="mb-1 block text-[13px] font-medium text-[var(--ci-text)]">
          {d.mesajImplicit} <span className="font-normal text-[var(--ci-text-muted)]">{d.optional}</span>
        </label>
        <p className="mb-2 text-[12px] text-[var(--ci-text-muted)]">
          {d.mesajNota}
        </p>
        <Textarea id="mesaj-implicit" rows={4} maxLength={1200} value={mesajImplicit} onChange={(e) => setMesajImplicit(e.target.value)} placeholder={d.mesajPlaceholder} />
        <div className="mt-2">
          <Button size="sm" loading={pending} onClick={() => ruleaza((s) => salveazaMesajImplicitAction(s, mesajImplicit), d.mesajSalvat)}>
            {d.salveazaMesaj}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ===== Campania săptămânii =====
function SaptamaniCard({ date, pending, ruleaza }: { date: DatePanou; pending: boolean; ruleaza: Ruleaza }) {
  const locale = useLocale();
  const dict = VOLUNTARI_UI_DICT[locale];
  const d = dict.panou.sapt;
  const etSapt = (e: string) => traduEticheteSaptamana(locale, e);
  const active = date.campanii.filter((c) => c.status === "activa");
  const [luni, setLuni] = useState(date.saptamani[0]?.luni ?? "");
  const [campanie, setCampanie] = useState(active[0]?.id ?? "");
  const titlu = (id: string | null) => date.campanii.find((c) => c.id === id)?.titlu ?? d.stearsa;
  const programate = date.saptamani.filter((s) => s.campaignId);

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-4 text-[var(--ci-amber)]" aria-hidden /> {d.titlu}
          </span>
        }
        subtitle={d.sub}
      />
      {active.length === 0 ? (
        <EmptyState icon={Star} title={d.golTitlu} description={d.golDesc} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="sapt-luni" className="mb-1.5 block text-[13px] font-medium">
              {d.saptamana}
            </label>
            <Select id="sapt-luni" value={luni} onChange={(e) => setLuni(e.target.value)}>
              {date.saptamani.map((s) => (
                <option key={s.luni} value={s.luni}>
                  {etSapt(s.eticheta)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="sapt-campanie" className="mb-1.5 block text-[13px] font-medium">
              {d.campania}
            </label>
            <Select id="sapt-campanie" value={campanie} onChange={(e) => setCampanie(e.target.value)}>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titlu}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" loading={pending} disabled={!luni || !campanie} onClick={() => ruleaza((s) => seteazaCampaniaSaptamaniiAction(s, luni, campanie), d.setata)}>
            {d.seteaza}
          </Button>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{d.program}</p>
        {programate.length === 0 ? (
          <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{d.niciuna}</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--ci-border)]">
            {programate.map((s) => (
              <li key={s.luni} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="text-[var(--ci-text-muted)]">{etSapt(s.eticheta)}</span>
                <span className="min-w-0 flex-1 truncate text-right font-medium text-[var(--ci-text)]">{titlu(s.campaignId)}</span>
                <Button size="sm" variant="ghost" aria-label={d.scoateAria(etSapt(s.eticheta))} onClick={() => ruleaza((slug) => scoateCampaniaSaptamaniiAction(slug, s.luni), d.eliberata)}>
                  <Trash2 className="size-4" aria-hidden /> {d.scoate}
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
  const d = VOLUNTARI_UI_DICT[useLocale()].panou.campanii;
  if (campanii.length === 0) {
    return <EmptyState icon={Star} title={d.golTitlu} description={d.golDesc} />;
  }
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">
        {d.nota}
      </p>
      {campanii.map((c) => (
        <CampanieRand key={c.id} c={c} orgSlug={orgSlug} ruleaza={ruleaza} pending={pending} />
      ))}
    </div>
  );
}

function CampanieRand({ c, orgSlug, ruleaza, pending }: { c: CampaniePentruEchipa; orgSlug: string; ruleaza: Ruleaza; pending: boolean }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.panou.campanii;
  const [mesaj, setMesaj] = useState(c.mesaj);
  const inchisa = c.status === "inchisa";
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-[var(--ci-text)]">{c.titlu}</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            {d.distribuiri(c.distribuiri, c.distribuiri7)}
            {Object.keys(c.pecanale).length > 0 && (
              <>
                {" · "}
                {CANALE_VOLUNTAR.filter((x) => c.pecanale[x.id]).map((x) => `${dict.canale[x.id] ?? x.nume} ${c.pecanale[x.id]}`).join(", ")}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inchisa ? <Badge tone="neutral">{d.inchisa}</Badge> : c.ascunsa ? <Badge tone="amber">{d.ascunsa}</Badge> : <Badge tone="green">{d.vizibila}</Badge>}
          <a href={`/strangere-fonduri/${orgSlug}/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
            {d.pagina}
          </a>
        </div>
      </div>
      {!inchisa && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`m-${c.id}`} className="block text-[12.5px] font-medium text-[var(--ci-text)]">
            {d.mesajPropriu} <span className="font-normal text-[var(--ci-text-muted)]">{d.mesajOpt}</span>
          </label>
          <Textarea id={`m-${c.id}`} rows={3} maxLength={1200} value={mesaj} onChange={(e) => setMesaj(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={pending} onClick={() => ruleaza((s) => seteazaSetariCampanieAction(s, c.id, { ascunsa: c.ascunsa, mesaj }), d.mesajSalvat)}>
              {d.salveazaMesaj}
            </Button>
            <Button size="sm" variant="ghost" loading={pending} onClick={() => ruleaza((s) => seteazaSetariCampanieAction(s, c.id, { ascunsa: !c.ascunsa, mesaj: c.mesaj }), c.ascunsa ? d.vizibilaAcum : d.ascunsaAcum)}>
              {c.ascunsa ? d.arata : d.ascunde}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ===== Voluntari =====
function VoluntariTab({ date, ruleaza }: { date: DatePanou; ruleaza: Ruleaza }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.panou.vol;
  if (date.voluntari.length === 0) {
    return <EmptyState icon={Link2} title={d.golTitlu} description={date.link ? d.golDescLink : d.golDescFaraLink} />;
  }
  return (
    <Card padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
              <th className="px-4 py-2.5 font-medium">{d.voluntar}</th>
              <th className="px-3 py-2.5 font-medium">{d.fisa}</th>
              <th className="px-3 py-2.5 text-right font-medium">{d.distribuiri}</th>
              <th className="px-3 py-2.5 text-right font-medium">{d.zile7}</th>
              <th className="px-4 py-2.5 font-medium">{d.ultima}</th>
              <th className="px-3 py-2.5"><span className="sr-only">{d.actiuni}</span></th>
            </tr>
          </thead>
          <tbody>
            {[...date.voluntari].sort((a, b) => a.prenume.localeCompare(b.prenume, dict.locutor)).map((v) => (
              <tr key={v.id} className="border-b border-[var(--ci-border)] last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-[var(--ci-text)]">{v.prenume}</span>
                  {v.telefon && <span className="ml-2 text-[12px] text-[var(--ci-text-muted)]">…{v.telefon.slice(-4)}</span>}
                </td>
                <td className="px-3 py-2.5">{v.voluntarId ? <Badge tone="green">{v.legatDe ?? d.legat}</Badge> : <span className="text-[var(--ci-text-faint)]">{v.telefon ? d.nuGasit : d.faraTelefon}</span>}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{v.distribuiri}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{v.distribuiri7}</td>
                <td className="px-4 py-2.5 text-[var(--ci-text-muted)]">{dataOra(v.ultimaActivitateLa, dict.numere)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={d.stergeAria(v.prenume)}
                    onClick={() => {
                      if (window.confirm(d.confirma(v.prenume))) ruleaza((s) => stergeVoluntarPanouAction(s, v.id), d.sters);
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
      <p className="border-t border-[var(--ci-border)] px-4 py-2.5 text-[12px] text-[var(--ci-text-muted)]">{d.nota}</p>
    </Card>
  );
}
