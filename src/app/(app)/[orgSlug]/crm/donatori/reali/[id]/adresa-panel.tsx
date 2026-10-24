"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ETICHETE_STARE_ADRESA, type StareAdresa } from "@/lib/igiena-email";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { seteazaStareAdresaDonator } from "../actions";

// Starea mesajelor către acest donator: acord, dezabonare, cât de des vrea mesaje, adresa (în regulă, respinsă sau reclamată). Administratorul poate marca o adresă respinsă sau o poate repara.
export function AdresaEmailPanel({
  donatorId,
  email,
  stare,
  motiv,
  acord,
  acordSursa,
  dezabonat,
  frecventa,
  poateAdministra,
}: {
  donatorId: string;
  email: string;
  stare: StareAdresa;
  motiv: string | null;
  acord: boolean | null;
  acordSursa: string | null;
  dezabonat: boolean;
  frecventa: "normala" | "rara";
  poateAdministra: boolean;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);

  async function schimba(urm: "ok" | "respins") {
    setPending(true);
    setEroare(null);
    const r = await seteazaStareAdresaDonator(orgSlug, donatorId, urm);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setConfirma(false);
    router.refresh();
  }

  const problema = stare !== "ok";
  return (
    <Card className={problema ? "border-[var(--ci-amber-soft)] bg-[var(--ci-amber-soft)]" : ""}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">E-mailuri către acest donator</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={problema ? "amber" : "green"} icon={false}>
            {ETICHETE_STARE_ADRESA[stare]}
          </Badge>
          <Badge tone={dezabonat ? "amber" : acord === true ? "green" : "neutral"} icon={false}>
            {dezabonat ? "Dezabonat" : acord === true ? (acordSursa === "declarat_echipa" ? "Acord declarat de echipă" : "A acceptat e-mailurile") : acord === false ? "A refuzat e-mailurile" : "Nu a fost întrebat"}
          </Badge>
          {frecventa === "rara" && (
            <Badge tone="blue" icon={false}>
              Vrea mesaje mai rar
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">
        Adresa: <span className="break-all">{email}</span>
      </p>
      {stare === "respins" && (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-[#7a3e00]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {motiv ?? "Adresa a fost respinsă."} Nu mai primește mesaje automate până nu e reparată (de exemplu corectată la o donație nouă).
        </p>
      )}
      {stare === "reclamat" && (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-[#7a3e00]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Persoana a marcat un mesaj ca spam. Nu mai primește nimic și starea nu se poate schimba.
        </p>
      )}
      {stare === "ok" && !dezabonat && acord === true && acordSursa !== "declarat_echipa" && (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-[var(--ci-text-muted)]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#17602f]" aria-hidden /> Poate primi parcursurile automate.
        </p>
      )}
      {poateAdministra && stare !== "reclamat" && (
        <div className="mt-3">
          {stare === "respins" ? (
            <Button className="min-h-11" disabled={pending} onClick={() => schimba("ok")}>
              Adresa e corectă: o repar
            </Button>
          ) : !confirma ? (
            <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(true)}>
              Marchează adresa ca inexistentă
            </Button>
          ) : (
            <div role="group" aria-label="Confirmă marcarea adresei" className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[12.5px]">
              <p className="font-semibold">Marchezi adresa ca inexistentă?</p>
              <p className="mt-1">Donatorul rămâne în listă, dar nu mai primește mesaje automate pe această adresă. Poți repara oricând.</p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" className="min-h-11" loading={pending} onClick={() => schimba("respins")}>
                  Marchează
                </Button>
                <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(false)}>
                  Renunță
                </Button>
              </div>
            </div>
          )}
          {eroare && (
            <p role="alert" className="mt-2 text-[12.5px] text-[#9b1c1c]">
              {eroare}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
