import { test } from "node:test";
import assert from "node:assert/strict";

import { neutralizeazaLinkuriPilot } from "../src/modules/crm/shared/neutralizeaza-pilot.ts";

const HTML = [
  "<p>Alege un template. Îl poți personaliza complet după ce-l alegi.</p>",
  '<a href="https://www.instagram.com/salveazaoinima.ro/">ig</a>',
  '<a href="https://salveazaoinima.ro/directioneaza-20/">20%</a>',
  '<input value="https://salveazaoinima.ro/exemplu-caz/">',
  "<span>Asociația X &middot; salveazaoinima.ro</span>",
  '<img src="https://mktr.salveazaoinima.ro/newsletter-assets/a.png">',
].join("\n");

test("pilotul rămâne neschimbat", () => {
  assert.equal(neutralizeazaLinkuriPilot(HTML, "salveaza-o-inima"), HTML);
});

test("altă organizație: linkurile pilotului dispar, imaginile rămân", () => {
  const out = neutralizeazaLinkuriPilot(HTML, "alta-org");
  assert.doesNotMatch(out, /instagram\.com\/salveazaoinima/);
  assert.doesNotMatch(out, /https:\/\/salveazaoinima\.ro/);
  assert.match(out, /#inlocuieste-linkul-instagram/);
  assert.match(out, /href="#inlocuieste-linkul"/);
  assert.match(out, /value="#inlocuieste-linkul"/);
  assert.match(out, /\[site-ul organizației\]/);
  assert.match(out, /https:\/\/mktr\.salveazaoinima\.ro\/newsletter-assets\/a\.png/);
  assert.match(out, /Atenție la linkuri/);
});
