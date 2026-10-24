import { test } from "node:test";
import assert from "node:assert/strict";

const I = await import("../src/lib/igiena-email.ts");

const smtp = (responseCode, response) => ({ responseCode, response });

test("adresă inexistentă: doar la dovadă clară (5.1.x sau text „user unknown”)", () => {
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 5.1.1 The email account that you tried to reach does not exist")), "adresa_inexistenta");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 5.1.1 <x@y.ro>: Recipient address rejected: User unknown")), "adresa_inexistenta");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 5.1.2 Domain not found")), "adresa_inexistenta");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 User unknown")), "adresa_inexistenta");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 No such user here")), "adresa_inexistenta");
  assert.equal(I.clasificaEroareTrimitere(smtp(553, "553 Mailbox name not allowed: invalid recipient")), "adresa_inexistenta");
  assert.equal(I.clasificaEroareTrimitere(smtp(551, "551 User not local; mailbox unavailable")), "adresa_inexistenta");
});

test("respingerile din cauza reputației sau politicii NU marchează adresa donatorului", () => {
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 5.7.1 Service unavailable; client host [1.2.3.4] blocked using zen.spamhaus.org")), "politica");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 5.7.26 This message does not pass authentication checks (SPF and DKIM)")), "politica");
  assert.equal(I.clasificaEroareTrimitere(smtp(554, "554 Message rejected as spam")), "politica");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 Rejected: sender listed at blacklist")), "politica");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 Relay access denied")), "politica");
});

test("respingerile temporare nu marchează adresa (cutie plină, 4xx)", () => {
  assert.equal(I.clasificaEroareTrimitere(smtp(452, "452 4.2.2 Mailbox full")), "temporara");
  assert.equal(I.clasificaEroareTrimitere(smtp(421, "421 Try again later")), "temporara");
  assert.equal(I.clasificaEroareTrimitere(smtp(552, "552 5.2.2 Over quota")), "temporara");
  assert.equal(I.clasificaEroareTrimitere(smtp(552, "552 Message size exceeds limit")), "temporara");
});

test("fără dovadă clară nu se marchează nimic; erorile de rețea nu sunt respingeri", () => {
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550")), "politica");
  assert.equal(I.clasificaEroareTrimitere(smtp(550, "550 Requested action not taken")), "politica");
  assert.equal(I.clasificaEroareTrimitere({ code: "ETIMEDOUT" }), null);
  assert.equal(I.clasificaEroareTrimitere(new Error("x")), null);
  assert.equal(I.clasificaEroareTrimitere(null), null);
  assert.equal(I.clasificaEroareTrimitere(smtp(250, "250 ok")), null);
});

test("motivul păstrat la donator nu conține textul serverului", () => {
  for (const fel of ["adresa_inexistenta", "temporara", "politica"]) assert.doesNotMatch(I.motivRespingere(fel), /@|\d{3} /);
  assert.match(I.motivRespingere("adresa_inexistenta"), /nu există/);
});

test("stările adresei și frecvența: doar valorile cunoscute; folosibilă doar dacă e în regulă", () => {
  for (const s of ["ok", "respins", "reclamat"]) assert.equal(I.esteStareAdresa(s), true);
  assert.equal(I.esteStareAdresa("blocat"), false);
  assert.equal(I.esteFrecventaEmail("rara"), true);
  assert.equal(I.esteFrecventaEmail("zilnic"), false);
  assert.equal(I.adresaFolosibila("ok"), true);
  assert.equal(I.adresaFolosibila(null), true, "donatori dinainte de coloană");
  assert.equal(I.adresaFolosibila("respins"), false);
  assert.equal(I.adresaFolosibila("reclamat"), false);
});
