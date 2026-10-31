"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { DONATORI_UI2_DICT } from "@/lib/i18n/dictionaries/donatori-ui-2";
import { type StareAdresa } from "@/lib/igiena-email";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useLocale } from "../../../lib/locale-context";
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
  const t = DONATORI_UI2_DICT[useLocale()].adresa;
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
        <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{t.titlu}</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={problema ? "amber" : "green"} icon={false}>
            {t.stare[stare]}
          </Badge>
          <Badge tone={dezabonat ? "amber" : acord === true ? "green" : "neutral"} icon={false}>
            {dezabonat ? t.dezabonat : acord === true ? (acordSursa === "declarat_echipa" ? t.acordEchipa : t.acceptat) : acord === false ? t.refuzat : t.neintrebat}
          </Badge>
          {frecventa === "rara" && (
            <Badge tone="blue" icon={false}>
              {t.maiRar}
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">
        {t.adresa} <span className="break-all">{email}</span>
      </p>
      {stare === "respins" && (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-[#7a3e00]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {motiv ?? t.respinsaMotivImplicit}{t.respinsaNota}
        </p>
      )}
      {stare === "reclamat" && (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-[#7a3e00]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {t.reclamatNota}
        </p>
      )}
      {stare === "ok" && !dezabonat && acord === true && acordSursa !== "declarat_echipa" && (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-[var(--ci-text-muted)]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#17602f]" aria-hidden /> {t.poatePrimi}
        </p>
      )}
      {poateAdministra && stare !== "reclamat" && (
        <div className="mt-3">
          {stare === "respins" ? (
            <Button className="min-h-11" disabled={pending} onClick={() => schimba("ok")}>
              {t.repar}
            </Button>
          ) : !confirma ? (
            <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(true)}>
              {t.marcheaza}
            </Button>
          ) : (
            <div role="group" aria-label={t.confirmaAria} className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[12.5px]">
              <p className="font-semibold">{t.confirmaTitlu}</p>
              <p className="mt-1">{t.confirmaText}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" className="min-h-11" loading={pending} onClick={() => schimba("respins")}>
                  {t.marcheazaBtn}
                </Button>
                <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(false)}>
                  {t.renunta}
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
