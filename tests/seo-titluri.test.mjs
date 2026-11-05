import { test } from "node:test";
import assert from "node:assert/strict";

const T = await import("../src/lib/seo-titluri.ts");

test("titlurile de căutare încap în ~60 de caractere cu sufixul, în ambele limbi", () => {
  for (const [pagina, t] of Object.entries(T.TITLURI_CAUTARE)) {
    for (const limba of ["ro", "en"]) {
      assert.ok(t[limba].length > 0, `${pagina} ${limba}`);
      assert.ok(t[limba].length <= T.LUNGIME_MAXIMA_TITLU, `${pagina} ${limba}: ${t[limba].length} caractere`);
    }
  }
});

test("titlurile de căutare sunt unice între pagini, ca Google să le poată deosebi", () => {
  for (const limba of ["ro", "en"]) {
    const toate = Object.values(T.TITLURI_CAUTARE).map((t) => t[limba]);
    assert.equal(new Set(toate).size, toate.length, limba);
  }
});

test("fiecare titlu de căutare are cheia unei pagini publice cunoscute", () => {
  const publice = ["ce-facem", "cine-suntem", "contact", "portofoliu", "portofoliu-clienti", "premii", "vlad-placinta", "automatizari", "cum-functioneaza", "intrebari-frecvente", "noutati"];
  assert.deepEqual(Object.keys(T.TITLURI_CAUTARE).sort(), [...publice].sort());
});
