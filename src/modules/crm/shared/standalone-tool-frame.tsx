import { SandboxedFrame } from "./sandboxed-frame";

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
// no-op sigur: doar Newsletter PF/PJ și Generator one-pager au azi
// placeholder-ele __FA_DOMENIU_ACTIVITATE__/__FA_DESIGN_RECOMANDAT__ în
// .base.html (vezi lib/design-template-recommendations.ts), ca galeria/
// selectorul de start să urce primele stilurile potrivite domeniului
// organizației.
export function StandaloneToolFrame({
  html,
  title,
  orgSlug,
  domeniuActivitate,
  designRecomandat,
  orgName,
  orgLogoUrl,
}: {
  html: string;
  title: string;
  orgSlug: string;
  domeniuActivitate?: string | null;
  designRecomandat?: string[];
  orgName?: string | null;
  orgLogoUrl?: string | null;
}) {
  let finalHtml = html.replaceAll("__FA_ORG_SLUG__", orgSlug);
  finalHtml = finalHtml.replaceAll("__FA_DOMENIU_ACTIVITATE__", domeniuActivitate ?? "");
  finalHtml = finalHtml.replaceAll("__FA_DESIGN_RECOMANDAT__", JSON.stringify(designRecomandat ?? []));
  // Sigla și numele organizației (sigla lipsă → imaginea se ascunde, vezi onerror în tool).
  finalHtml = finalHtml.replaceAll("__FA_ORG_NAME__", (orgName ?? "").replace(/[<>&"']/g, ""));
  // Doar adrese https, fără caractere care ies din atributul HTML.
  finalHtml = finalHtml.replaceAll("__FA_ORG_LOGO__", orgLogoUrl && /^https:\/\/[^\s"'<>]+$/i.test(orgLogoUrl) ? orgLogoUrl : "");
  // Șabloanele de newsletter au subsolul „Asociația salvează o inimă" scris direct în ele (organizația-pilot). Pentru ORICE
  // altă organizație, identitatea expeditorului trebuie să fie a ei, nu a altcuiva: înlocuim numele la randare.
  // Organizația-pilot rămâne neatinsă (păstrează denumirea ei juridică exactă).
  const nume = (orgName ?? "").replace(/[<>&"']/g, "").trim();
  const esteOrgPilot = nume
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .includes("salveaza o inima");
  if (nume && !esteOrgPilot) {
    finalHtml = finalHtml.replace(/Asocia[țţ]ia salvează o inimă/gi, nume);
  }
  return (
    <div className="h-full">
      <SandboxedFrame html={finalHtml} title={title} orgSlug={orgSlug} />
    </div>
  );
}
