"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ETICHETE_EVENIMENT, ETICHETE_SCOP, EVENIMENTE_ABONABILE, SCOPURI, type Eveniment, type Scop } from "@/lib/api-publica";

import { Badge } from "../crm/components/ui/badge";
import { Button } from "../crm/components/ui/button";
import { Card } from "../crm/components/ui/card";
import { Input, Label } from "../crm/components/ui/input";

import { adaugaWebhook, creeazaCheieApi, pregatesteTestWebhook, proceseazaLivrariAcum, retrimiteLivrare, revocaCheieApi, seteazaActivWebhook, stergeWebhook, type StareApi } from "./api-actions";

const dataOra = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "niciodată");
const TON_STARE: Record<string, "green" | "amber" | "red"> = { trimis: "green", in_asteptare: "amber", esuat: "red" };
const ETICHETA_STARE: Record<string, string> = { trimis: "Trimis", in_asteptare: "În așteptare", esuat: "Eșuat" };

// Secret arătat o singură dată (cheie API sau secret webhook), cu copiere.
function SecretUnic({ eticheta, valoare, laInchis }: { eticheta: string; valoare: string; laInchis: () => void }) {
  const [copiat, setCopiat] = useState(false);
  return (
    <div role="alert" className="rounded-lg border border-[var(--ci-amber)] bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[#7a3e00]">
      <p className="font-semibold">{eticheta}</p>
      <p className="mt-1">Copiaz-o acum și păstreaz-o într-un loc sigur. Nu o mai poți vedea după ce închizi acest mesaj.</p>
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
          {copiat ? "Copiat" : "Copiază"}
        </Button>
        <Button variant="primary" className="min-h-11" onClick={laInchis}>
          Am salvat-o
        </Button>
      </div>
    </div>
  );
}

