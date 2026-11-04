import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/agent-email/raspunsuri-reguli.ts");
const R = await import("../src/lib/agent-email/reguli.ts");

// ===== Authentication-Results =====
const GMAIL_OK = "mx.google.com; dkim=pass header.i=@firma.ro header.s=s1 header.b=abc; spf=pass (google.com: domain of ion@firma.ro designates 1.2.3.4 as permitted sender) smtp.mailfrom=ion@firma.ro; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=firma.ro";

test("autenticitate: lipsa antetului nu blochează (necunoscut)", () => {
  assert.equal(P.evalueazaAutenticitate(undefined, "ion@firma.ro").verdict, "necunoscut");
  assert.equal(P.evalueazaAutenticitate([], "ion@firma.ro").verdict, "necunoscut");
  assert.equal(P.evalueazaAutenticitate(["mx.firma.ro; none"], "ion@firma.ro").verdict, "necunoscut");
});

test("autenticitate: DKIM + SPF + DMARC trecute = verificat", () => {
  assert.equal(P.evalueazaAutenticitate([GMAIL_OK], "ion@firma.ro").verdict, "verificat");
});

test("autenticitate: dkim=fail, spf=fail, dmarc=fail => neverificat", () => {
  assert.deepEqual(P.evalueazaAutenticitate(["mx.x.ro; dkim=fail header.d=firma.ro; spf=pass smtp.mailfrom=firma.ro"], "ion@firma.ro"), { verdict: "neverificat", motiv: "dkim=fail" });
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; spf=fail smtp.mailfrom=firma.ro; dkim=none"], "ion@firma.ro").motiv, "spf=fail");
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; spf=pass smtp.mailfrom=firma.ro; dmarc=fail header.from=firma.ro"], "ion@firma.ro").motiv, "dmarc=fail");
});

test("autenticitate: spf=softfail / none doar fără DKIM trecut", () => {
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; spf=softfail smtp.mailfrom=firma.ro"], "ion@firma.ro").verdict, "neverificat");
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; spf=none smtp.mailfrom=firma.ro; dkim=none"], "ion@firma.ro").verdict, "neverificat");
  // cu DKIM trecut (aliniat) softfail-ul SPF nu mai contează
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; spf=softfail smtp.mailfrom=firma.ro; dkim=pass header.d=firma.ro"], "ion@firma.ro").verdict, "verificat");
});

test("autenticitate: dkim=fail cu altă semnătură validă (listă de discuții) nu blochează", () => {
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; dkim=fail header.d=lista.org; dkim=pass header.d=firma.ro"], "ion@firma.ro").verdict, "verificat");
});

test("autenticitate: comentariile dintre paranteze nu se iau drept rezultate", () => {
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; spf=pass (nu e spf=fail) smtp.mailfrom=firma.ro; dkim=pass header.d=firma.ro"], "ion@firma.ro").verdict, "verificat");
});

test("autenticitate: trece pentru ALT domeniu decât al expeditorului declarat = neverificat (From falsificat)", () => {
  const forjat = "mx.x.ro; spf=pass smtp.mailfrom=atacator.com; dkim=pass header.d=atacator.com";
  assert.deepEqual(P.evalueazaAutenticitate([forjat], "director@firma.ro"), { verdict: "neverificat", motiv: "domeniu-nealiniat" });
  // subdomeniul aceleiași organizații e aliniat
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; dkim=pass header.d=mail.firma.ro"], "ion@firma.ro").verdict, "verificat");
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; dkim=pass header.d=firma.com.ro"], "ion@alta.com.ro").verdict, "neverificat");
});

test("autenticitate: un antet fals „pass” adăugat de expeditor sub cel real nu validează; unul „fail” blochează", () => {
  const real = "mx.x.ro; spf=none; dkim=none";
  const fals = "atacator; dmarc=pass header.from=firma.ro";
  assert.equal(P.evalueazaAutenticitate([real, fals], "ion@firma.ro").verdict, "neverificat");
  assert.equal(P.evalueazaAutenticitate([GMAIL_OK, "vechi.ro; dkim=fail"], "ion@firma.ro").verdict, "neverificat");
  // doar primul antet poate acorda „verificat”
  assert.equal(P.evalueazaAutenticitate(["mx.x.ro; none", GMAIL_OK], "ion@firma.ro").verdict, "necunoscut");
});

