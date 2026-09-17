// Instrument portat EXACT ca la CRM PJ (design neatins) — rulat într-un
// iframe srcDoc (aceeași origine → localStorage propriu, izolat per tool).
// Spre deosebire de editor.tsx-ul lui CRM PJ, majoritatea acestor instrumente
// nu au (încă) nevoie de client-side state/effect — dar tot au nevoie de
// `orgSlug` înlocuit în URL-urile de sincronizare cu backend-ul (vezi
// __FA_ORG_SLUG__ în .base.html-urile care au fost re-conectate la rutele
// /api/[orgSlug]/... — CRM Voluntari e primul; string.replaceAll pe un
// placeholder absent (tool-uri fără sincronizare) e un no-op, deci sigur
// pentru toți apelanții existenți.
export function StandaloneToolFrame({ html, title, orgSlug }: { html: string; title: string; orgSlug: string }) {
  const finalHtml = html.replaceAll("__FA_ORG_SLUG__", orgSlug);
  return (
    <div className="h-full">
      <iframe srcDoc={finalHtml} title={title} className="h-full w-full border-0" />
    </div>
  );
}
