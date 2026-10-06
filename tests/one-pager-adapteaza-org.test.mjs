import { test } from "node:test";
import assert from "node:assert/strict";

import { adapteazaOnePagerPentruOrg } from "../src/modules/crm/one-pager-generator/adapteaza-org.ts";

const HTML = [
  "<label>Numele organizației</label>",
  '<input type="text" id="ORG_NUME" value="Asociația Salvează o Inimă">',
  '<input type="text" id="LINK" value="https://salveazaoinima.ro">',
  '<input type="text" id="CONTACT_EMAIL" value="contact@salveazaoinima.ro">',
  '<input type="text" id="CONTACT_WEB" value="salveazaoinima.ro">',
  '<input type="text" id="CONTACT_TEL" value="+40 7xx xxx xxx">',
].join("\n");

test("organizația pilot primește formularul neschimbat", () => {
  assert.equal(adapteazaOnePagerPentruOrg(HTML, "salveaza-o-inima", "Salvează o Inimă"), HTML);
});

test("altă organizație: nume propriu, fără contactul pilotului, cu avertisment", () => {
  const out = adapteazaOnePagerPentruOrg(HTML, "alta-org", "Asociația Frunza");
  assert.match(out, /id="ORG_NUME" value="Asociația Frunza"/);
  assert.match(out, /id="LINK" value=""/);
  assert.match(out, /id="CONTACT_EMAIL" value=""/);
  assert.match(out, /id="CONTACT_WEB" value=""/);
  assert.doesNotMatch(out, /salveazaoinima/);
  assert.match(out, /Exemplu de completare/);
  assert.match(out, /id="CONTACT_TEL" value="\+40 7xx xxx xxx"/); // doar un tipar, rămâne
});

test("numele organizației nu poate sparge atributul HTML", () => {
  const out = adapteazaOnePagerPentruOrg(HTML, "alta-org", 'Evil" onfocus="x');
  assert.doesNotMatch(out, /onfocus="x"/);
});
