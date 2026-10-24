import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../src/lib/api-publica.ts");
const K = await import("../src/lib/api-publica-cripto.ts");

test("cheia API: format, unicitate, hash stabil, prefix care nu o dezvăluie, antet Bearer", () => {
  const c1 = K.genereazaCheieApi();
  const c2 = K.genereazaCheieApi();
  assert.notEqual(c1, c2);
  assert.equal(A.esteCheieApi(c1), true);
  assert.match(c1, /^alx_live_[A-Za-z0-9_-]{43}$/);
  assert.equal(A.esteCheieApi("alx_live_scurta"), false);
  assert.equal(A.esteCheieApi(null), false);
  assert.equal(K.hashCheieApi(c1), K.hashCheieApi(c1));
  assert.match(K.hashCheieApi(c1), /^[0-9a-f]{64}$/);
  assert.notEqual(K.hashCheieApi(c1), K.hashCheieApi(c2));
  const p = A.prefixAfisat(c1);
  assert.ok(p.length < 25 && c1.startsWith(p.replace("…", "")));
  assert.equal(A.extrageBearer(`Bearer ${c1}`), c1);
  assert.equal(A.extrageBearer(`bearer ${c1}`), c1);
  assert.equal(A.extrageBearer(`Basic ${c1}`), null);
  assert.equal(A.extrageBearer("Bearer prea-scurt"), null);
  assert.equal(A.extrageBearer(null), null);
});

test("permisiunile: doar cele cunoscute, fără dubluri", () => {
  assert.deepEqual(A.curataScopuri(["donatori:citire", "donatori:citire", "admin:tot", 5, "email:scriere"]), ["donatori:citire", "email:scriere"]);
  assert.deepEqual(A.curataScopuri("donatori:citire"), []);
  for (const s of A.SCOPURI) assert.ok(A.ETICHETE_SCOP[s]);
});

