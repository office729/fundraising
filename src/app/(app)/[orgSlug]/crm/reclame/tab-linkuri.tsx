"use client";

import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { construiesteLink, PARAMETRI_META, PRESETURI_SURSA, urmatorulCod } from "@/lib/reclame/utm";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";

import { salveazaLinkAction, stergeLinkAction, type DateReclame } from "./actions";

const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", year: "numeric" });

async function copiaza(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ButonCopiere({ text, eticheta = "Copiază linkul" }: { text: string; eticheta?: string }) {
  const [copiat, setCopiat] = useState<"da" | "nu" | null>(null);
  return (
    <Button
      type="button"
      onClick={async () => {
        setCopiat((await copiaza(text)) ? "da" : "nu");
        setTimeout(() => setCopiat(null), 2000);
      }}
    >
      {copiat === "da" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copiat === "da" ? "Copiat" : copiat === "nu" ? "Selectează și copiază manual" : eticheta}
    </Button>
  );
}

// Generatorul de linkuri UTM: coduri neutre (cmp_026, cr_014), fără numele campaniei umanitare sau al beneficiarului.
export function TabLinkuri({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const folosite = useMemo(() => [...date.legaturi.map((l) => l.utmCampanie ?? ""), ...date.linkuri.map((l) => l.utmCampaign)], [date.legaturi, date.linkuri]);
  const [preset, setPreset] = useState(PRESETURI_SURSA[0]!.cheie);
  const [url, setUrl] = useState("");
  const [campanie, setCampanie] = useState(() => urmatorulCod("cmp", folosite));
  const [continut, setContinut] = useState(() => urmatorulCod("cr", date.linkuri.map((l) => l.utmContent ?? "")));
  const [eticheta, setEticheta] = useState("");
  const [mesaj, setMesaj] = useState<string | null>(null);

  const sursa = PRESETURI_SURSA.find((p) => p.cheie === preset) ?? PRESETURI_SURSA[0]!;
  const rezultat = url.trim() ? construiesteLink({ url, source: sursa.source, medium: sursa.medium, campaign: campanie, content: continut }) : null;

  function salveaza() {
    setMesaj(null);
    start(async () => {
      const r = await salveazaLinkAction(orgSlug, { url, source: sursa.source, medium: sursa.medium, campaign: campanie, content: continut, eticheta });
      if (r.ok) {
        setMesaj("Linkul a fost salvat în istoric.");
        setCampanie(urmatorulCod("cmp", [...folosite, campanie]));
        setContinut(urmatorulCod("cr", [...date.linkuri.map((l) => l.utmContent ?? ""), continut]));
        setEticheta("");
        router.refresh();
      } else setMesaj(r.eroare);
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-[var(--ci-text)]">
            <Link2 className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Generator de linkuri UTM
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            Fiecare reclamă și fiecare distribuire folosește un link cu coduri. Traficul din reclame plătite (paid_social) rămâne separat de social organic, email, WhatsApp, voluntari și presă.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lk-sursa">De unde vine traficul</Label>
            <Select id="lk-sursa" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETURI_SURSA.map((p) => (
                <option key={p.cheie} value={p.cheie}>
                  {p.eticheta}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
              {sursa.indiciu} Parametri: <code>utm_source={sursa.source}</code>, <code>utm_medium={sursa.medium}</code>.
            </p>
          </div>
          <div>
            <Label htmlFor="lk-url">Adresa paginii de donație</Label>
            <Input id="lk-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={`https://alexandrit.ro/strangere-fonduri/${orgSlug}/…`} />
          </div>
          <div>
            <Label htmlFor="lk-camp">Codul campaniei (utm_campaign)</Label>
            <Input id="lk-camp" value={campanie} onChange={(e) => setCampanie(e.target.value)} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Un cod neutru, nu numele cazului. Legătura cu campania umanitară rămâne la tine.</p>
          </div>
          <div>
            <Label htmlFor="lk-cont">Codul materialului (utm_content, opțional)</Label>
            <Input id="lk-cont" value={continut} onChange={(e) => setContinut(e.target.value)} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Un cod pentru fiecare reclamă sau creativ, ex. cr_014.</p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="lk-et">Notă pentru tine (opțional, nu intră în link)</Label>
            <Input id="lk-et" value={eticheta} onChange={(e) => setEticheta(e.target.value)} maxLength={120} placeholder="De exemplu: reclama video, publicul 25–45" />
          </div>
        </div>

        {rezultat && !rezultat.ok && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {rezultat.eroare}
          </p>
        )}
        {rezultat?.ok && (
          <div className="space-y-2">
            <Label htmlFor="lk-rez">Linkul gata de folosit</Label>
            <textarea id="lk-rez" readOnly rows={3} value={rezultat.url} onFocus={(e) => e.currentTarget.select()} className="w-full resize-y rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 font-mono text-[12.5px] text-[var(--ci-text)]" />
            <div className="flex flex-wrap gap-2">
              <ButonCopiere text={rezultat.url} />
              <Button type="button" variant="primary" loading={pending} onClick={salveaza}>
                Salvează în istoric
              </Button>
            </div>
          </div>
        )}
        {mesaj && (
          <p role="status" className="text-[13px] text-[var(--ci-text-muted)]">
            {mesaj}
          </p>
        )}

        {sursa.platit && sursa.source !== "tiktok" && sursa.source !== "linkedin" && (
          <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
            <p className="text-[13px] font-semibold text-[var(--ci-text)]">În Ads Manager (Meta): câmpul „Parametri URL”</p>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              În loc de link întreg, poți lipi doar parametrii în câmpul „URL parameters” al reclamei. Meta completează singur platforma (fb, ig etc.) din {"{{site_source_name}}"}; verifică valoarea după prima reclamă publicată.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--ci-surface-2)] p-2.5 font-mono text-[12px] text-[var(--ci-text)]">{PARAMETRI_META(campanie || "cmp_000", continut || "cr_000")}</pre>
            <div className="mt-2">
              <ButonCopiere text={PARAMETRI_META(campanie || "cmp_000", continut || "cr_000")} eticheta="Copiază parametrii" />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Istoricul linkurilor</h2>
        {date.linkuri.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={Link2} title="Niciun link salvat" description="Linkurile salvate apar aici, ca să le găsești și să le copiezi din nou." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--ci-border)]">
            {date.linkuri.map((l) => (
              <li key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ci-text)]">
                    {l.utmCampaign}
                    {l.utmContent ? ` · ${l.utmContent}` : ""} <span className="font-normal text-[var(--ci-text-muted)]">· {l.utmSource} / {l.utmMedium} · {dataRo(l.creatLa)}</span>
                  </p>
                  {l.eticheta && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{l.eticheta}</p>}
                  <p className="mt-0.5 font-mono text-[11.5px] break-all text-[var(--ci-text-muted)]">{l.url}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ButonCopiere text={l.url} eticheta="Copiază" />
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Șterge linkul ${l.utmCampaign}`}
                    onClick={() => {
                      if (!window.confirm("Ștergi linkul din istoric? Linkul deja distribuit continuă să funcționeze.")) return;
                      start(async () => {
                        await stergeLinkAction(orgSlug, l.id);
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
