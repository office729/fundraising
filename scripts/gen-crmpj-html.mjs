/* Regenerează src/modules/crm/crm-pj/crm-pj-html.ts din crm-pj.base.html.
 * Rulează automat la `npm run build` (prin `prebuild`) — nu mai există pas manual
 * de „am editat base.html, acum regenerez html.ts". Editează DOAR base.html. */
import fs from "node:fs";

const BASE = "src/modules/crm/crm-pj/crm-pj.base.html";
const OUT = "src/modules/crm/crm-pj/crm-pj-html.ts";

const html = fs.readFileSync(BASE, "utf8");
const header =
  "// CRM Persoane Juridice — sursa: crm-pj.base.html. NU edita manual — se generează\n" +
  "// automat la build (scripts/gen-crmpj-html.mjs, rulat prin `prebuild`).\n";
fs.writeFileSync(OUT, header + "export const CRM_PJ_HTML = " + JSON.stringify(html) + ";\n");
console.log("crm-pj-html.ts regenerat din base.html (" + html.length + " chars).");
