import { test } from "node:test";
import assert from "node:assert/strict";

// Meta Marketing API, fără rețea: `fetch` e injectat.
const M = await import("../src/lib/reclame/meta-api.ts");
const fara_pauza = async () => {};
const raspuns = (corp, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => corp });
const eroareGraph = (code, status = 400, error_subcode) => raspuns({ error: { message: "x", code, error_subcode, type: "OAuthException" } }, status);
const baza = { token: "t", contId: "123456", asteapta: fara_pauza };

test("ID-ul contului acceptă cu sau fără prefixul act_ și respinge restul", () => {
  assert.equal(M.idCont("act_1234567890"), "1234567890");
  assert.equal(M.idCont(" 1234567890 "), "1234567890");
  assert.equal(M.idCont("act_12"), null);
  assert.equal(M.idCont("1234567890; drop"), null);
  assert.equal(M.idCont("../me"), null);
});

test("cererea Insights cere nivelul reclamă, pe zile, defalcat pe platformă, fără token în adresă", () => {
  const u = new URL(M.urlInsights({ contId: "123456", de: "2026-10-01", pana: "2026-10-07" }));
  assert.equal(u.hostname, "graph.facebook.com");
  assert.match(u.pathname, /^\/v\d+\.\d+\/act_123456\/insights$/);
  assert.equal(u.searchParams.get("level"), "ad");
  assert.equal(u.searchParams.get("time_increment"), "1");
  assert.equal(u.searchParams.get("breakdowns"), "publisher_platform");
  assert.deepEqual(JSON.parse(u.searchParams.get("time_range")), { since: "2026-10-01", until: "2026-10-07" });
  assert.ok(u.searchParams.get("fields").split(",").includes("inline_link_clicks"));
  assert.equal(u.searchParams.has("access_token"), false);
});

test("paginarea urmează paging.next și ignoră adresele care nu duc la graph.facebook.com", () => {
  assert.equal(M.urmatoareaPagina({ paging: { next: "https://graph.facebook.com/v25.0/x?after=1" } }), "https://graph.facebook.com/v25.0/x?after=1");
  assert.equal(M.urmatoareaPagina({ paging: { next: "https://evil.example/steal" } }), null);
  assert.equal(M.urmatoareaPagina({ paging: { next: "http://graph.facebook.com/x" } }), null);
  assert.equal(M.urmatoareaPagina({ paging: { next: "javascript:alert(1)" } }), null);
  assert.equal(M.urmatoareaPagina({ paging: {} }), null);
  assert.equal(M.urmatoareaPagina(null), null);
});

test("descarcă toate paginile, trimite tokenul în antet și niciodată către altă gazdă", async () => {
  const apeluri = [];
  const fetchImpl = async (url, init) => {
    apeluri.push({ url, auth: init.headers.Authorization });
    if (apeluri.length === 1) return raspuns({ data: [{ date_start: "2026-10-01" }], paging: { next: "https://graph.facebook.com/v25.0/p2" } });
    if (apeluri.length === 2) return raspuns({ data: [{ date_start: "2026-10-02" }], paging: { next: "https://evil.example/p3" } });
    return raspuns({ data: [] });
  };
  const r = await M.descarcaInsights({ ...baza, fetchImpl, token: "TOKEN_SECRET", de: "2026-10-01", pana: "2026-10-02" });
  assert.equal(r.randuri.length, 2);
  assert.equal(r.pagini, 2);
  assert.equal(apeluri.length, 2); // linkul către evil.example nu s-a apelat
  assert.ok(apeluri.every((a) => a.auth === "Bearer TOKEN_SECRET" && !a.url.includes("TOKEN_SECRET")));
});

test("limitarea și erorile trecătoare se reîncearcă; tokenul expirat nu", async () => {
  let n = 0;
  const cuLimita = async () => (++n < 3 ? eroareGraph(17) : raspuns({ data: [{ date_start: "2026-10-01" }] }));
  const ok = await M.descarcaInsights({ ...baza, fetchImpl: cuLimita, de: "2026-10-01", pana: "2026-10-01" });
  assert.equal(ok.randuri.length, 1);
  assert.equal(n, 3);

  let m = 0;
  await assert.rejects(M.descarcaInsights({ ...baza, fetchImpl: async () => (m++, eroareGraph(4, 400, 1504022)), de: "2026-10-01", pana: "2026-10-01", maxReincercari: 2 }), (e) => e.clasa === "limita");
  assert.equal(m, 3); // prima încercare + 2 reîncercări

  let k = 0;
  await assert.rejects(M.descarcaInsights({ ...baza, fetchImpl: async () => (k++, eroareGraph(190, 401)), de: "2026-10-01", pana: "2026-10-01" }), (e) => e.clasa === "token");
  assert.equal(k, 1);

  let r5 = 0;
  const cu500 = async () => (++r5 < 2 ? raspuns({}, 503) : raspuns({ data: [] }));
  assert.equal((await M.descarcaInsights({ ...baza, fetchImpl: cu500, de: "2026-10-01", pana: "2026-10-01" })).randuri.length, 0);
});

test("rețea căzută: reîncercări, apoi o eroare trecătoare fără detalii tehnice", async () => {
  let n = 0;
  await assert.rejects(M.descarcaInsights({ ...baza, fetchImpl: async () => (n++, Promise.reject(new Error("ECONNRESET 10.0.0.1"))), de: "2026-10-01", pana: "2026-10-01", maxReincercari: 1 }), (e) => e.clasa === "tranzitorie" && !e.message.includes("10.0.0.1"));
  assert.equal(n, 2);
});

