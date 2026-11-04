import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/ai-org/pret.ts");
const C = await import("../src/lib/ai-org/consum.ts");
const R = await import("../src/lib/ai-org/protocol.ts");

test("costul: tokeni la prețul modelului + căutări web la 10 USD/1000", () => {
  // Opus 5.5: 4 USD intrare, 20 USD ieșire la 1M tokeni.
  const u = { tokeniIn: 1_000_000, tokeniOut: 100_000, tokeniCacheCitire: 0, tokeniCacheScriere: 0, cautariWeb: 0 };
  assert.equal(P.costUsd("claude-opus-5-5", u), 6);
  assert.equal(P.costUsd("claude-opus-5-5", { ...P.UTILIZARE_GOALA, cautariWeb: 15 }), 0.15);
  // cache: citirea e mult mai ieftină decât intrarea, scrierea ceva mai scumpă
  assert.equal(P.costUsd("claude-opus-5-5", { ...P.UTILIZARE_GOALA, tokeniCacheCitire: 1_000_000 }), 0.2);
  assert.equal(P.costUsd("claude-opus-5-5", { ...P.UTILIZARE_GOALA, tokeniCacheScriere: 1_000_000 }), 5);
  assert.equal(P.costUsd("claude-haiku-5-5", { ...P.UTILIZARE_GOALA, tokeniIn: 2_000_000 }), 0.2);
  assert.equal(P.costUsd("claude-opus-5-5", P.UTILIZARE_GOALA), 0);
});

test("modelul care a răspuns (fallback) își are prețul; un model necunoscut cade pe cel cerut, apoi pe cel mai prudent", () => {
  const u = { ...P.UTILIZARE_GOALA, tokeniOut: 1_000_000 };
  assert.equal(P.costUsd("claude-opus-4-8", u, "claude-opus-5-5"), 25);
  assert.equal(P.costUsd("model-necunoscut", u, "claude-sonnet-5-5"), 10);
  assert.equal(P.costUsd("model-necunoscut", u), 20);
});

test("lista de modele alese: doar cele trei, implicit Opus 5.5", () => {
  assert.deepEqual([...P.MODELE_ALESE], ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);
  assert.equal(P.MODEL_IMPLICIT, "claude-opus-5-5");
  assert.equal(P.eModelAles("claude-haiku-5-5"), true);
  assert.equal(P.eModelAles("gpt-4"), false);
  assert.equal(P.eModelAles(undefined), false);
});

test("utilizarea din răspuns: câmpuri lipsă sau stricate = 0, căutările web din server_tool_use", () => {
  assert.deepEqual(R.utilizareDinRaspuns({ input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 2, server_tool_use: { web_search_requests: 4 } }), { tokeniIn: 10, tokeniOut: 5, tokeniCacheCitire: 3, tokeniCacheScriere: 2, cautariWeb: 4 });
  assert.deepEqual(R.utilizareDinRaspuns(undefined), P.UTILIZARE_GOALA);
  assert.deepEqual(R.utilizareDinRaspuns({ input_tokens: "x", output_tokens: -4, server_tool_use: null }), P.UTILIZARE_GOALA);
  const s = P.adunaUtilizare({ tokeniIn: 1, tokeniOut: 2, tokeniCacheCitire: 3, tokeniCacheScriere: 4, cautariWeb: 5 }, { tokeniIn: 10, tokeniOut: 20, tokeniCacheCitire: 30, tokeniCacheScriere: 40, cautariWeb: 50 });
  assert.deepEqual(s, { tokeniIn: 11, tokeniOut: 22, tokeniCacheCitire: 33, tokeniCacheScriere: 44, cautariWeb: 55 });
});

