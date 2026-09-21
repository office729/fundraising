"use client";

import { Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Card } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { seteazaEtapa } from "../actions";

const ETAPE = [
  { k: "nou", ro: "Nou", en: "New" },
  { k: "pe_viitor", ro: "Pe viitor", en: "Later" },
  { k: "email", ro: "Email trimis", en: "Email sent" },
  { k: "mesaj", ro: "Mesaj trimis", en: "Message sent" },
  { k: "onepager", ro: "One pager trimis", en: "One-pager sent" },
  { k: "telefon", ro: "Discuție telefonică", en: "Phone call" },
  { k: "online", ro: "Întâlnire online", en: "Online meeting" },
  { k: "contract_trimis", ro: "Contract trimis", en: "Contract sent" },
  { k: "contract_semnat", ro: "Contract semnat", en: "Contract signed" },
  { k: "contract_asteptare", ro: "În așteptare", en: "On hold" },
  { k: "sponsorizat", ro: "Sponsorizat", en: "Sponsored" },
] as const;

// Etapa în pipeline: etapele până la cea curentă apar bifate, cea curentă e evidențiată,
// „Respins” marchează firma ca pierdută. Se salvează la click.
export function PipelineCard({ companyId, stage, status }: { companyId: string; stage: string; status: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [eroare, setEroare] = useState("");
  const respins = status === "lost";
  const idxCurent = ETAPE.findIndex((e) => e.k === stage);

  function alege(k: string) {
    setEroare("");
    startTransition(async () => {
      const r = await seteazaEtapa(orgSlug, companyId, k);
      if (r.error) setEroare(r.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{locale === "ro" ? "Etapă în pipeline" : "Pipeline stage"}</h2>
      <div className={`mt-3 flex flex-wrap gap-2 ${pending ? "opacity-70" : ""}`}>
        {ETAPE.map((e, i) => {
          const curent = !respins && i === idxCurent;
          const bifat = !respins && i < idxCurent;
          return (
            <button
              key={e.k}
              type="button"
              disabled={pending}
              onClick={() => alege(e.k)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                curent
                  ? "bg-[var(--ci-text)] text-white"
                  : bifat
                    ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)] hover:brightness-95"
                    : "border border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-border-strong)]"
              }`}
            >
              {(bifat || curent) && <Check className="h-3.5 w-3.5" />}
              {locale === "ro" ? e.ro : e.en}
            </button>
          );
        })}
        <button
          type="button"
          disabled={pending}
          onClick={() => alege("respins")}
          className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
            respins ? "bg-[var(--ci-red)] text-white" : "border border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-border-strong)]"
          }`}
        >
          {locale === "ro" ? "Respins" : "Rejected"}
        </button>
      </div>
      {eroare && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
    </Card>
  );
}
