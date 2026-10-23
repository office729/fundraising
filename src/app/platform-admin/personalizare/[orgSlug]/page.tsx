import Link from "next/link";
import { notFound } from "next/navigation";

import { cerePlatformAdminPagina } from "@/lib/auth/platform-admin";
import { getLocale } from "@/lib/i18n/get-locale";
import { citesteOrgPentruPersonalizare, jurnalizeazaPersonalizare } from "@/lib/suport/personalizare-admin";

import { EditorPersonalizare } from "./editor-personalizare";

export const metadata = { title: "Aspectul dashboardului", robots: { index: false, follow: false } };

// Editorul de aspect al unei organizații, doar pentru echipa platformei: meniu, familie vizuală și blocurile de pe prima pagină, cu previzualizare pe date de
// exemplu. Nu citește și nu arată datele organizației. Deschiderea editorului intră în jurnalul de audit al organizației.
export default async function PersonalizarePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const actor = await cerePlatformAdminPagina();
  const { orgSlug } = await params;
  const org = await citesteOrgPentruPersonalizare(orgSlug);
  if (!org) notFound();
  await jurnalizeazaPersonalizare(org.id, actor, "platform_editor_personalizare");
  const locale = await getLocale();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <Link href="/platform-admin" className="text-xs font-medium text-brand-blue hover:underline">
        ← Panou platformă
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">Aspectul dashboardului · {org.nume}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Alegi ce se vede și cum se numește în meniu, ce familie vizuală are dashboardul și ce blocuri apar pe prima pagină. Previzualizarea arată aspectul organizației cu
        date de exemplu, nu cu datele ei. Modificările se aplică organizației imediat după salvare și rămân în jurnalul ei de audit.
      </p>
      <EditorPersonalizare
        locale={locale}
        org={{ id: org.id, slug: org.slug, nume: org.nume, domeniuActivitate: org.domeniuActivitate }}
        configInitiala={org.config}
      />
    </main>
  );
}
