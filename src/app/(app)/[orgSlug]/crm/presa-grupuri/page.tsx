import { Breadcrumb } from "../components/ui/breadcrumb";
import { listLocalGroups, listMediaContacts } from "./actions";
import { LocalGroupsCard } from "./local-groups-card";
import { MediaContactsCard } from "./media-contacts-card";
import { getLocale } from "@/lib/i18n/get-locale";
import { PRESA_GRUPURI_UI_DICT } from "@/lib/i18n/dictionaries/presa-grupuri-ui";
import { titluAbsolut } from "@/lib/page-titles";

export default async function PresaGrupuriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const [contacte, grupuri] = await Promise.all([listMediaContacts(orgSlug), listLocalGroups(orgSlug)]);
  const dict = PRESA_GRUPURI_UI_DICT[await getLocale()].page;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dict.title }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <MediaContactsCard orgSlug={orgSlug} contacte={contacte} />
      <LocalGroupsCard orgSlug={orgSlug} grupuri={grupuri} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPresaGrupuri");
}
