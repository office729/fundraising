"use client";

import { Plug, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatNumar } from "@/lib/reclame/calcule";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";

import { conecteazaMetaAction, deconecteazaMetaAction, sincronizeazaMetaAction, type ConexiuneMeta, type DateReclame } from "./actions";

const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const zi = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("ro-RO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

const STARE: Record<string, { text: string; ton: "green" | "amber" | "red" }> = {
  activ: { text: "Conectat", ton: "green" },
  "necesita-reconectare": { text: "Necesită reconectare", ton: "red" },
  eroare: { text: "Eroare", ton: "amber" },
};

// Conexiunea cu Meta Ads: doar citire (permisiunea ads_read). Aduce costurile pe zi, reclamă și plasament (Facebook / Instagram). Nu modifică nimic în cont.
const TEXT_PASI = [
  "Cum obții cheia de acces Meta pentru Alexandrit (doar citire, ~10 minute):",
  "1. business.facebook.com → Setări business → Utilizatori → Utilizatori de sistem → adaugă unul nou (de exemplu „Alexandrit citire”).",
  "2. „Adaugă active” → Conturi publicitare → bifează contul de reclame → drept doar de vizualizare a performanței.",
  "3. „Generează token” → alege aplicația organizației → bifează numai ads_read → alege „fără expirare”, dacă se oferă.",
  "4. Copiază cheia și trimite-o, împreună cu numărul contului de reclame (din Ads Manager), persoanei care o lipește în Alexandrit → Performanța reclamelor → Conexiuni.",
  "Cheia e ca o parolă: trimite-o pe un canal privat, nu pe e-mail către mulți destinatari.",
].join("\n");

function CopiazaPasii() {
  const [stare, setStare] = useState<"nu" | "da" | "eroare">("nu");
  return (
    <Button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(TEXT_PASI);
          setStare("da");
        } catch {
          setStare("eroare");
        }
        setTimeout(() => setStare("nu"), 2500);
      }}
    >
      {stare === "da" ? "Pașii au fost copiați" : stare === "eroare" ? "Nu am putut copia; selectează textul manual" : "Copiază pașii, ca să-i trimiți unui coleg"}
    </Button>
  );
}

