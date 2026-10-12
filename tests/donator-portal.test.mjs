import { test } from "node:test";
import assert from "node:assert/strict";

const { parametriLinkPortal, verificaLinkPortal, VALABILITATE_LINK_MS } = await import("../src/lib/donator-portal-token.ts");
const { aplicaOperatie, descrieAbonament, esteAlDonatorului } = await import("../src/lib/donator-portal-ops.ts");

const CHEIE = "cheie-de-test";
const ORG = "org-1";

test("linkul semnat se verifică doar pentru aceeași organizație, aceeași adresă și înainte de expirare", () => {
  const acum = 1_000_000;
  const p = parametriLinkPortal(CHEIE, ORG, "Ion@Test.ro", acum);
  assert.equal(verificaLinkPortal(CHEIE, ORG, p.e, p.x, p.t, acum + 1000), "ion@test.ro");
  assert.equal(verificaLinkPortal(CHEIE, "org-2", p.e, p.x, p.t, acum + 1000), null, "altă organizație");
  assert.equal(verificaLinkPortal("alta-cheie", ORG, p.e, p.x, p.t, acum + 1000), null, "altă cheie");
  assert.equal(verificaLinkPortal(CHEIE, ORG, p.e, p.x, p.t, acum + VALABILITATE_LINK_MS + 1), null, "expirat");
  // alt email, aceeași semnătură
  const alt = Buffer.from("altcineva@test.ro").toString("base64url");
  assert.equal(verificaLinkPortal(CHEIE, ORG, alt, p.x, p.t, acum + 1000), null);
  // expirare prelungită manual
  assert.equal(verificaLinkPortal(CHEIE, ORG, p.e, String(Number(p.x) + 5 * VALABILITATE_LINK_MS), p.t, acum + 1000), null);
  assert.equal(verificaLinkPortal(CHEIE, ORG, null, p.x, p.t), null);
});

function abonament(patch = {}) {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_1",
    pause_collection: null,
    metadata: { orgId: ORG, emailDonator: "ion@test.ro" },
    items: { data: [{ id: "si_1", quantity: 1, current_period_end: 2_000_000_000, price: { unit_amount: 5000, currency: "ron", product: "prod_1" } }] },
    ...patch,
  };
}

function stripeFals(sub) {
  const apeluri = [];
  const stare = { sub };
  return {
    apeluri,
    subscriptions: {
      retrieve: async (id) => {
        if (id !== stare.sub.id) throw new Error("negasit");
        return stare.sub;
      },
      update: async (id, params) => {
        apeluri.push(["update", id, params]);
        const nou = { ...stare.sub };
        if ("pause_collection" in params) nou.pause_collection = params.pause_collection === "" ? null : params.pause_collection;
        if (params.items) nou.items = { data: [{ ...stare.sub.items.data[0], price: { ...stare.sub.items.data[0].price, unit_amount: params.items[0].price_data.unit_amount } }] };
        stare.sub = nou;
        return nou;
      },
      cancel: async (id) => {
        apeluri.push(["cancel", id]);
        stare.sub = { ...stare.sub, status: "canceled" };
        return stare.sub;
      },
    },
  };
}

test("descrierea abonamentului: sumă, stare și următoarea plată", () => {
  const d = descrieAbonament(abonament());
  assert.equal(d.suma, 50);
  assert.equal(d.stare, "activ");
  assert.equal(d.urmatoarea, 2_000_000_000 * 1000);
  assert.equal(d.clientId, "cus_1");
  assert.equal(descrieAbonament(abonament({ pause_collection: { behavior: "void" } })).stare, "pauza");
  assert.equal(descrieAbonament(abonament({ pause_collection: { behavior: "void" } })).urmatoarea, null);
  assert.equal(descrieAbonament(abonament({ status: "canceled" })).stare, "oprit");
});

test("un donator nu poate umbla la abonamentul altcuiva", async () => {
  assert.equal(esteAlDonatorului(abonament(), ORG, "ION@test.ro"), true);
  assert.equal(esteAlDonatorului(abonament(), ORG, "altcineva@test.ro"), false);
  assert.equal(esteAlDonatorului(abonament(), "org-2", "ion@test.ro"), false);
  const s = stripeFals(abonament());
  const r = await aplicaOperatie(s, "sub_1", ORG, "altcineva@test.ro", { tip: "opreste" });
  assert.deepEqual(r, { ok: false, cod: "nu_e_al_tau" });
  assert.equal(s.apeluri.length, 0, "nu s-a apelat Stripe");
  assert.deepEqual(await aplicaOperatie(s, "sub_inexistent", ORG, "ion@test.ro", { tip: "opreste" }), { ok: false, cod: "negasit" });
});

test("schimbarea sumei: limite, monedă și cerere către Stripe fără proratare", async () => {
  const s = stripeFals(abonament());
  for (const suma of [2, 0, -5, 50_001, Number.NaN]) {
    assert.deepEqual(await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "suma", suma }), { ok: false, cod: "suma_invalida" }, String(suma));
  }
  assert.equal(s.apeluri.length, 0);
  const r = await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "suma", suma: 80 });
  assert.equal(r.ok, true);
  assert.equal(r.inainte.suma, 50);
  assert.equal(r.dupa.suma, 80);
  const [, , params] = s.apeluri[0];
  assert.equal(params.proration_behavior, "none");
  assert.deepEqual(params.items[0].price_data, { currency: "ron", product: "prod_1", unit_amount: 8000, recurring: { interval: "month" } });
  // abonament în euro (PayPal): suma nu se schimbă de aici
  const eur = stripeFals(abonament({ items: { data: [{ id: "si_1", quantity: 1, price: { unit_amount: 1000, currency: "eur", product: "prod_1" } }] } }));
  assert.deepEqual(await aplicaOperatie(eur, "sub_1", ORG, "ion@test.ro", { tip: "suma", suma: 20 }), { ok: false, cod: "moneda" });
});

test("pauză, reluare și oprire", async () => {
  const s = stripeFals(abonament());
  assert.deepEqual(await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "reia" }), { ok: false, cod: "stare" }, "nu e în pauză");
  const p = await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "pauza" });
  assert.equal(p.ok, true);
  assert.equal(p.dupa.stare, "pauza");
  assert.deepEqual(await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "pauza" }), { ok: false, cod: "stare" }, "deja în pauză");
  const r = await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "reia" });
  assert.equal(r.dupa.stare, "activ");
  assert.deepEqual(s.apeluri.map((a) => a[2]?.pause_collection), [{ behavior: "void" }, ""]);
  const o = await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "opreste" });
  assert.equal(o.dupa.stare, "oprit");
  // după oprire nu mai merge nimic
  assert.deepEqual(await aplicaOperatie(s, "sub_1", ORG, "ion@test.ro", { tip: "pauza" }), { ok: false, cod: "oprit" });
});
