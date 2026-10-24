import { PfNav } from "../pf-nav";

import { citesteParcursuri } from "./actions";
import { ParcursuriClient } from "./parcursuri-client";

export const dynamic = "force-dynamic";

export default async function ParcursuriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const date = await citesteParcursuri(orgSlug);
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Parcursuri pentru donatori</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Serii de e-mailuri trimise singure donatorilor: mulțumire după prima donație, un gând după a doua, o încercare când o donație lunară se oprește, o propunere pentru cei fideli și o reconectare cu cei care au tăcut. Pentru fiecare vezi cine a donat după e-mailuri.
        </p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <ParcursuriClient orgSlug={orgSlug} date={date} />
    </div>
  );
}
