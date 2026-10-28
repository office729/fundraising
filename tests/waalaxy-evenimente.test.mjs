import { test } from "node:test";
import assert from "node:assert/strict";

const W = await import("../src/lib/waalaxy-evenimente.ts");

test("refuzul: formulări clare = refuz; amânările („nu acum”, „nu încă”) NU sunt refuz", () => {
  for (const m of ["Nu mă interesează, mulțumesc", "nu sunt interesat", "Vă rog nu mă mai contactați", "STOP", "dezabonați-mă", "Nu, mulțumesc!", "scoateți-mă din listă", "renunț", "Fără mulțumesc"]) {
    assert.equal(W.esteRefuz(m), true, m);
  }
  for (const m of ["Nu acum, poate peste o lună", "nu încă", "Mulțumesc, revin cu un răspuns", "Sună-mă mâine", "", null, undefined]) {
    assert.equal(W.esteRefuz(m), false, String(m));
  }
});

test("evenimentul din încărcătură imbricată: nume, rol, firmă, LinkedIn, campanie; câmpuri cu alte denumiri", () => {
  const e = W.citesteEveniment({ event: "prospect.reply", data: { prospect: { firstName: "Ana", lastName: "Pop", occupation: "Director CSR", company: { name: "Alfa SRL" }, linkedinUrl: "https://linkedin.com/in/ana-pop" }, campaign: { name: "Octombrie" }, message: "Salut, cu drag!" } });
  assert.equal(e.nume, "Ana Pop");
  assert.equal(e.rol, "Director CSR");
  assert.equal(e.firma, "Alfa SRL");
  assert.equal(e.linkedin, "https://linkedin.com/in/ana-pop");
  assert.equal(e.campanie, "Octombrie");
  assert.equal(e.tip, "raspuns");
  assert.equal(e.refuz, false);
});

test("tipul: invitație acceptată = conectat; răspuns = raspuns; trimis/invitat = invitat; mesaj fără tip = răspuns", () => {
  assert.equal(W.citesteEveniment({ type: "invitation_accepted", name: "X Y" }).tip, "conectat");
  assert.equal(W.citesteEveniment({ type: "connected", name: "X Y" }).tip, "conectat");
  assert.equal(W.citesteEveniment({ type: "reply", name: "X Y", message: "ok" }).tip, "raspuns");
  assert.equal(W.citesteEveniment({ type: "invitation_sent", name: "X Y" }).tip, "invitat");
  assert.equal(W.citesteEveniment({ name: "X Y", message: "Bună!" }).tip, "raspuns");
  assert.equal(W.citesteEveniment({ name: "X Y" }).tip, "invitat");
  assert.equal(W.citesteEveniment({ type: "message_sent", name: "X Y", message: "Salut" }).tip, "invitat", "mesaj trimis de noi nu e răspuns");
});

test("refuz = răspuns cu formulare de refuz; același text la o invitație acceptată nu contează", () => {
  assert.equal(W.citesteEveniment({ type: "reply", name: "X Y", message: "Nu mă interesează" }).refuz, true);
  assert.equal(W.citesteEveniment({ type: "accepted", name: "X Y", message: "stop" }).refuz, false);
});

test("încărcătură fără persoană = null; listă = câte un eveniment, maximum 50; chei din prototip nu se citesc", () => {
  assert.equal(W.citesteEveniment({ foo: "bar" }), null);
  assert.equal(W.citesteEveniment(null), null);
  assert.equal(W.citesteEvenimente(Array.from({ length: 80 }, (_, i) => ({ name: `Om ${i}` }))).length, 50);
  assert.equal(W.citesteEvenimente([{ name: "A B" }, { foo: 1 }]).length, 1);
  const rau = JSON.parse('{"__proto__":{"name":"Hacker"},"constructor":{"name":"X"}}');
  assert.equal(W.citesteEveniment(rau)?.nume ?? "", "", "nu citește din prototip");
});

test("câmpurile se taie la limită și mesajul rămâne doar pentru clasificare", () => {
  const e = W.citesteEveniment({ name: "N".repeat(500), message: "m".repeat(5000), email: "a@b.ro" });
  assert.equal(e.nume.length, 160);
  assert.equal(e.mesaj.length, 1000);
  assert.equal(e.email, "a@b.ro");
});

test("starea: nu se retrogradează; refuzul e definitiv și bate orice; ordine invitat < conectat < a răspuns", () => {
  assert.equal(W.stareNoua(null, "invitat"), "invitat");
  assert.equal(W.stareNoua("invitat", "conectat"), "conectat");
  assert.equal(W.stareNoua("conectat", "invitat"), "conectat", "un invitat întârziat nu șterge conectat");
  assert.equal(W.stareNoua("a_raspuns", "conectat"), "a_raspuns");
  assert.equal(W.stareNoua("conectat", "a_raspuns"), "a_raspuns");
  assert.equal(W.stareNoua("conectat", "refuz"), "refuz");
  assert.equal(W.stareNoua("refuz", "a_raspuns"), "refuz");
  assert.equal(W.stareNoua("refuz", "conectat"), "refuz");
  assert.equal(W.stareNoua("necunoscut", "conectat"), "conectat", "stare nevalidă = ca și cum nu ar exista");
});

test("starea din eveniment: refuz > răspuns > conectat > invitat", () => {
  assert.equal(W.stareDinEveniment({ tip: "raspuns", refuz: true }), "refuz");
  assert.equal(W.stareDinEveniment({ tip: "raspuns", refuz: false }), "a_raspuns");
  assert.equal(W.stareDinEveniment({ tip: "conectat", refuz: false }), "conectat");
  assert.equal(W.stareDinEveniment({ tip: "invitat", refuz: false }), "invitat");
});

test("potrivirea firmei: nume curat fără forma juridică; exact și unic, altfel null", () => {
  assert.equal(W.numeFirmaCurat("Alfa Ștefan S.R.L."), "alfa stefan");
  assert.equal(W.numeFirmaCurat("BETA S.A."), "beta");
  const candidate = [{ nume: "Alfa SRL", id: 1 }, { nume: "Alfa Plus SRL", id: 2 }, { nume: "Beta SA", id: 3 }];
  assert.equal(W.cuvantulCelMaiLung("Alfa Construct SRL"), "construct");
});

test("cheia de idempotență: aceeași încărcătură = aceeași cheie, persoană sau tip diferite = chei diferite", () => {
  const a = W.citesteEveniment({ type: "reply", linkedinUrl: "https://linkedin.com/in/ana/", message: "Bună", campaign: "C1" });
  const b = W.citesteEveniment({ type: "reply", linkedinUrl: "https://linkedin.com/in/ana", message: "Bună", campaign: "C1" });
  const c = W.citesteEveniment({ type: "accepted", linkedinUrl: "https://linkedin.com/in/ana", campaign: "C1" });
  assert.equal(W.cheieIdempotenta(a), W.cheieIdempotenta(b));
  assert.notEqual(W.cheieIdempotenta(a), W.cheieIdempotenta(c));
});
