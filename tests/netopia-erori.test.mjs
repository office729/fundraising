import { test } from "node:test";
import assert from "node:assert/strict";

import { NetopiaRespins, respingereSigura } from "../src/lib/billing/netopia-erori.ts";

test("doar respingerile clare ale cererii sunt „sigure” (nu s-a taxat): se poate încerca din nou", () => {
  for (const s of [400, 401, 403, 404, 422, 429]) assert.equal(respingereSigura(s), true, `HTTP ${s}`);
});

test("orice altceva e rezultat necunoscut: comanda blochează retaxarea (timeout, 5xx, duplicat, succes fără plată)", () => {
  for (const s of [0, 200, 201, 301, 408, 409, 500, 502, 503, 504]) assert.equal(respingereSigura(s), false, `HTTP ${s}`);
});

test("NetopiaRespins păstrează codul HTTP și codul Netopia", () => {
  const e = new NetopiaRespins(401, "E401");
  assert.equal(e.httpStatus, 401);
  assert.equal(e.cod, "E401");
  assert.equal(e.name, "NetopiaRespins");
  assert.ok(e instanceof Error);
  assert.equal(new NetopiaRespins(400).cod, null);
});