// ===== Decizia acțiunilor =====
test("decizie: răspuns verificat — opoziția suprimă și pune acordul pe „nu”, interesul mută etapa", () => {
  const stop = P.decideActiuniRaspuns({ eticheta: "stop", automat: false, verdict: "verificat" });
  assert.deepEqual([stop.nota, stop.suprima, stop.consimtamantNu, stop.mutaEtapa, stop.deConfirmat], [true, true, true, false, false]);
  assert.equal(P.decideActiuniRaspuns({ eticheta: "refuz", automat: false, verdict: "necunoscut" }).suprima, true);
  const interesat = P.decideActiuniRaspuns({ eticheta: "interesat", automat: false, verdict: "verificat" });
  assert.deepEqual([interesat.suprima, interesat.mutaEtapa], [false, true]);
  assert.equal(P.decideActiuniRaspuns({ eticheta: "detalii", automat: false, verdict: "necunoscut" }).mutaEtapa, true);
  assert.equal(P.decideActiuniRaspuns({ eticheta: "nu_acum", automat: false, verdict: "verificat" }).mutaEtapa, false);
});

test("decizie: răspuns neverificat — nicio acțiune automată, doar nota de confirmare", () => {
  for (const eticheta of ["stop", "refuz", "interesat", "detalii", "nu_acum", "alt_contact", "altul"]) {
    const d = P.decideActiuniRaspuns({ eticheta, automat: false, verdict: "neverificat" });
    assert.deepEqual([d.nota, d.suprima, d.consimtamantNu, d.mutaEtapa, d.deConfirmat], [true, false, false, false, true], eticheta);
  }
});

test("decizie: răspunsul automat nu declanșează nimic și nu primește notă", () => {
  const d = P.decideActiuniRaspuns({ eticheta: "automat", automat: true, verdict: "verificat" });
  assert.deepEqual([d.nota, d.suprima, d.mutaEtapa], [false, false, false]);
});

test("marcajul de neverificat se pune și se scoate fără pierderi", () => {
  const m = P.marcheazaNeverificat("Da, suntem interesați.");
  assert.ok(P.esteMarcatNeverificat(m));
  assert.equal(P.faraMarcaj(m), "Da, suntem interesați.");
  assert.equal(P.faraMarcaj("text obișnuit"), "text obișnuit");
  assert.ok(m.length < 1700);
});

// ===== Redactarea pentru AI =====
test("redactare pentru AI: emailuri, telefoane, IBAN, CNP, linkuri", () => {
  const t = P.redactaPentruAi(
    "Bună ziua, suntem interesați. Sunați-mă la 0722 123 456 sau +40 721-234-567, scrieți la ion.popescu@firma.ro.\nCont: RO49 AAAA 1B31 0075 9384 0000. CNP 1850101123456. Detalii: https://firma.ro/oferta?token=abc123 și www.firma.ro/x",
  );
  assert.ok(!/@/.test(t), t);
  assert.ok(!/0722|123 456|721-234|0075|9384|1850101123456|token=|firma\.ro/.test(t), t);
  assert.ok(t.includes("[email]") && t.includes("[telefon]") && t.includes("[cont]") && t.includes("[cnp]") && t.includes("[link]"), t);
  assert.ok(t.startsWith("Bună ziua, suntem interesați."));
});

test("redactare pentru AI: păstrează ce ajută la etichetare (date, sume, ani, text)", () => {
  const t = P.redactaPentruAi("Revenim în 2026-12-01 sau pe 12.01.2027; bugetul de 15.000 lei e epuizat pe anul 2026. Nu acum, mulțumim.");
  assert.equal(t, "Revenim în 2026-12-01 sau pe 12.01.2027; bugetul de 15.000 lei e epuizat pe anul 2026. Nu acum, mulțumim.");
});

test("redactare pentru AI: plafonează lungimea și tolerează valori nepotrivite", () => {
  assert.equal(P.redactaPentruAi("a".repeat(5000)).length, 1500);
  assert.equal(P.redactaPentruAi(undefined), "");
  assert.equal(P.redactaPentruAi("subiect cu x@y.ro", 200), "subiect cu [email]");
});

// ===== „Doar cu acord” impus pe server =====
test("doarCuAcord: membrii simpli nu pot ridica restricția; owner/admin da", () => {
  assert.equal(R.doarCuAcordEfectiv(false, "member"), true);
  assert.equal(R.doarCuAcordEfectiv(undefined, "member"), true);
  assert.equal(R.doarCuAcordEfectiv(true, "member"), true);
  assert.equal(R.doarCuAcordEfectiv(false, "viewer"), true);
  assert.equal(R.doarCuAcordEfectiv(false, "owner"), false);
  assert.equal(R.doarCuAcordEfectiv(false, "admin"), false);
  // implicit (fără valoare) rămâne „doar cu acord”, și pentru admin
  assert.equal(R.doarCuAcordEfectiv(undefined, "admin"), true);
  assert.equal(R.doarCuAcordEfectiv(true, "owner"), true);
});
