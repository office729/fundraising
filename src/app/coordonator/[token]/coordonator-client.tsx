"use client";

import { Check, QrCode, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { InscrisCoordonator, TuraCoordonator } from "@/lib/voluntari-coordonator";

import { adaugaLaFataLoculuiAction, marcheazaCoordAction, qrCurentAction } from "./actions";

const FUS = "Europe/Bucharest";
const ora = (iso: string) => new Date(iso).toLocaleTimeString("ro-RO", { timeZone: FUS, hour: "2-digit", minute: "2-digit" });

const buton = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[14px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none disabled:opacity-50";
const camp = "w-full rounded-xl border border-[var(--vp-line)] bg-white px-3.5 py-2.5 text-[15px] focus:border-[var(--vp-brand)] focus:outline-none";

export function CoordonatorClient({ token, ture, qrDisponibil, anulata }: { token: string; ture: TuraCoordonator[]; qrDisponibil: boolean; anulata: boolean }) {
  const toti = ture.flatMap((t) => t.inscrisi);
  const prezenti = toti.filter((i) => i.status === "prezent").length;
  const asteptati = toti.filter((i) => ["confirmata", "prezent", "absent"].includes(i.status)).length;

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-[var(--vp-line)] bg-white px-4 py-3 text-[14px]" role="status">
        <b className="text-[18px] tabular-nums">{prezenti}</b> prezenți din <b className="tabular-nums">{asteptati}</b> confirmați
        {anulata && <span className="ml-2 font-semibold text-[#9b2c20]">Activitatea a fost anulată.</span>}
      </p>
      {ture.length === 0 && <p className="text-[14px] text-[var(--vp-muted)]">Această activitate nu are ture.</p>}
      {ture.map((t) => (
        <Tura key={t.id} token={token} t={t} qrDisponibil={qrDisponibil} />
      ))}
      <p className="text-[12.5px] text-[var(--vp-muted)]">Doar marchezi cine a venit. Orele se confirmă apoi de către organizație, ca să intre în adeverințe.</p>
    </div>
  );
}

function Tura({ token, t, qrDisponibil }: { token: string; t: TuraCoordonator; qrDisponibil: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [qrEroare, setQrEroare] = useState("");
  const [qrDeschis, setQrDeschis] = useState(false);
  const [nou, setNou] = useState("");

  function marcheaza(i: InscrisCoordonator, status: "prezent" | "absent" | "confirmata") {
    setEroare("");
    start(async () => {
      const r = await marcheazaCoordAction(token, i.id, status);
      if (!r.ok) setEroare(r.eroare);
      else router.refresh();
    });
  }

  // Codul QR se reîncarcă la fiecare 2 minute cât timp e deschis (codul valabil se schimbă la 5 minute).
  useEffect(() => {
    if (!qrDeschis) return;
    let activ = true;
    const incarca = async () => {
      const r = await qrCurentAction(token, t.id);
      if (!activ) return;
      if (r.ok) {
        setQr(r.svg);
        setQrEroare("");
      } else setQrEroare(r.eroare);
    };
    void incarca();
    const id = setInterval(incarca, 120_000);
    return () => {
      activ = false;
      clearInterval(id);
    };
  }, [qrDeschis, token, t.id]);

  return (
    <section aria-label={t.nume} className="rounded-2xl border border-[var(--vp-line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vp-line)] px-4 py-3">
        <div>
          <h2 className="text-[16px] font-bold">{t.nume}</h2>
          <p className="text-[12.5px] text-[var(--vp-muted)]">
            {ora(t.inceputLa)} – {ora(t.seTerminaLa)} · {t.inscrisi.length} / {t.locuri} locuri
          </p>
        </div>
        {qrDisponibil && (
          <button type="button" className={`${buton} border-[var(--vp-line)] bg-white`} aria-expanded={qrDeschis} onClick={() => setQrDeschis((x) => !x)}>
            <QrCode className="size-4" aria-hidden /> {qrDeschis ? "Ascunde codul" : "Cod QR de prezență"}
          </button>
        )}
      </div>

      {qrDeschis && (
        <div className="border-b border-[var(--vp-line)] px-4 py-4 text-center">
          {qr ? (
            <div className="mx-auto w-full max-w-[260px]" dangerouslySetInnerHTML={{ __html: qr }} />
          ) : qrEroare ? (
            <p role="alert" className="text-[13.5px] text-[#9b2c20]">
              {qrEroare}
            </p>
          ) : (
            <p className="text-[13.5px] text-[var(--vp-muted)]">Se pregătește codul…</p>
          )}
          <p className="mt-2 text-[12.5px] text-[var(--vp-muted)]">Voluntarii îl scanează cu camera telefonului. Codul se schimbă la câteva minute, deci o poză nu ajută.</p>
        </div>
      )}

      {t.inscrisi.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-[var(--vp-muted)]">Nimeni înscris la această tură.</p>
      ) : (
        <ul className="divide-y divide-[var(--vp-line)]">
          {t.inscrisi.map((i) => {
            const marcabil = ["confirmata", "prezent", "absent"].includes(i.status);
            return (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">
                    {i.prenume}
                    {i.laFataLocului && <span className="ml-2 text-[12px] font-normal text-[var(--vp-muted)]">la fața locului</span>}
                  </p>
                  <p className="text-[12.5px] text-[var(--vp-muted)]">
                    {[i.telefon ? `tel. …${i.telefon.slice(-4)}` : "", i.status === "in_asteptare" ? "așteaptă aprobarea organizației" : i.status === "rezerva" ? "listă de rezervă" : i.checkinLa ? `a sosit la ${ora(i.checkinLa)}` : ""].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {marcabil && (
                  <div className="flex gap-2">
                    <button type="button" className={`${buton} ${i.status === "prezent" ? "border-[var(--vp-green)] bg-[var(--vp-green)] text-white" : "border-[var(--vp-line)] bg-white"}`} aria-pressed={i.status === "prezent"} disabled={pending} onClick={() => marcheaza(i, i.status === "prezent" ? "confirmata" : "prezent")}>
                      <Check className="size-4" aria-hidden /> Prezent
                    </button>
                    <button type="button" className={`${buton} ${i.status === "absent" ? "border-[#9b2c20] bg-[#9b2c20] text-white" : "border-[var(--vp-line)] bg-white"}`} aria-pressed={i.status === "absent"} disabled={pending} onClick={() => marcheaza(i, i.status === "absent" ? "confirmata" : "absent")}>
                      <X className="size-4" aria-hidden /> Absent
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex gap-2 border-t border-[var(--vp-line)] px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          setEroare("");
          start(async () => {
            const r = await adaugaLaFataLoculuiAction(token, t.id, nou);
            if (!r.ok) setEroare(r.eroare);
            else {
              setNou("");
              router.refresh();
            }
          });
        }}
      >
        <label htmlFor={`nou-${t.id}`} className="sr-only">
          Prenumele unui voluntar venit fără înscriere
        </label>
        <input id={`nou-${t.id}`} className={camp} value={nou} maxLength={40} onChange={(e) => setNou(e.target.value)} placeholder="A venit cineva neînscris? Prenume" />
        <button type="submit" className={`${buton} shrink-0 border-[var(--vp-line)] bg-white`} disabled={pending || nou.trim().length < 2}>
          <UserPlus className="size-4" aria-hidden /> Adaugă
        </button>
      </form>
      {eroare && (
        <p role="alert" className="mx-4 mb-3 rounded-lg bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#9b2c20]">
          {eroare}
        </p>
      )}
    </section>
  );
}
