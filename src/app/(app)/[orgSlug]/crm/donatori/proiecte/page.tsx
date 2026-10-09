import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { PfNav } from "../pf-nav";
import { getProiectePf } from "../queries-analiza";

import { ProiecteClient } from "./proiecte-client";

export const dynamic = "force-dynamic";

// Raportul pe proiecte: câți donatori, cât s-a donat, câți au revenit, câți a atras fiecare proiect și ce au donat apoi în altele.
export default async function ProiectePfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const randuri = await getProiectePf(orgSlug);
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Proiecte</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Un proiect e o campanie din platformă sau un nume de proiect din importuri. „Atrași” sunt donatorii al căror prim proiect a fost acesta; vezi apoi câți au mai donat și în alte proiecte.
        </p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <ProiecteClient orgSlug={orgSlug} randuri={randuri} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriProiecte");
}
