import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

process.env.ORG_SECRETS_KEY = "cheie-de-test-amprente-0123456789abcdef";
const A = await import("../src/lib/amprente-hmac.ts");

const ORG_1 = "11111111-1111-4111-8111-111111111111";
const ORG_2 = "22222222-2222-4222-8222-222222222222";
const FIRMA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sha32 = (...p) => createHash("sha256").update(p.join("|")).digest("hex").slice(0, 32);

// ---------- „nu mai căuta” al firmei ----------

test("forma veche a amprentei persoanei rămâne identică cu SHA-256 simplu din producție", () => {
  assert.deepEqual(A.amprentePersoanaVechi(ORG_1, FIRMA, "ion popescu", "ion-popescu-123"), [sha32(ORG_1, FIRMA, "nume", "ion popescu"), sha32(ORG_1, FIRMA, "linkedin", "ion-popescu-123")]);
  assert.deepEqual(A.amprentePersoanaVechi(ORG_1, FIRMA, "ion popescu", null), [sha32(ORG_1, FIRMA, "nume", "ion popescu")]);
});

test("forma nouă e HMAC cu prefix, diferită de cea veche și stabilă", () => {
  const noi = A.amprentePersoanaNoi(ORG_1, FIRMA, "ion popescu", "ion-popescu-123");
  assert.equal(noi.length, 2);
  for (const h of noi) assert.match(h, /^hmac:[0-9a-f]{64}$/);
  assert.deepEqual(noi, A.amprentePersoanaNoi(ORG_1, FIRMA, "ion popescu", "ion-popescu-123"));
  const vechi = A.amprentePersoanaVechi(ORG_1, FIRMA, "ion popescu", "ion-popescu-123");
  assert.ok(noi.every((h) => !vechi.includes(h)));
  // numele nu apare în clar în amprentă
  assert.ok(!noi.join("").includes("popescu"));
});

test("amprenta nouă e legată de organizație, de firmă și de nume (izolare)", () => {
  const baza = A.amprentePersoanaNoi(ORG_1, FIRMA, "ion popescu", null)[0];
  assert.notEqual(baza, A.amprentePersoanaNoi(ORG_2, FIRMA, "ion popescu", null)[0]);
  assert.notEqual(baza, A.amprentePersoanaNoi(ORG_1, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "ion popescu", null)[0]);
  assert.notEqual(baza, A.amprentePersoanaNoi(ORG_1, FIRMA, "ion popescu2", null)[0]);
});

test("cheia secretă contează: altă cheie, altă amprentă", async () => {
  const a = A.amprentePersoanaNoi(ORG_1, FIRMA, "ion popescu", null)[0];
  const cheieVeche = process.env.ORG_SECRETS_KEY;
  process.env.ORG_SECRETS_KEY = "alta-cheie-complet-diferita-0123456789";
  try {
    assert.notEqual(a, A.amprentePersoanaNoi(ORG_1, FIRMA, "ion popescu", null)[0]);
  } finally {
    process.env.ORG_SECRETS_KEY = cheieVeche;
  }
});

test("fără ORG_SECRETS_KEY nu se inventează o amprentă (ca hashSuprimare)", () => {
  const cheie = process.env.ORG_SECRETS_KEY;
  delete process.env.ORG_SECRETS_KEY;
  try {
    assert.throws(() => A.amprentePersoanaNoi(ORG_1, FIRMA, "ion", null), /ORG_SECRETS_KEY/);
    assert.throws(() => A.amprentaInfluencerNoua(ORG_1, "ig:ana"), /ORG_SECRETS_KEY/);
    assert.throws(() => A.valoareSuprimare(ORG_1, "email", "a@b.ro"), /ORG_SECRETS_KEY/);
    // forma veche nu depinde de cheie, iar un set gol nu cere cheia
    assert.equal(A.amprentePersoanaVechi(ORG_1, FIRMA, "ion", null).length, 1);
    assert.equal(new A.SetSuprimate(ORG_1, "email").has("a@b.ro"), false);
  } finally {
    process.env.ORG_SECRETS_KEY = cheie;
  }
});