export function TabConexiuni({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const conexiune: ConexiuneMeta | undefined = date.conexiuni.find((c) => c.platforma === "meta");
  const [reconectare, setReconectare] = useState(false);
  const [contId, setContId] = useState("");
  const [token, setToken] = useState("");
  const [curs, setCurs] = useState("");
  const [zile, setZile] = useState("28");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [lucreaza, setLucreaza] = useState<string | null>(null);

  const arataFormular = !conexiune || reconectare;
  const st = conexiune ? (STARE[conexiune.stare] ?? { text: conexiune.stare, ton: "amber" as const }) : null;

  function sincronizeaza(nrZile: number, eticheta: string) {
    setMesaj(null);
    setLucreaza(eticheta);
    start(async () => {
      try {
        const r = await sincronizeazaMetaAction(orgSlug, nrZile);
        if (r.ok) setMesaj({ ok: true, text: `Am adus ${formatNumar(r.randuri)} rânduri de cost, între ${zi(r.de)} și ${zi(r.pana)}${r.moneda !== "RON" ? ` (convertite din ${r.moneda} la ${r.cursRon.toLocaleString("ro-RO")} lei)` : ""}.${r.ignorate ? ` ${r.ignorate} rânduri fără sumă sau dată au fost ignorate.` : ""}` });
        else setMesaj({ ok: false, text: r.eroare });
      } catch {
        setMesaj({ ok: false, text: "Sincronizarea nu a reușit. Încearcă din nou peste puțin timp." });
      }
      setLucreaza(null);
      router.refresh();
    });
  }

  function conecteaza() {
    setMesaj(null);
    setLucreaza("conectare");
    start(async () => {
      try {
        const cursNumar = curs.trim() ? Number(curs.replace(",", ".")) : null;
        const r = await conecteazaMetaAction(orgSlug, { contId, token, cursManual: cursNumar });
        if (!r.ok) {
          setMesaj({ ok: false, text: r.eroare });
          setLucreaza(null);
          return;
        }
        setToken("");
        setReconectare(false);
        setMesaj({ ok: true, text: `Contul „${r.nume ?? contId}” (${r.moneda}) e conectat. Aduc costurile din ultimele 90 de zile…` });
        const s = await sincronizeazaMetaAction(orgSlug, 90);
        setMesaj(s.ok ? { ok: true, text: `Contul e conectat. Am adus ${formatNumar(s.randuri)} rânduri de cost, între ${zi(s.de)} și ${zi(s.pana)}.` } : { ok: false, text: `Contul e conectat, dar prima sincronizare nu a reușit: ${s.eroare}` });
      } catch {
        setMesaj({ ok: false, text: "Nu am putut conecta contul acum. Încearcă din nou peste puțin timp." });
      }
      setLucreaza(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-[var(--ci-text)]">
            <Plug className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Meta Ads (Facebook și Instagram)
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            Aduce automat cheltuielile din contul tău publicitar, pe zi, campanie, reclamă și plasament. Conexiunea e doar pentru citire: Alexandrit nu modifică bugete și nu pornește sau oprește reclame.
          </p>
        </div>

        {conexiune && st && (
          <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ci-text)]">
                  {conexiune.contNume ?? `Cont act_${conexiune.contId}`}{" "}
                  <Badge tone={st.ton} icon={false}>
                    {st.text}
                  </Badge>
                </p>
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                  act_{conexiune.contId} · {conexiune.moneda ?? "—"}
                  {conexiune.fusOrar ? ` · fus orar ${conexiune.fusOrar}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" loading={pending && lucreaza === "7"} disabled={pending || conexiune.stare === "necesita-reconectare"} onClick={() => sincronizeaza(7, "7")}>
                  <RefreshCw className="h-3.5 w-3.5" /> Sincronizează acum
                </Button>
                <Button type="button" disabled={pending} onClick={() => setReconectare((v) => !v)}>
                  {reconectare ? "Renunț" : "Reconectează"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm("Deconectezi Meta? Tokenul se șterge din Alexandrit. Costurile deja aduse rămân; le poți șterge din „Import costuri”.")) return;
                    start(async () => {
                      await deconecteazaMetaAction(orgSlug);
                      setMesaj({ ok: true, text: "Meta a fost deconectat și tokenul a fost șters." });
                      router.refresh();
                    });
                  }}
                >
                  <Unplug className="h-3.5 w-3.5" /> Deconectează
                </Button>
              </div>
            </div>
            <dl className="mt-3 grid gap-2 text-[12.5px] sm:grid-cols-3">
              <div>
                <dt className="text-[var(--ci-text-muted)]">Ultima sincronizare reușită</dt>
                <dd className="font-semibold text-[var(--ci-text)]">{conexiune.ultimaReusita ? dataOra(conexiune.ultimaReusita) : "încă niciuna"}</dd>
              </div>
              <div>
                <dt className="text-[var(--ci-text-muted)]">Perioada citită</dt>
                <dd className="font-semibold text-[var(--ci-text)]">{conexiune.deLa && conexiune.panaLa ? `${zi(conexiune.deLa)} – ${zi(conexiune.panaLa)}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--ci-text-muted)]">Rânduri la ultima rulare</dt>
                <dd className="font-semibold text-[var(--ci-text)]">{formatNumar(conexiune.randuriUltima)}</dd>
              </div>
            </dl>
            {conexiune.ultimaEroare && (
              <p role="alert" className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
                {conexiune.ultimaEroare}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2.5 border-t border-[var(--ci-border)] pt-3">
              <div>
                <Label htmlFor="mx-zile">Reîncarcă perioada</Label>
                <Select id="mx-zile" value={zile} onChange={(e) => setZile(e.target.value)}>
                  <option value="28">ultimele 28 de zile</option>
                  <option value="90">ultimele 90 de zile</option>
                </Select>
              </div>
              <Button type="button" disabled={pending || conexiune.stare === "necesita-reconectare"} loading={pending && lucreaza === "reincarca"} onClick={() => sincronizeaza(Number(zile), "reincarca")}>
                Reîncarcă
              </Button>
              <p className="max-w-md text-[12px] text-[var(--ci-text-muted)]">Datele se actualizează singure: la deschiderea paginii, dacă sunt mai vechi de o oră, și zilnic. Meta le mai corectează câteva zile; de aceea se recitesc ultimele 7 zile.</p>
            </div>
          </div>
        )}

        {mesaj && (
          <p role={mesaj.ok ? "status" : "alert"} className={`rounded-[var(--ci-radius-btn)] px-3 py-2 text-[13px] ${mesaj.ok ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-red-soft)] text-[var(--ci-red)]"}`}>
            {mesaj.text}
          </p>
        )}

        {arataFormular && (
          <form
            className="space-y-4 border-t border-[var(--ci-border)] pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              conecteaza();
            }}
            autoComplete="off"
          >
            {!date.conectareDisponibila && (
              <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
                Conectarea automată nu e disponibilă momentan. Scrie echipei Alexandrit; între timp poți folosi „Import costuri”, care nu cere nicio cheie.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mx-cont">ID-ul contului publicitar</Label>
                <Input id="mx-cont" value={contId} onChange={(e) => setContId(e.target.value)} placeholder="act_1234567890 sau doar cifrele" inputMode="numeric" autoComplete="off" />
                <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Îl găsești în Ads Manager, în meniul contului.</p>
              </div>
              <div>
                <Label htmlFor="mx-token">Token de acces (ads_read)</Label>
                <Input id="mx-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB…" autoComplete="new-password" spellCheck={false} />
                <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Se păstrează criptat pe server și nu mai apare niciodată în pagină.</p>
              </div>
              <div>
                <Label htmlFor="mx-curs">Curs în lei (opțional)</Label>
                <Input id="mx-curs" value={curs} onChange={(e) => setCurs(e.target.value)} inputMode="decimal" placeholder="doar dacă contul nu e în RON sau EUR" />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[12.5px] text-[var(--ci-text-muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden />
              <p>
                Sincronizarea înlocuiește costurile Meta din zilele citite, inclusiv pe cele importate manual din CSV pentru aceleași zile; cele din afara perioadei rămân. Pentru conturile în EUR se folosește cursul zilei sincronizării, nu cel istoric al fiecărei zile.
              </p>
            </div>
            <Button type="submit" variant="primary" size="lg" loading={pending && lucreaza === "conectare"} disabled={pending || !date.conectareDisponibila || !contId.trim() || !token.trim()}>
              {conexiune ? "Reconectează" : "Conectează"} și adu ultimele 90 de zile
            </Button>
          </form>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Cum obții cheia de acces (o singură dată, cam 10 minute)</h2>
        <p className="text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          Cheia de acces e o parolă separată, doar pentru citire: prin ea Alexandrit vede cât ai cheltuit, fără să-ți știe parola de Facebook și fără să poată schimba ceva în reclame. O creezi tu, în Meta Business, ca <strong className="text-[var(--ci-text)]">utilizator de sistem</strong>. Dacă contul de reclame îl administrează altcineva, trimite-i pașii de mai jos.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          <li>Intră în <strong className="text-[var(--ci-text)]">business.facebook.com</strong> → Setări business → Utilizatori → <strong className="text-[var(--ci-text)]">Utilizatori de sistem</strong> și adaugă unul nou (numele poate fi „Alexandrit citire”).</li>
          <li>Apasă „Adaugă active”, alege <strong className="text-[var(--ci-text)]">Conturi publicitare</strong>, bifează contul tău și dă-i doar dreptul de <strong className="text-[var(--ci-text)]">vizualizare a performanței</strong>.</li>
          <li>Apasă „Generează token”, alege aplicația organizației (dacă nu ai una, Meta te lasă să creezi una gratuit la developers.facebook.com) și bifează <strong className="text-[var(--ci-text)]">numai ads_read</strong>. Dacă ți se oferă „fără expirare”, alege-o.</li>
          <li>Copiază cheia lungă care apare și lipește-o mai sus, împreună cu numărul contului de reclame. După conectare, pagina arată numele contului: dacă e al tău, e corect.</li>
        </ol>
        <p className="text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
          Ecranele Meta se mai schimbă, deci numele butoanelor pot diferi puțin. Dacă te blochezi, folosește „Import costuri”: nu cere nicio cheie. Dacă cheia expiră, aici apare „Necesită reconectare”; generezi alta și o lipești; ce ai adus până atunci rămâne.
        </p>
        <CopiazaPasii />
      </Card>
    </div>
  );
}
