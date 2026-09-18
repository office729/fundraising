// Instrument portat EXACT ca la CRM PJ (design neatins) — rulat într-un
// iframe srcDoc (aceeași origine → localStorage propriu, izolat per tool).
// Spre deosebire de editor.tsx-ul lui CRM PJ, majoritatea acestor instrumente
// nu au (încă) nevoie de client-side state/effect — dar tot au nevoie de
// `orgSlug` înlocuit în URL-urile de sincronizare cu backend-ul (vezi
// __FA_ORG_SLUG__ în .base.html-urile care au fost re-conectate la rutele
// /api/[orgSlug]/... — CRM Voluntari e primul; string.replaceAll pe un
// placeholder absent (tool-uri fără sincronizare) e un no-op, deci sigur
// pentru toți apelanții existenți.
//
// `domeniuActivitate`/`designRecomandat` (opționale) — aceeași logică de
// no-op sigur: doar Newsletter PF/PJ au azi placeholder-ele
// __FA_DOMENIU_ACTIVITATE__/__FA_DESIGN_RECOMANDAT__ în .base.html (vezi
// lib/newsletter-design-templates.ts), ca galeria de start să urce primele
// stilurile potrivite domeniului organizației.
export function StandaloneToolFrame({
  html,
  title,
  orgSlug,
  domeniuActivitate,
  designRecomandat,
}: {
  html: string;
  title: string;
  orgSlug: string;
  domeniuActivitate?: string | null;
  designRecomandat?: string[];
}) {
  let finalHtml = html.replaceAll("__FA_ORG_SLUG__", orgSlug);
  finalHtml = finalHtml.replaceAll("__FA_DOMENIU_ACTIVITATE__", domeniuActivitate ?? "");
  finalHtml = finalHtml.replaceAll("__FA_DESIGN_RECOMANDAT__", JSON.stringify(designRecomandat ?? []));
  return (
    <div className="h-full">
      <iframe srcDoc={finalHtml} title={title} className="h-full w-full border-0" />
    </div>
  );
}
