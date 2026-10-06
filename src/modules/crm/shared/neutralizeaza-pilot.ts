// Același slug ca în one-pager-generator/adapteaza-org.ts și sandbox-bridge.ts: fișierele sunt rulate și direct de Node în
// teste, unde importurile relative fără extensie nu se rezolvă, deci constanta nu poate fi partajată prin import.
const ORG_PILOT_SLUG = "salveaza-o-inima";

// Șabloanele de newsletter conțin linkurile organizației-pilot (site, pagini, Instagram) și domeniul ei în subsol.
// Pentru ORICE altă organizație, un newsletter trimis fără înlocuire ar duce cititorii — și donațiile — la pilot.
// Linkurile devin marcaje ușor de găsit, iar domeniul din subsol un text care cere completarea. Pilotul rămâne neatins.
// Resursele de imagine (mktr.salveazaoinima.ro) nu sunt linkuri către pilot și rămân.
const NOTA =
  '<p style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#fff4d6;border:1px solid #f0d58a;color:#5a4300;font-size:13px;line-height:1.45">' +
  "<strong>Atenție la linkuri.</strong> Linkurile din șabloane (site, pagini, Instagram) au fost înlocuite cu <code>#inlocuieste-linkul</code>. " +
  "Pune adresele organizației tale înainte de a trimite newsletterul." +
  "</p>";

export function neutralizeazaLinkuriPilot(html: string, orgSlug: string): string {
  if (orgSlug === ORG_PILOT_SLUG) return html;
  return html
    .replace(/https:\/\/www\.instagram\.com\/salveazaoinima\.ro\/?/g, "#inlocuieste-linkul-instagram")
    .replace(/https:\/\/salveazaoinima\.ro[^"'\s<)]*/g, "#inlocuieste-linkul")
    .replace(/(?<![\w.@-])salveazaoinima\.ro/g, "[site-ul organizației]")
    .replace("Îl poți personaliza complet după ce-l alegi.</p>", `Îl poți personaliza complet după ce-l alegi.</p>${NOTA}`);
}
