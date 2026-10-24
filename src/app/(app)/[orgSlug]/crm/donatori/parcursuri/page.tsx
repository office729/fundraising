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
          Patru serii de e-mailuri trimise singure, o dată pe zi între 9:00 și 19:00 (ora României): mulțumire după prima donație, o încercare prietenoasă când o donație lunară se oprește, o propunere pentru donatorii fideli și o reconectare cu cei care au tăcut. Pentru fiecare vezi cine a donat după e-mailuri. Primesc doar donatorii care au acceptat e-mailurile și nu s-au dezabonat; seria se oprește când donatorul donează din nou sau răspunde.
        </p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <ParcursuriClient orgSlug={orgSlug} date={date} />
    </div>
  );
}
