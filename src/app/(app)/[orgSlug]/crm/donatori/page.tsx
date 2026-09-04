import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { withOrgSession } from "@/lib/auth/guard";
import { donatoriReali } from "@/lib/db/schema";
import { getLocale } from "@/lib/i18n/get-locale";
import { DONATORI_DICT } from "@/lib/i18n/dictionaries/donatori";

import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { formatDataRelativa } from "../lib/format";
import { DonatoriListClient } from "./donor-list-client";

const getDonatoriReali = withOrgSession(async (ctx) => {
  return ctx.db.select().from(donatoriReali).where(eq(donatoriReali.orgId, ctx.orgId)).orderBy(desc(donatoriReali.ultimaDonatieLa)).limit(100);
});

export default async function DonatoriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const reali = await getDonatoriReali(orgSlug);
  const locale = await getLocale();
  const dict = DONATORI_DICT[locale];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {reali.length > 0 && (
        <Card>
          <CardHeader title={dict.real.title} subtitle={dict.real.subtitle(reali.length)} />
          <div className="space-y-2">
            {reali.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {d.email} · {d.telefon || dict.real.faraTelefon} · {d.sursa} · {d.metodaPlata}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="blue" icon={false}>
                    {d.numarDonatii} {d.numarDonatii === 1 ? dict.real.donatie : dict.real.donatii}
                  </Badge>
                  <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{d.totalDonat.toLocaleString("ro-RO")} lei</span>
                  <span className="text-[12px] text-[var(--ci-text-faint)]">{formatDataRelativa(d.ultimaDonatieLa.toISOString())}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[var(--ci-text-faint)]">
            {dict.real.seeDetails}{" "}
            <Link href={`/${orgSlug}/crm/strangere-fonduri`} className="font-medium text-[var(--ci-primary)]">
              {dict.real.strangereFonduri}
            </Link>
            .
          </p>
        </Card>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3.5 py-2">
        <Badge tone="purple" icon={false}>
          {dict.demo.badge}
        </Badge>
        <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.demo.note}</p>
      </div>

      <DonatoriListClient />
    </div>
  );
}
