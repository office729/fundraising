import { Breadcrumb } from "../components/ui/breadcrumb";
import { listLocalGroups, listMediaContacts } from "./actions";
import { LocalGroupsCard } from "./local-groups-card";
import { MediaContactsCard } from "./media-contacts-card";

export default async function PresaGrupuriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const [contacte, grupuri] = await Promise.all([listMediaContacts(orgSlug), listLocalGroups(orgSlug)]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Presă & grupuri locale" }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Presă & grupuri locale</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          Bază de organizație, reutilizată de toate campaniile — fiecare campanie vede automat doar contactele și grupurile din județul ei.
        </p>
      </div>

      <MediaContactsCard orgSlug={orgSlug} contacte={contacte} />
      <LocalGroupsCard orgSlug={orgSlug} grupuri={grupuri} />
    </div>
  );
}
