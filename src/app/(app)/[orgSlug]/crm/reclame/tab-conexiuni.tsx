"use client";

import { Plug, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { Rich } from "./rich";
import { formatariReclame } from "./format";

import { conecteazaMetaAction, deconecteazaMetaAction, sincronizeazaMetaAction, type ConexiuneMeta, type DateReclame } from "./actions";

const TON_STARE: Record<string, "green" | "amber" | "red"> = { activ: "green", "necesita-reconectare": "red", eroare: "amber" };

// Conexiunea cu Meta Ads: doar citire (permisiunea ads_read). Aduce costurile pe zi, reclamă și plasament (Facebook / Instagram). Nu modifică nimic în cont.
function CopiazaPasii() {
  const dict = RECLAME_UI_DICT[useLocale()].conexiuni;
  const [stare, setStare] = useState<"nu" | "da" | "eroare">("nu");
  return (
    <Button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(dict.textPasi);
          setStare("da");
        } catch {
          setStare("eroare");
        }
        setTimeout(() => setStare("nu"), 2500);
      }}
    >
      {stare === "da" ? dict.pasiCopiati : stare === "eroare" ? dict.copiereEsuata : dict.copiazaPasii}
    </Button>
  );
}

export function TabConexiuni({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
  const locale = useLocale();
  const dict = RECLAME_UI_DICT[locale].conexiuni;
  const f = formatariReclame(locale);
  const { numar: formatNumar, zi, dataOra } = f;
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
  const st = conexiune ? { text: dict.stare[conexiune.stare] ?? conexiune.stare, ton: TON_STARE[conexiune.stare] ?? ("amber" as const) } : null;

  function sincronizeaza(nrZile: number, eticheta: string) {
    setMesaj(null);
    setLucreaza(eticheta);
    start(async () => {
      try {
        const r = await sincronizeazaMetaAction(orgSlug, nrZile);
        if (r.ok) setMesaj({ ok: true, text: dict.sincronizatOk(formatNumar(r.randuri), zi(r.de), zi(r.pana), r.moneda !== "RON" ? dict.conversie(r.moneda, r.cursRon.toLocaleString(f.loc)) : "", r.ignorate ? dict.ignorate(r.ignorate) : "") });
        else setMesaj({ ok: false, text: r.eroare });
      } catch {
        setMesaj({ ok: false, text: dict.sincronizareEsuata });
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
        setMesaj({ ok: true, text: dict.conectat(r.nume ?? contId, r.moneda) });
        const s = await sincronizeazaMetaAction(orgSlug, 90);
        setMesaj(s.ok ? { ok: true, text: dict.conectatSincOk(formatNumar(s.randuri), zi(s.de), zi(s.pana)) } : { ok: false, text: dict.conectatSincEsuata(s.eroare) });
      } catch {
        setMesaj({ ok: false, text: dict.conectareEsuata });
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
            <Plug className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> {dict.titlu}
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {dict.descriere}
          </p>
        </div>

        {conexiune && st && (
          <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ci-text)]">
                  {conexiune.contNume ?? dict.contImplicit(conexiune.contId)}{" "}
                  <Badge tone={st.ton} icon={false}>
                    {st.text}
                  </Badge>
                </p>
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                  act_{conexiune.contId} · {conexiune.moneda ?? "—"}
                  {conexiune.fusOrar ? dict.fusOrar(conexiune.fusOrar) : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" loading={pending && lucreaza === "7"} disabled={pending || conexiune.stare === "necesita-reconectare"} onClick={() => sincronizeaza(7, "7")}>
                  <RefreshCw className="h-3.5 w-3.5" /> {dict.sincronizeazaAcum}
                </Button>
                <Button type="button" disabled={pending} onClick={() => setReconectare((v) => !v)}>
                  {reconectare ? dict.renunt : dict.reconecteaza}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(dict.confirmaDeconectare)) return;
                    start(async () => {
                      await deconecteazaMetaAction(orgSlug);
                      setMesaj({ ok: true, text: dict.deconectat });
                      router.refresh();
                    });
                  }}
                >
                  <Unplug className="h-3.5 w-3.5" /> {dict.deconecteaza}
                </Button>
              </div>
            </div>
            <dl className="mt-3 grid gap-2 text-[12.5px] sm:grid-cols-3">
              <div>
                <dt className="text-[var(--ci-text-muted)]">{dict.ultimaSincronizare}</dt>
                <dd className="font-semibold text-[var(--ci-text)]">{conexiune.ultimaReusita ? dataOra(conexiune.ultimaReusita) : dict.incaNiciuna}</dd>
              </div>
              <div>
                <dt className="text-[var(--ci-text-muted)]">{dict.perioadaCitita}</dt>
                <dd className="font-semibold text-[var(--ci-text)]">{conexiune.deLa && conexiune.panaLa ? `${zi(conexiune.deLa)} – ${zi(conexiune.panaLa)}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--ci-text-muted)]">{dict.randuriUltima}</dt>
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
                <Label htmlFor="mx-zile">{dict.reincarcaPerioada}</Label>
                <Select id="mx-zile" value={zile} onChange={(e) => setZile(e.target.value)}>
                  <option value="28">{dict.ultimele28}</option>
                  <option value="90">{dict.ultimele90}</option>
                </Select>
              </div>
              <Button type="button" disabled={pending || conexiune.stare === "necesita-reconectare"} loading={pending && lucreaza === "reincarca"} onClick={() => sincronizeaza(Number(zile), "reincarca")}>
                {dict.reincarca}
              </Button>
              <p className="max-w-md text-[12px] text-[var(--ci-text-muted)]">{dict.actualizareAuto}</p>
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
                {dict.indisponibila}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mx-cont">{dict.idCont}</Label>
                <Input id="mx-cont" value={contId} onChange={(e) => setContId(e.target.value)} placeholder={dict.idContPlaceholder} inputMode="numeric" autoComplete="off" />
                <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.idContHint}</p>
              </div>
              <div>
                <Label htmlFor="mx-token">{dict.token}</Label>
                <Input id="mx-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB…" autoComplete="new-password" spellCheck={false} />
                <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.tokenHint}</p>
              </div>
              <div>
                <Label htmlFor="mx-curs">{dict.curs}</Label>
                <Input id="mx-curs" value={curs} onChange={(e) => setCurs(e.target.value)} inputMode="decimal" placeholder={dict.cursPlaceholder} />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[12.5px] text-[var(--ci-text-muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden />
              <p>
                {dict.notaSincronizare}
              </p>
            </div>
            <Button type="submit" variant="primary" size="lg" loading={pending && lucreaza === "conectare"} disabled={pending || !date.conectareDisponibila || !contId.trim() || !token.trim()}>
              {dict.butonConecteaza(!!conexiune)}
            </Button>
          </form>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.cumObtii}</h2>
        <p className="text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          <Rich text={dict.cumObtiiIntro} />
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          <li><Rich text={dict.pas1} /></li>
          <li><Rich text={dict.pas2} /></li>
          <li><Rich text={dict.pas3} /></li>
          <li><Rich text={dict.pas4} /></li>
        </ol>
        <p className="text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
          {dict.cumObtiiFinal}
        </p>
        <CopiazaPasii />
      </Card>
    </div>
  );
}
