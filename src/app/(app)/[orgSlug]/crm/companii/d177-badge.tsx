"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { comutaMarcaj } from "./actions";

// Bifă „bani încasați" lipită de badge-ul D177 — apare verde odată bifată.
// stopPropagation e necesar pentru că badge-ul stă într-un rând care e el
// însuși un <Link> (clic pe bifă nu trebuie să deschidă fișa firmei).
export function D177Badge({ companyId, incasat }: { companyId: string; incasat: boolean }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].d177;
  const [bifat, setBifat] = useState(incasat);
  const [seSalveaza, setSeSalveaza] = useState(false);

  async function comuta(e: React.MouseEvent | React.ChangeEvent) {
    e.stopPropagation();
    e.preventDefault();
    const urmator = !bifat;
    setBifat(urmator);
    setSeSalveaza(true);
    try {
      await comutaMarcaj(orgSlug, companyId, "d177Incasat", urmator);
      router.refresh();
    } finally {
      setSeSalveaza(false);
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1">
      <Badge tone={bifat ? "green" : "neutral"} icon={false}>
        D177
      </Badge>
      <input
        type="checkbox"
        checked={bifat}
        onChange={comuta}
        onClick={(e) => e.stopPropagation()}
        disabled={seSalveaza}
        title={dict.tooltip}
        className="h-3.5 w-3.5 rounded border-[var(--ci-border)] accent-[var(--ci-green)] disabled:opacity-50"
      />
    </span>
  );
}
