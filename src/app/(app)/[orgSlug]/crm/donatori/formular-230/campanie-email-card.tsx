"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { formatDataOra } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";
import { trimiteCampanieEmailF230 } from "./campanie-email-actions";

type UltimaCampanie = { an: number; nrDestinatari: number; createdAt: Date } | null;

export function CampanieEmailCard({
  orgSlug,
  emailConfigurat,
  ultimaCampanie,
}: {
  orgSlug: string;
  emailConfigurat: boolean;
  ultimaCampanie: UltimaCampanie;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].campanieEmail;
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const anCurent = new Date().getFullYear();
  const trimisAnulAcesta = ultimaCampanie?.an === anCurent;

  async function trimite() {
    if (!window.confirm(dict.confirmaTrimitere)) return;
    setSeTrimite(true);
    setEroare(null);
    try {
      const rezultat = await trimiteCampanieEmailF230(orgSlug);
      if (rezultat.error) {
        setEroare(rezultat.error);
        return;
      }
      router.refresh();
    } finally {
      setSeTrimite(false);
    }
  }

  return (
    <Card>
      <CardHeader title={dict.titlu} subtitle={dict.subtitlu} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-[13px] text-[var(--ci-text-muted)]">
          {!emailConfigurat ? (
            <p>{dict.neconfigurat}</p>
          ) : ultimaCampanie ? (
            <p>
              {dict.ultimaCampanie(ultimaCampanie.an, formatDataOra(ultimaCampanie.createdAt.toISOString()))}{" "}
              <span className="ci-tabular font-medium text-[var(--ci-text)]">{ultimaCampanie.nrDestinatari}</span> {dict.donatori}.
              {trimisAnulAcesta && <Badge tone="green" icon={false} className="ml-2">{dict.trimisaPentru(anCurent)}</Badge>}
            </p>
          ) : (
            <p>{dict.niciuna}</p>
          )}
          {eroare && <p className="mt-1 text-[var(--ci-red)]">{eroare}</p>}
        </div>
        <Button variant="primary" onClick={trimite} disabled={!emailConfigurat || seTrimite || trimisAnulAcesta}>
          <Mail className="h-3.5 w-3.5" />
          {trimisAnulAcesta ? dict.trimisaPentru(anCurent) : seTrimite ? dict.seTrimite : dict.trimiteReamintire}
        </Button>
      </div>
    </Card>
  );
}
