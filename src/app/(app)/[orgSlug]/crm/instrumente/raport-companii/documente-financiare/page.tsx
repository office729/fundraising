import { Breadcrumb } from "../../../components/ui/breadcrumb";
import { listeazaDocumenteFinanciareAction } from "../documente-financiare-actions";
import { DocumenteFinanciareClient } from "../documente-financiare-client";

export default async function DocumenteFinanciarePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const initial = await listeazaDocumenteFinanciareAction(orgSlug);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Breadcrumb
        items={[
          { label: "Instrumente", href: `/${orgSlug}/crm/instrumente` },
          { label: "Raport de activitate companii", href: `/${orgSlug}/crm/instrumente/raport-companii` },
          { label: "Documente financiare" },
        ]}
      />
      <DocumenteFinanciareClient initial={initial} />
    </div>
  );
}
