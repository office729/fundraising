"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { DONATORI_UI2_DICT } from "@/lib/i18n/dictionaries/donatori-ui-2";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useLocale } from "../../../lib/locale-context";
import { exportaDateDonator, stergeDateDonator } from "../gdpr-actions";

// Drepturile GDPR ale donatorului (acces/portabilitate și ștergere) — vizibil
// doar pentru owner/admin (vezi poateAdministra în getDonatorRealDetaliu).
export function GdprPanelDonator({ donatorId, nume }: { donatorId: string; nume: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const t = DONATORI_UI2_DICT[useLocale()].gdpr;
  const [inclusiv230, setInclusiv230] = useState(false);
  const [lucreaza, setLucreaza] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function exporta() {
    setLucreaza(true);
    setMesaj(null);
    try {
      const date = await exportaDateDonator(orgSlug, donatorId);
      if (!date) {
        setMesaj(t.negasit);
        return;
      }
      const blob = new Blob([JSON.stringify(date, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `date-donator-${donatorId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMesaj(t.exportEsuat);
    } finally {
      setLucreaza(false);
    }
  }

  async function sterge() {
    const conf = window.confirm(t.confirma(nume, inclusiv230));
    if (!conf) return;
    setLucreaza(true);
    setMesaj(null);
    try {
      const r = await stergeDateDonator(orgSlug, donatorId, inclusiv230);
      if (!r.ok) {
        setMesaj(r.error ?? t.stergereEsuata);
        return;
      }
      router.push(`/${orgSlug}/crm/donatori`);
      router.refresh();
    } catch {
      setMesaj(t.stergereEsuataRetry);
    } finally {
      setLucreaza(false);
    }
  }

  return (
    <Card>
      <p className="text-[13px] font-semibold text-[var(--ci-text)]">{t.titlu}</p>
      <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
        {t.descriere}
      </p>
      <label className="mt-3 flex items-center gap-2 text-[12px] text-[var(--ci-text-muted)]">
        <input type="checkbox" checked={inclusiv230} onChange={(e) => setInclusiv230(e.target.checked)} />
        {t.inclusiv230}
      </label>
      {mesaj && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--ci-red)]">
          {mesaj}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={exporta} disabled={lucreaza}>
          {t.exporta}
        </Button>
        <Button variant="secondary" size="sm" onClick={sterge} disabled={lucreaza}>
          {t.sterge}
        </Button>
      </div>
    </Card>
  );
}