// Setări → API și webhook-uri: chei pentru integrări (Make, Zapier, propriul site) și adrese care primesc evenimente (donație reușită, donator dezabonat).
export function ApiSection({ stare, baza }: { stare: StareApi; baza: string }) {
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
        setEroare(r.mesaj ?? "Nu am putut salva.");
        return;
      }
      laGata?.();
      router.refresh();
    });

  const chei = stare.chei;
  return (
    <Card>
      <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">API și webhook-uri</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
        Conectează Alexandrit la alte instrumente (Make, Zapier, site-ul tău): le dai o cheie ca să citească donatorii și donațiile, sau o adresă la care îți trimitem un mesaj de fiecare dată când o donație reușește ori un donator se dezabonează.
      </p>

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

      <h3 className="mt-5 text-[13px] font-semibold text-[var(--ci-text)]">Chei API</h3>
      {chei.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">Nicio cheie încă.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {chei.map((c) => (
            <li key={c.id} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">
                    {c.nume}{" "}
                    <Badge tone={c.revocata ? "neutral" : "green"} icon={false}>
                      {c.revocata ? "Revocată" : "Activă"}
                    </Badge>
                  </p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">
                    <code>{c.prefix}</code> · {c.scopuri.map((s) => ETICHETE_SCOP[s]).join("; ")} · creată {dataOra(c.creataLa)} · folosită {dataOra(c.ultimaFolosireLa)}
                  </p>
                </div>
                {!c.revocata &&
                  (confirma === c.id ? (
                    <div className="flex gap-2">
                      <Button variant="danger" className="min-h-10" loading={pending} onClick={() => ruleaza(() => revocaCheieApi(orgSlug, c.id), () => setConfirma(null))}>
                        Revocă acum
                      </Button>
                      <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(null)}>
                        Renunță
                      </Button>
                    </div>
                  ) : (
                    <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(c.id)}>
                      Revocă
                    </Button>
                  ))}
              </div>
              {confirma === c.id && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">Cheia încetează imediat să funcționeze, iar integrările care o folosesc vor primi eroare. Nu se poate anula.</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-dashed border-[var(--ci-border)] p-3">
        <p className="text-[12.5px] font-semibold text-[var(--ci-text)]">Creează o cheie</p>
        <div className="mt-2">
          <Label htmlFor="cheie-nume">Nume (pentru ce o folosești)</Label>
          <Input id="cheie-nume" value={numeCheie} maxLength={60} placeholder="ex. Integrarea cu Make" onChange={(e) => setNumeCheie(e.target.value)} />
        </div>
        <fieldset className="mt-2">
          <legend className="text-[13px] font-medium text-[var(--ci-text)]">Ce are voie să facă</legend>
          {SCOPURI.map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" className="size-5" checked={scopuri.includes(s)} onChange={() => comuta(scopuri, s, setScopuri)} />
              {ETICHETE_SCOP[s]}
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
              setSecret({ eticheta: "Cheia API nouă", valoare: r.cheie });
              setNumeCheie("");
              router.refresh();
            })
          }
        >
          Creează cheia
        </Button>
      </div>

      <h3 className="mt-6 text-[13px] font-semibold text-[var(--ci-text)]">Adrese pentru evenimente (webhook-uri)</h3>
      {stare.webhookuri.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">Nicio adresă încă.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {stare.webhookuri.map((w) => (
            <li key={w.id} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
              <p className="text-[13.5px] font-semibold break-all text-[var(--ci-text)]">
                {w.url}{" "}
                <Badge tone={w.activ ? "green" : "amber"} icon={false}>
                  {w.activ ? "Activă" : "Oprită"}
                </Badge>
              </p>
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                {w.evenimente.map((e) => ETICHETE_EVENIMENT[e]).join("; ")}
                {w.esecuriConsecutive > 0 ? ` · ${w.esecuriConsecutive} eșecuri la rând` : ""}
                {w.dezactivatMotiv ? ` · ${w.dezactivatMotiv}` : ""}
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
                      else setMesaj(t.trimise > 0 ? "Testul a ajuns la adresă." : "Testul nu a ajuns. Vezi motivul în lista de livrări de mai jos.");
                      router.refresh();
                    })
                  }
                >
                  Trimite un test
                </Button>
                <Button className="min-h-10" disabled={pending} onClick={() => ruleaza(() => seteazaActivWebhook(orgSlug, w.id, !w.activ))}>
                  {w.activ ? "Oprește" : "Pornește"}
                </Button>
                {confirma === w.id ? (
                  <>
                    <Button variant="danger" className="min-h-10" loading={pending} onClick={() => ruleaza(() => stergeWebhook(orgSlug, w.id), () => setConfirma(null))}>
                      Șterge definitiv
                    </Button>
                    <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(null)}>
                      Renunță
                    </Button>
                  </>
                ) : (
                  <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(w.id)}>
                    Șterge
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-dashed border-[var(--ci-border)] p-3">
        <p className="text-[12.5px] font-semibold text-[var(--ci-text)]">Adaugă o adresă</p>
        {!stare.criptareActiva && <p className="mt-1 text-[12.5px] text-[#7a3e00]">Păstrarea secretelor nu e configurată pe platformă, deci nu poți adăuga adrese încă.</p>}
        <div className="mt-2">
          <Label htmlFor="webhook-url">Adresa (https)</Label>
          <Input id="webhook-url" value={url} maxLength={300} placeholder="https://exemplu.ro/webhook-alexandrit" onChange={(e) => setUrl(e.target.value)} />
        </div>
        <fieldset className="mt-2">
          <legend className="text-[13px] font-medium text-[var(--ci-text)]">Ce evenimente primește</legend>
          {EVENIMENTE_ABONABILE.map((e) => (
            <label key={e} className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" className="size-5" checked={evenimente.includes(e)} onChange={() => comuta(evenimente, e, setEvenimente)} />
              {ETICHETE_EVENIMENT[e]}
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
              setSecret({ eticheta: "Secretul de semnare al adresei", valoare: r.secret });
              setUrl("");
              router.refresh();
            })
          }
        >
          Adaugă adresa
        </Button>
      </div>

      <h3 className="mt-6 text-[13px] font-semibold text-[var(--ci-text)]">Ultimele livrări</h3>
      {stare.livrari.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">Nimic trimis încă.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--ci-border)] text-left text-[var(--ci-text-muted)]">
                <th className="py-1.5 pr-3 font-semibold">Când</th>
                <th className="py-1.5 pr-3 font-semibold">Eveniment</th>
                <th className="py-1.5 pr-3 font-semibold">Stare</th>
                <th className="py-1.5 pr-3 font-semibold">Încercări</th>
                <th className="py-1.5 pr-3 font-semibold">Răspuns</th>
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
                      {ETICHETA_STARE[l.stare] ?? l.stare}
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
                        Retrimite
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">O livrare nereușită se reia după 1, 6, 24 și 72 de ore (cel mult 5 încercări); o adresă care eșuează 20 de ori la rând se oprește singură.</p>

      <details className="mt-5 text-[12.5px] text-[var(--ci-text-muted)]">
        <summary className="min-h-9 cursor-pointer font-semibold text-[var(--ci-text)]">Cum se folosește (pentru cine face integrarea)</summary>
        <div className="mt-2 space-y-3">
          <p>Fiecare cerere poartă cheia în antet: <code>Authorization: Bearer &lt;cheia&gt;</code>. Răspunsurile sunt JSON. Limită: 1.000 de cereri pe oră pe cheie.</p>
          <pre className="overflow-x-auto rounded bg-[var(--ci-surface-2)] p-2 text-[12px] text-[var(--ci-text)]">{`# donatorii (paginat: ?limit=100&dupa=<id>; filtru ?email=)
curl -H "Authorization: Bearer <cheia>" "${baza}/api/v1/donatori?limit=100"

# un donator, cu câmpurile personalizate
curl -H "Authorization: Bearer <cheia>" ${baza}/api/v1/donatori/<id>

# completează câmpuri personalizate (valoare goală = șterge)
curl -X PATCH -H "Authorization: Bearer <cheia>" -H "Content-Type: application/json" \\
  -d '{"campuri":{"cum_ne_a_gasit":"Eveniment"}}' ${baza}/api/v1/donatori/<id>

# donațiile reușite (?de_la=2026-01-01)
curl -H "Authorization: Bearer <cheia>" "${baza}/api/v1/donatii?de_la=2026-01-01"

# marchează o adresă respinsă sau reclamată
curl -X POST -H "Authorization: Bearer <cheia>" -H "Content-Type: application/json" \\
  -d '{"email":"nume@exemplu.ro","tip":"respins"}' ${baza}/api/v1/email-evenimente`}</pre>
          <p>
            Webhook-urile sunt cereri POST cu corpul JSON <code>{`{ id, tip, creat_la, date }`}</code>. Antetul <code>X-Alexandrit-Semnatura</code> are forma <code>t=&lt;secunde&gt;,v1=&lt;semnătură&gt;</code>, unde semnătura e HMAC-SHA256, în hexazecimal, al textului <code>t + &quot;.&quot; + corpul</code>, cu secretul adresei. Verifică semnătura și refuză cererile cu <code>t</code> mai vechi de 5 minute. Răspunde cu orice cod 2xx ca să confirmi primirea; 410 înseamnă „nu mai trimite”.
          </p>
        </div>
      </details>
    </Card>
  );
}