test("cererea: efort implicit mediu, fără thinking și fără tool_choice forțat, cu fallback implicit", () => {
  const corp = R.corpCerere({ cheie: "k", model: "claude-opus-5-5", system: "Ești un asistent.", mesaje: [{ role: "user", content: "Salut" }], maxTokens: 2000 });
  assert.equal(corp.model, "claude-opus-5-5");
  assert.equal(corp.max_tokens, 2000);
  assert.deepEqual(corp.output_config, { effort: "medium" });
  assert.equal("thinking" in corp, false);
  assert.equal("tool_choice" in corp, false);
  assert.equal("tools" in corp, false);
  assert.equal(corp.fallbacks, "default");
  assert.equal(corp.system, "Ești un asistent.");
  assert.equal("fallbacks" in R.corpCerere({ cheie: "k", model: "m", mesaje: [], maxTokens: 10, fallback: false }), false);
});

test("căutarea web: instrumentul de server cu număr de utilizări plafonat", () => {
  const t = (n) => R.corpCerere({ cheie: "k", model: "m", mesaje: [], maxTokens: 10, cautareWeb: { maxUtilizari: n } }).tools;
  assert.deepEqual(t(15), [{ type: "web_search_20260209", name: "web_search", max_uses: 15 }]);
  assert.equal(t(500)[0].max_uses, 30);
  assert.equal(t(0)[0].max_uses, 1);
});

test("antetele: cheia doar în x-api-key, beta de fallback doar când e cerută", () => {
  const h = R.anteteCerere("sk-ant-abc", true);
  assert.equal(h["x-api-key"], "sk-ant-abc");
  assert.equal(h["anthropic-version"], "2023-06-01");
  assert.equal(h["anthropic-beta"], R.BETA_FALLBACK);
  assert.equal("anthropic-beta" in R.anteteCerere("sk-ant-abc", false), false);
});

test("răspunsul: textul unit, sursele din rezultatele căutării și din citări fără dubluri, doar http(s)", () => {
  const p = R.parseazaRaspuns(
    {
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [
        { type: "server_tool_use", name: "web_search" },
        { type: "web_search_tool_result", content: [{ url: "https://ex.ro/a", title: "A" }, { url: "javascript:alert(1)", title: "rău" }] },
        { type: "text", text: "Primul. ", citations: [{ url: "https://ex.ro/a", title: "A din citare" }, { url: "https://alt.ro/b", title: "B" }] },
        { type: "text", text: "Al doilea." },
      ],
    },
    "claude-opus-5-5",
  );
  assert.equal(p.text, "Primul. Al doilea.");
  assert.deepEqual(p.surse, [{ url: "https://ex.ro/a", titlu: "A" }, { url: "https://alt.ro/b", titlu: "B" }]);
  assert.equal(p.oprire, "end_turn");
  assert.equal(p.utilizare.tokeniIn, 100);
  // eroarea instrumentului vine ca obiect (HTTP 200): nu strică citirea
  assert.deepEqual(R.parseazaRaspuns({ content: [{ type: "web_search_tool_result", content: { error_code: "max_uses_exceeded" } }] }, "m").surse, []);
  assert.equal(R.parseazaRaspuns(null, "claude-sonnet-5-5").model, "claude-sonnet-5-5");
});

test("erorile: cod după starea HTTP, mesaje prietenoase în română și engleză, fără chei în text", () => {
  assert.equal(R.codDinHttp(401, { error: { type: "authentication_error", message: "invalid x-api-key" } }).cod, "cheie");
  assert.equal(R.codDinHttp(400, { error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }).cod, "credite");
  assert.equal(R.codDinHttp(429, {}).cod, "limita");
  assert.equal(R.codDinHttp(529, { error: { type: "overloaded_error" } }).cod, "temporar");
  assert.equal(R.codDinHttp(500, null).cod, "temporar");
  assert.equal(R.codDinHttp(400, { error: { message: "max_tokens too large" } }).cod, "cerere");
  assert.match(R.mesajEroare("credite", "ro"), /console\.anthropic\.com → Billing/);
  assert.match(R.mesajEroare("limita", "ro"), /peste un minut/);
  assert.match(R.mesajEroare("cheie", "ro"), /Setări → Integrări & AI/);
  assert.match(R.mesajEroare("credite", "en"), /run out of credits/);
  const cuCheie = R.mesajEroare("cerere", "ro", "bad request for key sk-ant-api03-SECRET123456789 and more");
  assert.equal(cuCheie.includes("SECRET"), false);
  assert.match(cuCheie, /\[cheie\]/);
});