test("eroarea «prea multe date» împarte intervalul până când cererile încap", async () => {
  const fetchImpl = async (url) => {
    const t = JSON.parse(new URL(url).searchParams.get("time_range"));
    const zile = (Date.parse(t.until) - Date.parse(t.since)) / 86_400_000 + 1;
    if (zile > 2) return eroareGraph(100, 400, 1487534);
    return raspuns({ data: Array.from({ length: zile }, (_, i) => ({ date_start: new Date(Date.parse(t.since) + i * 86_400_000).toISOString().slice(0, 10), spend: "1.00" })) });
  };
  const r = await M.descarcaInsights({ ...baza, fetchImpl, de: "2026-10-01", pana: "2026-10-07" });
  assert.deepEqual(r.randuri.map((x) => x.date_start), ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]); // fiecare zi o singură dată
});

test("clasificarea erorilor (token, permisiuni, cont, limită, volum)", () => {
  const c = (s, code, sub) => M.claseazaEroare(s, { error: { code, error_subcode: sub } }).clasa;
  assert.equal(c(400, 190), "token");
  assert.equal(c(401, undefined), "token");
  assert.equal(c(403, 200), "permisiuni");
  assert.equal(c(400, 10), "permisiuni");
  assert.equal(c(400, 100, 1487534), "prea-mare");
  assert.equal(c(400, 100), "cont");
  assert.equal(c(400, 613), "limita");
  assert.equal(c(400, 80004), "limita");
  assert.equal(c(500, undefined), "tranzitorie");
  assert.equal(M.claseazaEroare(400, null).clasa, "alta");
});

test("rândurile Insights devin costuri zilnice; sumele se adună pe cheie, rândurile invalide se numără", () => {
  const brut = [
    { date_start: "2026-10-01", campaign_id: "11", campaign_name: "Inimă — cmp_026", adset_id: "21", adset_name: "Set", ad_id: "31", ad_name: "Video", spend: "12.34", impressions: "1000", inline_link_clicks: "25", account_currency: "RON", publisher_platform: "facebook" },
    { date_start: "2026-10-01", campaign_id: "11", campaign_name: "Inimă — cmp_026", adset_id: "21", adset_name: "Set", ad_id: "31", ad_name: "Video", spend: "0.66", impressions: "50", publisher_platform: "facebook" },
    { date_start: "2026-10-01", campaign_id: "11", adset_id: "21", ad_id: "31", spend: "5.00", publisher_platform: "Instagram" },
    { date_start: "ieri", spend: "3" },
    { date_start: "2026-10-02", spend: "n/a" },
    { date_start: "2026-10-03", campaign_id: "12" },
  ];
  const r = M.mapeazaInsights(brut, "123456");
  assert.equal(r.ignorate, 3);
  assert.equal(r.moneda, "RON");
  assert.equal(r.randuri.length, 2);
  const fb = r.randuri.find((x) => x.plasament === "facebook");
  assert.equal(fb.cheltuialaMinor, 1300);
  assert.equal(fb.afisari, 1050);
  assert.equal(fb.clicuri, 25);
  assert.equal(fb.cont, "act_123456");
  assert.equal(r.randuri.find((x) => x.plasament === "instagram").cheltuialaMinor, 500);
  assert.equal(r.randuri.reduce((s, x) => s + x.cheltuialaMinor, 0), 1800); // totalul nu se dublează prin defalcarea pe platformă
});

test("codul UTM din numele campaniei, intervalele de sincronizare și vechimea", () => {
  assert.equal(M.codDinNumeCampanie("Inimă pentru Ana — cmp_026"), "cmp_026");
  assert.equal(M.codDinNumeCampanie("CMP_031 vara"), "cmp_031");
  assert.equal(M.codDinNumeCampanie("Campanie fără cod"), null);
  assert.equal(M.codDinNumeCampanie("xcmp_026"), null);
  assert.deepEqual(M.perioadaSincronizare("2026-10-15", 7), { de: "2026-10-09", pana: "2026-10-15" });
  assert.deepEqual(M.perioadaSincronizare("2026-10-15", 1000), { de: "2026-07-18", pana: "2026-10-15" }); // plafon 90 de zile
  const iv = M.intervale("2026-10-01", "2026-10-31", 14);
  assert.deepEqual(iv.map((x) => [x.de, x.pana]), [["2026-10-01", "2026-10-14"], ["2026-10-15", "2026-10-28"], ["2026-10-29", "2026-10-31"]]);
  assert.deepEqual(M.imparteInterval("2026-10-01", "2026-10-05"), [{ de: "2026-10-01", pana: "2026-10-02" }, { de: "2026-10-03", pana: "2026-10-05" }]);
  const acum = Date.UTC(2026, 9, 15, 12);
  assert.equal(M.esteVeche(null, acum), true);
  assert.equal(M.esteVeche(acum - 30 * 60_000, acum), false);
  assert.equal(M.esteVeche(acum - 61 * 60_000, acum), true);
});

test("citirea contului întoarce numele, moneda și fusul orar", async () => {
  const fetchImpl = async () => raspuns({ name: "Salvează o inimă", currency: "ron", timezone_name: "Europe/Bucharest", account_status: 1 });
  assert.deepEqual(await M.citesteCont({ ...baza, fetchImpl }), { nume: "Salvează o inimă", moneda: "RON", fusOrar: "Europe/Bucharest", stare: 1 });
  await assert.rejects(M.citesteCont({ ...baza, fetchImpl: async () => eroareGraph(100, 400) }), (e) => e.clasa === "cont");
});
