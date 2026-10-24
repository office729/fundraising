"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

import { imbinaDonatoriAction, type DateDubluri, type GrupDublu } from "./actions";

const nr = (n: number) => n.toLocaleString("ro-RO");
const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });
const NUME_MOTIV: Record<string, string> = { email: "e-mail echivalent", telefon: "același telefon", "nume+localitate": "același nume și aceeași localitate" };

function Grup({ g, orgSlug, poateImbina, laGata }: { g: GrupDublu; orgSlug: string; poateImbina: boolean; laGata: (m: string) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pastrat, setPastrat] = useState(g.sugerat);
  const [bifati, setBifati] = useState<Set<string>>(new Set(g.membri.filter((m) => m.id !== g.sugerat).map((m) => m.id)));
  const [confirma, setConfirma] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const secundari = g.membri.filter((m) => m.id !== pastrat && bifati.has(m.id));
  const principal = g.membri.find((m) => m.id === pastrat);
  const blocati = secundari.filter((m) => m.abonamentActiv);

  const imbina = () =>
    startTransition(async () => {
      setEroare(null);
      const r = await imbinaDonatoriAction(orgSlug, pastrat, secundari.map((m) => m.id));
      if (!r.ok) {
        setEroare(r.eroare);
        return;
      }
      laGata(`${r.imbinati === 1 ? "Un donator a fost îmbinat" : `${r.imbinati} donatori au fost îmbinați`}: ${nr(r.donatiiMutate + r.importuriMutate)} donații și ${nr(r.notiteMutate)} notițe au trecut la ${principal?.nume ?? "donatorul păstrat"}.`);
      router.refresh();
    });

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={g.incredere === "mare" ? "amber" : "neutral"} icon={false}>
          {g.incredere === "mare" ? "Probabil aceeași persoană" : "Posibil aceeași persoană"}
        </Badge>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">după {g.motive.map((m) => NUME_MOTIV[m] ?? m).join(", ")}</span>
      </div>
      <ul className="space-y-2">
        {g.membri.map((m) => {
          const esteDePastrat = m.id === pastrat;
          return (
            <li key={m.id} className={`rounded-[var(--ci-radius-btn)] border p-3 ${esteDePastrat ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)]" : "border-[var(--ci-border)] bg-[var(--ci-surface)]"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--ci-text)]">{m.nume}</p>
                  <p className="break-all text-[12.5px] text-[var(--ci-text-muted)]">
                    {m.email}
                    {m.telefon ? ` · ${m.telefon}` : ""}
                    {m.localitate ? ` · ${m.localitate}` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--ci-text-muted)]">
                    {nr(m.numarDonatii)} {m.numarDonatii === 1 ? "donație" : "donații"} · {nr(m.totalDonat)} lei · ultima {dataRo(m.ultimaDonatieLa)}
                    {m.dezabonat && (
                      <Badge tone="amber" icon={false}>
                        dezabonat de la e-mailuri
                      </Badge>
                    )}
                    {m.abonamentActiv && (
                      <Badge tone="blue" icon={false}>
                        donație recurentă activă
                      </Badge>
                    )}
                  </p>
                </div>
                {poateImbina && (
                  <div className="flex flex-col items-end gap-1.5 text-[12.5px]">
                    <label className="flex min-h-9 cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name={`pastrat-${g.membri[0].id}`}
                        className="size-4"
                        checked={esteDePastrat}
                        onChange={() => {
                          setPastrat(m.id);
                          setBifati(new Set(g.membri.filter((x) => x.id !== m.id).map((x) => x.id)));
                          setConfirma(false);
                        }}
                      />
                      Păstrează acest donator
                    </label>
                    {!esteDePastrat && (
                      <label className="flex min-h-9 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={bifati.has(m.id)}
                          onChange={(e) => {
                            setBifati((s) => {
                              const n = new Set(s);
                              if (e.target.checked) n.add(m.id);
                              else n.delete(m.id);
                              return n;
                            });
                            setConfirma(false);
                          }}
                        />
                        Îmbină în cel păstrat
                      </label>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {poateImbina ? (
        <div className="mt-3">
          {eroare && (
            <p role="alert" className="mb-2 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
              {eroare}
            </p>
          )}
          {!confirma ? (
            <Button variant="primary" className="min-h-10" disabled={secundari.length === 0 || pending} onClick={() => setConfirma(true)}>
              Îmbină {secundari.length > 0 ? `(${secundari.length})` : ""}
            </Button>
          ) : (
            <div role="alertdialog" aria-label="Confirmă îmbinarea" className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
              <p className="font-semibold">Confirmă îmbinarea</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
                <li>
                  Rămâne: <strong>{principal?.nume}</strong> ({principal?.email}).
                </li>
                <li>
                  Se îmbină și dispar din listă: {secundari.map((m) => `${m.nume} (${m.email})`).join("; ")}.
                </li>
                <li>Donațiile, importurile și notițele lor trec la donatorul păstrat; telefonul, localitatea și județul lipsă se completează.</li>
                <li>Dacă oricare a refuzat e-mailurile sau s-a dezabonat, refuzul rămâne valabil.</li>
                <li>Adresele vechi nu se mai păstrează ca donatori. O donație nouă făcută cu o adresă veche ar crea din nou un donator separat.</li>
                <li>Acțiunea se înregistrează în jurnal, dar nu se poate anula cu un clic.</li>
              </ul>
              {blocati.length > 0 && (
                <p role="alert" className="mt-2 flex items-start gap-2 rounded-md bg-[var(--ci-amber-soft)] px-2.5 py-2 text-[12.5px] text-[#7a3e00]">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {blocati.map((m) => m.email).join(", ")} {blocati.length === 1 ? "are" : "au"} o donație recurentă activă. Îmbinarea nu va merge până se oprește abonamentul.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="danger" className="min-h-10" loading={pending} disabled={blocati.length > 0} onClick={imbina}>
                  Confirmă îmbinarea
                </Button>
                <Button className="min-h-10" disabled={pending} onClick={() => setConfirma(false)}>
                  Renunță
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">Doar un administrator poate îmbina donatori.</p>
      )}
    </Card>
  );
}

export function DubluriClient({ orgSlug, date }: { orgSlug: string; date: DateDubluri }) {
  const [mesaj, setMesaj] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {mesaj && (
        <p role="status" className="rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[#17602f]">
          {mesaj}
        </p>
      )}
      {date.grupuri.length === 0 ? (
        <Card>
          <p className="text-center text-[13px] text-[var(--ci-text-muted)]">Nu am găsit donatori care să pară aceeași persoană. Verificarea se face după e-mail echivalent, telefon și nume cu localitate.</p>
        </Card>
      ) : (
        <>
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            {nr(date.total)} {date.total === 1 ? "grup" : "grupuri"} de verificat{date.total > date.grupuri.length ? ` (se arată primele ${nr(date.grupuri.length)}, cele mai sigure întâi)` : ""}.
          </p>
          {date.grupuri.map((g) => (
            <Grup key={g.membri.map((m) => m.id).join("-")} g={g} orgSlug={orgSlug} poateImbina={date.poateImbina} laGata={setMesaj} />
          ))}
        </>
      )}
    </div>
  );
}
