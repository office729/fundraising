/* Regenerează src/modules/crm/<slug>/<slug>-html.ts din <slug>.base.html, pentru
 * FIECARE instrument portat ca HTML static (căutat automat sub src/modules/crm/*).
 * Rulează la `npm run build`/`npm run dev` (prin `prebuild`) — nu mai există pas
 * manual de „am editat base.html, acum regenerez html.ts". Editează DOAR *.base.html.
 *
 * Generalizarea lui gen-crmpj-html.mjs (păstrat doar pentru crm-pj, primul
 * instrument portat) — orice folder nou sub src/modules/crm cu un *.base.html
 * e preluat automat, fără să mai atingi acest script.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "src/modules/crm";

function toConstName(slug) {
  return slug.replace(/-/g, "_").toUpperCase() + "_HTML";
}

const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
let generate = 0;

for (const dir of dirs) {
  const slug = dir.name;
  const base = path.join(ROOT, slug, `${slug}.base.html`);
  if (!fs.existsSync(base)) continue;

  const out = path.join(ROOT, slug, `${slug}-html.ts`);
  const constName = toConstName(slug);
  const html = fs.readFileSync(base, "utf8");
  const header =
    `// Instrument „${slug}" — sursa: ${slug}.base.html. NU edita manual — se generează\n` +
    `// automat la build (scripts/gen-tools-html.mjs, rulat prin \`prebuild\`).\n`;
  fs.writeFileSync(out, header + `export const ${constName} = ` + JSON.stringify(html) + ";\n");
  generate++;
  console.log(`${slug}: ${slug}.base.html -> ${slug}-html.ts (${html.length} chars, export ${constName})`);
}

console.log(`gen-tools-html: ${generate} instrumente regenerate.`);