test("cheia Anthropic: formă acceptată / respinsă", () => {
  assert.equal(R.RE_CHEIE_ANTHROPIC.test("sk-ant-api03-" + "a".repeat(40)), true);
  assert.equal(R.RE_CHEIE_ANTHROPIC.test("sk-ant-"), false);
  assert.equal(R.RE_CHEIE_ANTHROPIC.test("sk-xyz-" + "a".repeat(40)), false);
  assert.equal(R.RE_CHEIE_ANTHROPIC.test("sk-ant-api03-" + "a".repeat(20) + " " + "b".repeat(20)), false);
});

test("consum: ultimele 31 de zile completează golurile cu zero, azi e ultima zi", () => {
  const z = C.ultimeleZile([{ zi: "2026-11-02", costUsd: 1.5, apeluri: 3 }, { zi: "2026-10-05", costUsd: 9, apeluri: 1 }], "2026-11-04", 31);
  assert.equal(z.length, 31);
  assert.equal(z[30].zi, "2026-11-04");
  assert.equal(z[0].zi, "2026-10-05");
  assert.deepEqual(z[28], { zi: "2026-11-02", costUsd: 1.5, apeluri: 3 });
  assert.deepEqual(z[29], { zi: "2026-11-03", costUsd: 0, apeluri: 0 });
  assert.equal(z[0].costUsd, 9);
  // trecerea dintre ani
  assert.equal(C.ultimeleZile([], "2027-01-02", 5)[0].zi, "2026-12-29");
});

test("consum: estimarea la final de lună, procentul din buget și costul mediu", () => {
  assert.equal(C.estimareLuna(10, "2026-11-10"), 30); // 1 USD/zi × 30 de zile
  assert.equal(C.estimareLuna(0, "2026-11-10"), 0);
  assert.equal(C.zileInLuna("2026-02-14"), 28);
  assert.equal(C.zileInLuna("2028-02-14"), 29);
  assert.equal(C.procentBuget(25, 100), 25);
  assert.equal(C.procentBuget(250, 100), 250);
  assert.equal(C.procentBuget(5, null), null);
  assert.equal(C.procentBuget(5, 0), null);
  assert.equal(C.costMediu(1, 4), 0.25);
  assert.equal(C.costMediu(1, 0), 0);
});

test("consum: ziua se socotește în ora României (23:30 UTC vara = ziua următoare)", () => {
  assert.equal(C.ziBucuresti(new Date("2026-07-10T21:30:00Z")), "2026-07-11");
  assert.equal(C.ziBucuresti(new Date("2026-01-10T21:30:00Z")), "2026-01-10");
});

test("consum: instrumentele cunoscute și etichetele lor", () => {
  assert.equal(C.eInstrumentAi("agent_email"), true);
  assert.equal(C.eInstrumentAi("necunoscut"), false);
  for (const i of C.INSTRUMENTE_AI) assert.ok(C.ETICHETE_INSTRUMENT[i].ro && C.ETICHETE_INSTRUMENT[i].en);
});

test("afișare: USD cu zecimale, lei doar când există curs", () => {
  assert.match(C.formatUsd(12.5, "ro"), /12,50 USD/);
  assert.match(C.formatUsd(0.0042, "en"), /0\.004 USD/);
  assert.equal(C.formatLei(10, null, "ro"), null);
  assert.match(C.formatLei(10, 4.5, "ro"), /45,00 lei/);
  assert.match(C.formatLei(10, 4.5, "en"), /45\.00 RON/);
});
