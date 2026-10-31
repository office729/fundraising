import { requireOrgAccess } from "@/lib/auth/guard";
import { boldsignConfigurat } from "@/lib/boldsign";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { SemnaturaForm } from "./semnatura-form";

export default async function SemnaturaDigitalaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const t = INSTRUMENTE_UI_DICT[await getLocale()].semnatura;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
      </div>
      <SemnaturaForm orgSlug={orgSlug} configurat={boldsignConfigurat()} poateTrimite={access.role === "owner" || access.role === "admin"} />
    </div>
  );
}
