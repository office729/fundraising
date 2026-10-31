"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EVENIMENTE_ABONABILE, SCOPURI, type Eveniment, type Scop } from "@/lib/api-publica";
import { SETARI_API_UI_DICT } from "@/lib/i18n/dictionaries/setari-api-ui";

import { Badge } from "../crm/components/ui/badge";
import { Button } from "../crm/components/ui/button";
import { Card } from "../crm/components/ui/card";
import { Input, Label } from "../crm/components/ui/input";
import { useLocale } from "../crm/lib/locale-context";

import { adaugaWebhook, creeazaCheieApi, pregatesteTestWebhook, proceseazaLivrariAcum, retrimiteLivrare, revocaCheieApi, seteazaActivWebhook, stergeWebhook, type StareApi } from "./api-actions";

const TON_STARE: Record<string, "green" | "amber" | "red"> = { trimis: "green", in_asteptare: "amber", esuat: "red" };

// Secret arătat o singură dată (cheie API sau secret webhook), cu copiere.
function SecretUnic({ eticheta, valoare, laInchis }: { eticheta: string; valoare: string; laInchis: () => void }) {
  const d = SETARI_API_UI_DICT[useLocale()].api;
  const [copiat, setCopiat] = useState(false);
  return (
    <div role="alert" className="rounded-lg border border-[var(--ci-amber)] bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[#7a3e00]">
      <p className="font-semibold">{eticheta}</p>
      <p className="mt-1">{d.secret.copiaza}</p>
      <code className="mt-2 block rounded bg-white/70 px-2 py-2 text-[12.5px] break-all text-[#14213d]">{valoare}</code>
      <div className="mt-2 flex gap-2">
        <Button
          className="min-h-11"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(valoare);
              setCopiat(true);
            } catch {
              setCopiat(false);
            }
          }}
        >
          {copiat ? d.secret.copiat : d.secret.copiazaBtn}
        </Button>
        <Button variant="primary" className="min-h-11" onClick={laInchis}>
          {d.secret.amSalvat}
        </Button>
      </div>
    </div>
  );
}

