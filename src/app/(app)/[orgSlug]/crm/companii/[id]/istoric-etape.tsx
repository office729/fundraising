import { ArrowRight } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import { etichetaEtapa } from "@/lib/etape-companie";

import { Card } from "../../components/ui/card";

export type IntrareJurnal = {
  id: string;
  fromStage: string | null;
  toStage: string;
  fromStatus: string | null;
  toStatus: string;
  createdAt: Date;
  autor: string | null;
};

// „Istoric etape”: cine a mutat firma dintr-o etapă în alta și când (cele mai noi primele).
export function IstoricEtape({ intrari, locale }: { intrari: IntrareJurnal[]; locale: Locale }) {
  const ro = locale === "ro";
  return (
    <Card>
      <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{ro ? "Istoric etape" : "Stage history"}</h2>
      {intrari.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">
          {ro ? "Nicio mutare înregistrată încă — apare aici de fiecare dată când schimbi etapa." : "No moves recorded yet — it shows here each time you change the stage."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--ci-border)]">
          {intrari.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
              <span className="flex items-center gap-1.5 text-[var(--ci-text)]">
                <span className="text-[var(--ci-text-muted)]">{i.fromStage || i.fromStatus ? etichetaEtapa(i.fromStage, i.fromStatus, locale) : ro ? "început" : "start"}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--ci-text-faint)]" />
                <strong>{etichetaEtapa(i.toStage, i.toStatus, locale)}</strong>
              </span>
              <span className="ml-auto text-[12px] text-[var(--ci-text-muted)]">
                {i.autor ?? (ro ? "necunoscut" : "unknown")} · {new Date(i.createdAt).toLocaleString(ro ? "ro-RO" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