test("paginarea: implicit 100, maxim 200, valori nevalide revin la implicit", () => {
  assert.equal(A.limitaPagina(null), 100);
  assert.equal(A.limitaPagina("50"), 50);
  assert.equal(A.limitaPagina("5000"), 200);
  assert.equal(A.limitaPagina("0"), 100);
  assert.equal(A.limitaPagina("-3"), 100);
  assert.equal(A.limitaPagina("abc"), 100);
  assert.equal(A.limitaPagina("2.5"), 100);
  assert.equal(A.esteUuid("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(A.esteUuid("123e4567"), false);
});

test("evenimentele: doar cele abonabile se pot alege; „test.ping” nu", () => {
  assert.deepEqual(A.curataEvenimente(["donatie.reusita", "test.ping", "x", "donatie.reusita", "donator.dezabonat"]), ["donatie.reusita", "donator.dezabonat"]);
  assert.equal(A.esteEveniment("test.ping"), true);
  const plic = A.plicEveniment("id1", "donatie.reusita", new Date("2026-10-26T06:00:00Z"), { suma: 10 });
  assert.deepEqual(plic, { id: "id1", tip: "donatie.reusita", creat_la: "2026-10-26T06:00:00.000Z", date: { suma: 10 } });
});

test("semnătura webhook: se verifică cu același secret, refuză alt corp, alt secret și un moment prea vechi", () => {
  const secret = K.genereazaSecretWebhook();
  assert.ok(secret.startsWith("whsec_"));
  const corp = JSON.stringify({ a: 1 });
  const t = 1_800_000_000;
  const antet = K.semneazaWebhook(secret, corp, t);
  assert.match(antet, /^t=1800000000,v1=[0-9a-f]{64}$/);
  assert.equal(K.verificaSemnaturaWebhook(secret, corp, antet, t + 10), true);
  assert.equal(K.verificaSemnaturaWebhook(secret, corp + " ", antet, t + 10), false);
  assert.equal(K.verificaSemnaturaWebhook(K.genereazaSecretWebhook(), corp, antet, t + 10), false);
  assert.equal(K.verificaSemnaturaWebhook(secret, corp, antet, t + 301), false, "mesaj vechi: protecție la reluare");
  assert.equal(K.verificaSemnaturaWebhook(secret, corp, "t=abc,v1=zz", t), false);
  assert.equal(K.verificaSemnaturaWebhook(secret, corp, "", t), false);
});

test("adresa webhook: doar https, domeniu public, fără utilizator, port sau IP", () => {
  assert.equal(A.valideazaUrlWebhook("https://exemplu.ro/webhook").ok, true);
  assert.equal(A.valideazaUrlWebhook("https://hooks.exemplu.ro:443/x?y=1#frag").url, "https://hooks.exemplu.ro/x?y=1");
  for (const rau of ["http://exemplu.ro/x", "ftp://exemplu.ro", "https://user:parola@exemplu.ro/x", "https://exemplu.ro:8080/x", "https://localhost/x", "https://intern/x", "https://app.local/x", "https://10.0.0.1/x", "https://127.0.0.1/x", "https://[::1]/x", "https://169.254.169.254/latest/meta-data", "https://x.internal/a", "nu e adresa", "", null, "https://" + "a".repeat(400) + ".ro"]) {
    assert.equal(A.valideazaUrlWebhook(rau).ok, false, String(rau));
  }
});

test("IP public: adresele interne, de metadate, CGNAT și rezervate sunt respinse (IPv4 și IPv6)", () => {
  for (const ok of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) assert.equal(A.esteIpPublic(ok), true, ok);
  for (const rau of ["10.1.2.3", "127.0.0.1", "0.0.0.0", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1", "224.0.0.1", "255.255.255.255", "192.0.2.1", "198.18.0.1", "203.0.113.5", "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1", "64:ff9b::a00:1", "::ffff:10.0.0.1", "::ffff:127.0.0.1", "nu-e-ip", "999.1.1.1"]) assert.equal(A.esteIpPublic(rau), false, rau);
});

test("reîncercări: pauze crescătoare, se oprește după 5, iar rezultatul HTTP se clasifică", () => {
  const acum = new Date("2026-10-26T06:00:00Z");
  assert.equal(A.urmatoareaIncercare(0, acum).getTime(), acum.getTime(), "prima încercare imediat");
  assert.equal(A.urmatoareaIncercare(1, acum).getTime(), acum.getTime() + 3_600_000);
  assert.equal(A.urmatoareaIncercare(3, acum).getTime(), acum.getTime() + 24 * 3_600_000);
  assert.equal(A.urmatoareaIncercare(4, acum).getTime(), acum.getTime() + 72 * 3_600_000);
  assert.equal(A.urmatoareaIncercare(5, acum), null);
  assert.equal(A.rezultatLivrare(200), "trimis");
  assert.equal(A.rezultatLivrare(204), "trimis");
  assert.equal(A.rezultatLivrare(301), "esuat", "redirectările nu se urmăresc");
  assert.equal(A.rezultatLivrare(500), "esuat");
  assert.equal(A.rezultatLivrare(410), "dezactiveaza");
  assert.equal(A.rezultatLivrare(null), "esuat");
});

test("prefixurile din cripto coincid cu cele din lib: o cheie generată trece de validare, iar prefixul afișat vine din ea", () => {
  const c = K.genereazaCheieApi();
  assert.equal(A.esteCheieApi(c), true);
  assert.ok(c.startsWith(A.PREFIX_CHEIE));
  assert.ok(K.genereazaSecretWebhook().startsWith(A.PREFIX_SECRET_WEBHOOK));
});

test("tipIp: IPv4 corect, IPv6 corect, restul nu sunt adrese IP", () => {
  assert.equal(A.tipIp("8.8.8.8"), 4);
  assert.equal(A.tipIp("256.1.1.1"), 0);
  assert.equal(A.tipIp("1.2.3"), 0);
  assert.equal(A.tipIp("::1"), 6);
  assert.equal(A.tipIp("[2606:4700::1111]"), 6);
  assert.equal(A.tipIp("::ffff:8.8.8.8"), 6);
  assert.equal(A.tipIp("exemplu.ro"), 0);
  assert.equal(A.tipIp("zz::1"), 0);
  assert.equal(A.tipIp(""), 0);
});
