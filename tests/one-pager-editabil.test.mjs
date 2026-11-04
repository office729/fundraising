import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CAMPURI_ONE_PAGER,
  LIMITE_ONE_PAGER,
  curataImplicitOnePager,
  curataTextOnePager,
  esteCampOnePager,
} from "../src/lib/one-pager-implicit.ts";

// Copia din instrument (iframe sandbox) trebuie să se comporte exact ca cea de pe server.
const HTML = readFileSync(new URL("../src/modules/crm/one-pager-generator/one-pager-generator.base.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");

function dinHtml() {
  const bloc = HTML.match(/\/\*FA-ED-START\*\/([\s\S]*?)\/\*FA-ED-END\*\//);
  assert.ok(bloc, "marcajele FA-ED-START/END lipsesc din instrument");
  const esc = HTML.match(/function esc\(s\)\{[^\n]*\}/);
  assert.ok(esc, "esc() lipsește din instrument");
  const campEd = HTML.match(/var ED_ETICHETA = [\s\S]*?\nvar ED_STIL/);
  assert.ok(campEd, "campEd lipsește din instrument");
  const cod = `${esc[0]}\n${bloc[1]}\n${campEd[0].replace(/\nvar ED_STIL$/, "")}\nreturn { ED_LIMITE, curataTextEditabil, campEd, esc };`;
  return new Function(cod)();
}
const instr = dinHtml();

const EXEMPLE = [
  ["CONTACT_TEL", "  +40 722\n 111   222  ", "+40 722 111 222"],
  ["CONTACT_TEL", "📞 +40 722 111 222", "+40 722 111 222"],
  ["CONTACT_EMAIL", "✉️ ana@exemplu.ro", "ana@exemplu.ro"],
  ["CONTACT_WEB", "\u200Bexemplu.ro\u202E", "exemplu.ro"],
  ["CONTACT_ADRESA", "Str. Mare\r\nnr. 1\t București", "Str. Mare nr. 1 București"],
  ["CONTACT_TEL", "[Telefon]", ""],
  ["CONTACT_NUME", "[Nume și prenume]", ""],
  ["CONTACT_NUME", "", ""],
  ["CONTACT_NUME", "   ", ""],
  ["CONTACT_FUNCTIE", "x".repeat(200), "x".repeat(80)],
  ["IMPLICA_CTA", "Devino partener " + "a".repeat(100), ("Devino partener " + "a".repeat(100)).slice(0, 60)],
  // emoji tăiat la limită: nu rămâne jumătate de pereche surogat
  ["IMPLICA_CTA", "a".repeat(59) + "😀😀", "a".repeat(59)],
  ["CONTACT_NUME", '<img src=x onerror=alert(1)>', "<img src=x onerror=alert(1)>"], // rămâne text; se escapează la inserare
];

test("curățarea textelor editate: aceleași rezultate pe server și în instrument", () => {
  for (const [camp, brut, asteptat] of EXEMPLE) {
    assert.equal(curataTextOnePager(camp, brut), asteptat, `server ${camp}`);
    assert.equal(instr.curataTextEditabil(camp, brut), asteptat, `instrument ${camp}`);
  }
});

test("limitele de lungime sunt aceleași în instrument și pe server", () => {
  assert.deepEqual({ ...instr.ED_LIMITE }, { ...LIMITE_ONE_PAGER });
});

test("tipuri greșite și câmpuri necunoscute dau text gol", () => {
  assert.equal(curataTextOnePager("CONTACT_TEL", 123), "");
  assert.equal(curataTextOnePager("CONTACT_TEL", null), "");
  assert.equal(instr.curataTextEditabil("CONTACT_TEL", 123), "");
  assert.equal(instr.curataTextEditabil("__proto__", "x"), "");
  assert.equal(instr.curataTextEditabil("constructor", "x"), "");
  assert.equal(esteCampOnePager("toString"), false);
  assert.equal(esteCampOnePager("CONTACT_TEL"), true);
});

test("valoarea editată nu poate ieși din text: HTML-ul se escapează la inserare", () => {
  const rau = '<script>alert(1)</script>" onfocus="x';
  const curat = instr.curataTextEditabil("CONTACT_NUME", rau);
  const html = instr.campEd("CONTACT_NUME", curat);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /onfocus="x/);
  assert.match(html, /&lt;script&gt;/);
  // loc gol: eticheta câmpului, marcat ca placeholder
  const gol = instr.campEd("CONTACT_TEL", "");
  assert.match(gol, /data-ph="1"/);
  assert.match(gol, /\[Telefon\]/);
});

test("implicitul organizației: doar câmpurile cunoscute, doar șiruri, curățate", () => {
  const out = curataImplicitOnePager({
    CONTACT_TEL: " 0722  111 222 ",
    CONTACT_EMAIL: "a@b.ro",
    IMPLICA_TEXT: 5,
    LINK: "https://rau.example",
    __proto__: { CONTACT_WEB: "ascuns" },
    CONTACT_ADRESA: "x".repeat(500),
  });
  assert.deepEqual(Object.keys(out).sort(), ["CONTACT_ADRESA", "CONTACT_EMAIL", "CONTACT_TEL"]);
  assert.equal(out.CONTACT_TEL, "0722 111 222");
  assert.equal(out.CONTACT_ADRESA.length, LIMITE_ONE_PAGER.CONTACT_ADRESA);
  assert.deepEqual(curataImplicitOnePager(null), {});
  assert.deepEqual(curataImplicitOnePager([1, 2]), {});
  assert.deepEqual(curataImplicitOnePager("text"), {});
  assert.equal(CAMPURI_ONE_PAGER.length, Object.keys(LIMITE_ONE_PAGER).length);
});

test("instrumentul: previzualizarea e editabilă, PDF-ul și codul HTML nu poartă marcaje", () => {
  assert.match(HTML, /srcdoc = build\(true\)/);
  assert.match(HTML, /pdfInglobeazaFonturi\(build\(\)\)/);
  assert.match(HTML, /copyToClipboard\(build\(\)/);
  assert.match(HTML, /id="CONTACT_NUME"/);
  assert.match(HTML, /id="CONTACT_FUNCTIE"/);
  // Documentul A4 e un cadru în iframe-ul sandbox (origine opacă): instrumentul nu îi poate citi conținutul, deci editarea comunică prin postMessage, verificând sursa mesajului.
  assert.ok(HTML.includes("ev.source !== fr.contentWindow"));
  assert.ok(HTML.includes("if(edit) out = out.replace(/<\\/body>/i, function(){ return edScript()"));
  assert.equal(/\.contentDocument/.test(HTML.replace(/cadru\.contentDocument/g, "")), false, "documentul A4 din previzualizare nu se citește direct (origine opacă)");
});

test("PDF-ul: măsurarea paginii se face în documentul A4 (cadru cu scripturi, comunicare prin postMessage), nu prin acces direct la cadru", () => {
  assert.ok(HTML.includes("function pdfCopil(A4W, A4H)"));
  assert.ok(HTML.includes("cadru.setAttribute('sandbox', 'allow-scripts')"));
  assert.ok(HTML.includes("ev.source !== cadru.contentWindow"));
  assert.equal(HTML.includes("cadru.setAttribute('sandbox', 'allow-same-origin')"), false);
});
