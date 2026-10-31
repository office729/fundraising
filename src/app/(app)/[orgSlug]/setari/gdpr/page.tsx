import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { SETARI_GDPR_UI_DICT } from "@/lib/i18n/dictionaries/setari-gdpr-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { LocaleProvider } from "../../crm/lib/locale-context";
import { GdprClient } from "./gdpr-client";

export default async function GdprPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const d = SETARI_GDPR_UI_DICT[locale];
  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link prefetch={false} href={`/${orgSlug}/setari`} className="text-sm text-muted hover:text-brand-blue">
        {d.inapoi}
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">{d.titlu}</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">{d.intro}</p>
      <LocaleProvider locale={locale}>
        <GdprClient orgSlug={orgSlug} />
      </LocaleProvider>
    </div>
  );
}

export async function generateMetadata() {
  return { title: SETARI_GDPR_UI_DICT[await getLocale()].metadata };
}