// Setări → API și webhook-uri: chei pentru integrări (Make, Zapier, propriul site) și adrese care primesc evenimente (donație reușită, donator dezabonat).
export function ApiSection({ stare, baza }: { stare: StareApi; baza: string }) {
  const locale = useLocale();
  const d = SETARI_API_UI_DICT[locale].api;
  const dataOra = (iso: string | null) => (iso ? new Date(iso).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : d.niciodata);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ eticheta: string; valoare: string } | null>(null);
  const [numeCheie, setNumeCheie] = useState("");
  const [scopuri, setScopuri] = useState<Scop[]>(["donatori:citire"]);
  const [url, setUrl] = useState("");
  const [evenimente, setEvenimente] = useState<Eveniment[]>(["donatie.reusita"]);
  const [confirma, setConfirma] = useState<string | null>(null);

  const comuta = <T,>(lista: T[], x: T, set: (v: T[]) => void) => set(lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x]);
  const ruleaza = (f: () => Promise<{ ok: boolean; mesaj?: string }>, laGata?: () => void) =>
    startTransition(async () => {
      setEroare(null);
      setMesaj(null);
      const r = await f();
      if (!r.ok) {
        setEroare(r.mesaj ?? d.nuAmSalvat);
        return;
      }
      laGata?.();
      router.refresh();
    });

  const chei = stare.chei;
  return (
    <Card>
      <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{d.titlu}</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">{d.intro}</p>

      {secret && <div className="mt-3"><SecretUnic eticheta={secret.eticheta} valoare={secret.valoare} laInchis={() => setSecret(null)} /></div>}
      {eroare && (
        <p role="alert" className="mt-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
          {eroare}
        </p>
      )}
      {mesaj && (
        <p role="status" className="mt-3 rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[#17602f]">
          {mesaj}
        </p>
      )}

      <h3 className="mt-5 text-[13px] font-semibold text-[var(--ci-text)]">{d.chei.titlu}</h3>
      {chei.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{d.chei.nicio}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {chei.map((c) => (
            <li key={c.id} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">
                    {c.nume}{" "}
                    <Badge tone={c.revocata ? "neutral" : "green"} icon={false}>
                      {c.revocata ? d.chei.revocata : d.chei.activa}
                    </Badge>
                  </p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">
                    <code>{c.prefix}</code> · {c.scopuri.map((s) => d.scopuri[s]).join("; ")} · {d.chei.creata} {dataOra(c.creataLa)} · {d.chei.folosita} {dataOra(c.ultimaFolosireLa)}
                  </p>
                </div>
                {!c.revocata &&
                  (confirma === c.id ? (
                    <div className="flex gap-2">
                      <Button variant="danger" className="min-h-10" loading={pending} onClick={() => ruleaza(() => revocaCheieApi(orgSlug, c.id), () => setConfirma(null))}>
                        {d.chei.revocaAcum}
                      </Button>
                      <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(null)}>
                        {d.chei.renunta}
                      </Button>
                    </div>
                  ) : (
                    <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(c.id)}>
                      {d.chei.revoca}
                    </Button>
                  ))}
              </div>
              {confirma === c.id && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{d.chei.avertisment}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-dashed border-[var(--ci-border)] p-3">
        <p className="text-[12.5px] font-semibold text-[var(--ci-text)]">{d.chei.creeazaTitlu}</p>
        <div className="mt-2">
          <Label htmlFor="cheie-nume">{d.chei.numeEticheta}</Label>
          <Input id="cheie-nume" value={numeCheie} maxLength={60} placeholder={d.chei.numePh} onChange={(e) => setNumeCheie(e.target.value)} />
        </div>
        <fieldset className="mt-2">
          <legend className="text-[13px] font-medium text-[var(--ci-text)]">{d.chei.permisiuni}</legend>
          {SCOPURI.map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" className="size-5" checked={scopuri.includes(s)} onChange={() => comuta(scopuri, s, setScopuri)} />
              {d.scopuri[s]}
            </label>
          ))}
        </fieldset>
        <Button
          variant="primary"
          className="mt-2 min-h-11"
          loading={pending}
          disabled={!numeCheie.trim() || scopuri.length === 0}
          onClick={() =>
            startTransition(async () => {
              setEroare(null);
              const r = await creeazaCheieApi(orgSlug, numeCheie, scopuri);
              if (!r.ok) {
                setEroare(r.mesaj);
                return;
              }
              setSecret({ eticheta: d.chei.cheieNoua, valoare: r.cheie });
              setNumeCheie("");
              router.refresh();
            })
          }
        >
          {d.chei.creeazaBtn}
        </Button>
      </div>

      <h3 className="mt-6 text-[13px] font-semibold text-[var(--ci-text)]">{d.hooks.titlu}</h3>
      {stare.webhookuri.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{d.hooks.nicio}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {stare.webhookuri.map((w) => (
            <li key={w.id} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
              <p className="text-[13.5px] font-semibold break-all text-[var(--ci-text)]">
                {w.url}{" "}
                <Badge tone={w.activ ? "green" : "amber"} icon={false}>
                  {w.activ ? d.hooks.activa : d.hooks.oprita}
                </Badge>
              </p>
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                {w.evenimente.map((e) => d.evenimente[e]).join("; ")}
                {w.esecuriConsecutive > 0 ? d.hooks.esecuri(w.esecuriConsecutive) : ""}
                {w.dezactivatMotiv ? ` · ${d.hooks.motive[w.dezactivatMotiv] ?? w.dezactivatMotiv}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  className="min-h-10"
                  disabled={pending || !w.activ}
                  onClick={() =>
                    startTransition(async () => {
                      setEroare(null);
                      setMesaj(null);
                      const p = await pregatesteTestWebhook(orgSlug, w.id);
                      if (!p.ok) return setEroare(p.mesaj);
                      const t = await proceseazaLivrariAcum(orgSlug);
                      if (!t.ok) setEroare(t.mesaj);
                      else setMesaj(t.trimise > 0 ? d.hooks.testAjuns : d.hooks.testEsuat);
                      router.refresh();
                    })
                  }
                >
                  {d.hooks.trimiteTest}
                </Button>
                <Button className="min-h-10" disabled={pending} onClick={() => ruleaza(() => seteazaActivWebhook(orgSlug, w.id, !w.activ))}>
                  {w.activ ? d.hooks.opreste : d.hooks.porneste}
                </Button>
                {confirma === w.id ? (
                  <>
                    <Button variant="danger" className="min-h-10" loading={pending} onClick={() => ruleaza(() => stergeWebhook(orgSlug, w.id), () => setConfirma(null))}>
                      {d.hooks.stergeDef}
                    </Button>
                    <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(null)}>
                      {d.hooks.renunta}
                    </Button>
                  </>
                ) : (
                  <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(w.id)}>
                    {d.hooks.sterge}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-dashed border-[var(--ci-border)] p-3">
        <p className="text-[12.5px] font-semibold text-[var(--ci-text)]">{d.hooks.adaugaTitlu}</p>
        {!stare.criptareActiva && <p className="mt-1 text-[12.5px] text-[#7a3e00]">{d.hooks.faraCriptare}</p>}
        <div className="mt-2">
          <Label htmlFor="webhook-url">{d.hooks.adresa}</Label>
          <Input id="webhook-url" value={url} maxLength={300} placeholder={locale === "ro" ? "https://exemplu.ro/webhook-alexandrit" : "https://example.org/alexandrit-webhook"} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <fieldset className="mt-2">
          <legend className="text-[13px] font-medium text-[var(--ci-text)]">{d.hooks.evenimente}</legend>
          {EVENIMENTE_ABONABILE.map((e) => (
            <label key={e} className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" className="size-5" checked={evenimente.includes(e)} onChange={() => comuta(evenimente, e, setEvenimente)} />
              {d.evenimente[e]}
            </label>
          ))}
        </fieldset>
        <Button
          variant="primary"
          className="mt-2 min-h-11"
          loading={pending}
          disabled={!url.trim() || evenimente.length === 0 || !stare.criptareActiva}
          onClick={() =>
            startTransition(async () => {
              setEroare(null);
              const r = await adaugaWebhook(orgSlug, url, evenimente);
              if (!r.ok) {
                setEroare(r.mesaj);
                return;
              }
              setSecret({ eticheta: d.hooks.secretNou, valoare: r.secret });
              setUrl("");
              router.refresh();
            })
          }
        >
          {d.hooks.adaugaBtn}
        </Button>
      </div>

      <h3 className="mt-6 text-[13px] font-semibold text-[var(--ci-text)]">{d.livrari.titlu}</h3>
      {stare.livrari.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{d.livrari.nimic}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--ci-border)] text-left text-[var(--ci-text-muted)]">
                <th className="py-1.5 pr-3 font-semibold">{d.livrari.cand}</th>
                <th className="py-1.5 pr-3 font-semibold">{d.livrari.eveniment}</th>
                <th className="py-1.5 pr-3 font-semibold">{d.livrari.stare}</th>
                <th className="py-1.5 pr-3 font-semibold">{d.livrari.incercari}</th>
                <th className="py-1.5 pr-3 font-semibold">{d.livrari.raspuns}</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {stare.livrari.map((l) => (
                <tr key={l.id} className="border-b border-[var(--ci-border)] last:border-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-[var(--ci-text-muted)]">{dataOra(l.creatLa)}</td>
                  <td className="py-1.5 pr-3 text-[var(--ci-text)]">{l.eveniment}</td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={TON_STARE[l.stare] ?? "neutral"} icon={false}>
                      {d.stari[l.stare] ?? l.stare}
                    </Badge>
                  </td>
                  <td className="ci-tabular py-1.5 pr-3 text-[var(--ci-text)]">{l.incercari}</td>
                  <td className="py-1.5 pr-3 text-[var(--ci-text-muted)]">{l.ultimulCod ? `HTTP ${l.ultimulCod}` : l.ultimaEroare ?? "—"}</td>
                  <td className="py-1.5 text-right">
                    {l.stare === "esuat" && (
                      <Button
                        className="min-h-9"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await retrimiteLivrare(orgSlug, l.id);
                            if (!r.ok) return setEroare(r.mesaj);
                            await proceseazaLivrariAcum(orgSlug);
                            router.refresh();
                          })
                        }
                      >
                        {d.livrari.retrimite}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{d.livrari.notaRetry}</p>

      <details className="mt-5 text-[12.5px] text-[var(--ci-text-muted)]">
        <summary className="min-h-9 cursor-pointer font-semibold text-[var(--ci-text)]">{d.docs.sumar}</summary>
        <div className="mt-2 space-y-3">
          <p>{d.docs.antet} <code>Authorization: Bearer &lt;{d.docs.cheiePh}&gt;</code>. {d.docs.antet2}</p>
          <pre className="overflow-x-auto rounded bg-[var(--ci-surface-2)] p-2 text-[12px] text-[var(--ci-text)]">{d.docs.curl(baza)}</pre>
          <p>
            {d.docs.hooks1} <code>{`{ id, tip, creat_la, date }`}</code>. {d.docs.hooks2} <code>X-Alexandrit-Semnatura</code> {d.docs.hooks3} <code>{d.docs.sigForma}</code>, {d.docs.hooks4} <code>{d.docs.sigText}</code>, {d.docs.hooks5} <code>t</code> {d.docs.hooks6}
          </p>
        </div>
      </details>
    </Card>
  );
}
