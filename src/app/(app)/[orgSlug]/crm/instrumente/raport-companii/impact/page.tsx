import { titluAbsolut } from "@/lib/page-titles";
import { MODELE_IMPACT } from "@/lib/raport-impact";

import { curataDateImpact } from "@/lib/raport-impact";

import { incarcaDocumentAction } from "../../_comun/documente-actions";
import { incarcaImpactAction, listeazaCompaniiImpactAction } from "../impact-actions";
import { ImpactClient } from "./impact-client";

export const dynamic = "force-dynamic";

// Generatorul de rapoarte de impact: aceleași date, mai multe modele vizuale, export HTML și PDF. Gardul de acces e cel al layoutului instrumentului.
export default async function ImpactPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const firma = typeof sp.firma === "string" ? sp.firma : null;
  // „?model=…” vine din galeria de modele: modelul ales are prioritate față de cel salvat.
  const model = MODELE_IMPACT.find((m) => m.id === sp.model)?.id;
  const [companii, initial] = await Promise.all([listeazaCompaniiImpactAction(orgSlug), incarcaImpactAction(orgSlug, firma)]);
  // „?doc=…” redeschide un raport din istoric: datele lui înlocuiesc propunerea, dar logo-urile rămân cele de acum.
  const doc = typeof sp.doc === "string" ? await incarcaDocumentAction(orgSlug, "rapoarte", sp.doc) : null;
  const dinIstoric = doc && typeof doc === "object" ? { ...initial, date: curataDateImpact({ ...(doc as object), logoOng: initial.date.logoOng, logoFirma: "" }) } : initial;
  const initialCuModel = model ? { ...dinIstoric, date: { ...dinIstoric.date, model } } : dinIstoric;
  return <ImpactClient orgSlug={orgSlug} companii={companii} firmaInitiala={firma && companii.some((c) => c.companyId === firma) ? firma : null} initial={initialCuModel} azi={new Date().toISOString().slice(0, 10)} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmRaportImpact");
}