// ---------- Influenceri ----------

test("amprenta veche a influencerilor e SHA-256 trunchiat, cea nouă HMAC, ambele legate de organizație", () => {
  assert.equal(A.amprentaInfluencerVeche(ORG_1, "ig:ana.pop"), sha32(ORG_1, "influenceri", "ig:ana.pop"));
  const nou = A.amprentaInfluencerNoua(ORG_1, "ig:ana.pop");
  assert.match(nou, /^hmac:[0-9a-f]{64}$/);
  assert.notEqual(nou, A.amprentaInfluencerNoua(ORG_2, "ig:ana.pop"));
  assert.notEqual(nou, A.amprentaInfluencerNoua(ORG_1, "ig:ana.pop2"));
  assert.notEqual(A.amprentaInfluencerVeche(ORG_1, "ig:ana.pop"), A.amprentaInfluencerVeche(ORG_2, "ig:ana.pop"));
});

test("scopurile sunt separate: aceeași intrare dă amprente diferite la influenceri, persoane și suprimări", () => {
  const intrare = "em:ana@exemplu.ro";
  const infl = A.amprentaInfluencerNoua(ORG_1, intrare);
  const supr = A.valoareSuprimare(ORG_1, "email", intrare);
  assert.notEqual(infl, supr);
  assert.notEqual(A.valoareSuprimare(ORG_1, "email", "ana@exemplu.ro"), A.valoareSuprimare(ORG_1, "nume", "ana@exemplu.ro"));
});

// ---------- lista de suprimare a prospectării ----------

test("SetSuprimate recunoaște și valoarea în clar (rând vechi), și amprenta HMAC (rând nou)", () => {
  const set = new A.SetSuprimate(ORG_1, "email", ["vechi@exemplu.ro", A.valoareSuprimare(ORG_1, "email", "nou@exemplu.ro")]);
  assert.equal(set.has("vechi@exemplu.ro"), true);
  assert.equal(set.has("nou@exemplu.ro"), true);
  assert.equal(set.has("altcineva@exemplu.ro"), false);
});

test("SetSuprimate: tipul și organizația separă valorile", () => {
  const stocat = A.valoareSuprimare(ORG_1, "nume", "ion popescu");
  assert.equal(new A.SetSuprimate(ORG_1, "nume", [stocat]).has("ion popescu"), true);
  assert.equal(new A.SetSuprimate(ORG_1, "email", [stocat]).has("ion popescu"), false);
  assert.equal(new A.SetSuprimate(ORG_2, "nume", [stocat]).has("ion popescu"), false);
  // amprenta altei organizații stocată din greșeală în această listă nu potrivește nimic
  const alta = A.valoareSuprimare(ORG_2, "nume", "ion popescu");
  assert.equal(new A.SetSuprimate(ORG_1, "nume", [alta]).has("ion popescu"), false);
});

test("SetSuprimate se poate folosi ca ReadonlySet (size, iterare, has)", () => {
  const set = new A.SetSuprimate(ORG_1, "linkedin", ["linkedin.com/in/ana", A.valoareSuprimare(ORG_1, "linkedin", "linkedin.com/in/bogdan")]);
  assert.equal(set.size, 2);
  assert.equal([...set].length, 2);
  assert.ok(set instanceof Set);
  assert.equal(set.has("linkedin.com/in/bogdan"), true);
  assert.equal(set.has("linkedin.com/in/ana"), true);
});

test("esteAmprentaHmac distinge amprenta de valoarea în clar", () => {
  assert.equal(A.esteAmprentaHmac(A.valoareSuprimare(ORG_1, "email", "a@b.ro")), true);
  assert.equal(A.esteAmprentaHmac("a@b.ro"), false);
  assert.equal(A.esteAmprentaHmac(null), false);
  assert.equal(A.esteAmprentaHmac(sha32(ORG_1, "x")), false);
});
