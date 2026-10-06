import { test } from "node:test";
import assert from "node:assert/strict";

import { citesteSnapshot, persistaStocare } from "../src/modules/crm/shared/sandbox-bridge.ts";

function stocareFalsa(initial = {}) {
  const d = new Map(Object.entries(initial));
  return {
    get length() {
      return d.size;
    },
    key: (i) => [...d.keys()][i] ?? null,
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => void d.set(k, String(v)),
    removeItem: (k) => void d.delete(k),
    clear: () => d.clear(),
    _chei: () => [...d.keys()].sort(),
  };
}

test("draft-urile unei organizații nu apar în alta", () => {
  const s = stocareFalsa();
  persistaStocare({ t: "ls-set", k: "draft", v: "A" }, s, "org-a");
  persistaStocare({ t: "ls-set", k: "draft", v: "B" }, s, "org-b");
  assert.deepEqual(citesteSnapshot(s, "org-a"), { draft: "A" });
  assert.deepEqual(citesteSnapshot(s, "org-b"), { draft: "B" });
  assert.deepEqual(citesteSnapshot(s, "org-c"), {});
});

test("cheile gazdei și ale sesiunii nu ajung în instrument", () => {
  const s = stocareFalsa({ fa_cookie_consent: "granted", "sb-x-auth-token": "t", "ci-notificari-vazute": "[]" });
  assert.deepEqual(citesteSnapshot(s, "org-a"), {});
});

test("clear șterge doar cheile organizației curente", () => {
  const s = stocareFalsa({ fa_cookie_consent: "granted" });
  persistaStocare({ t: "ls-set", k: "x", v: "1" }, s, "org-a");
  persistaStocare({ t: "ls-set", k: "x", v: "2" }, s, "org-b");
  persistaStocare({ t: "ls-clear" }, s, "org-a");
  assert.deepEqual(s._chei(), ["fa-org:org-b:x", "fa_cookie_consent"]);
});

test("organizația pilot își vede draft-urile vechi, fără prefix; altele nu", () => {
  const s = stocareFalsa({ soi_draft_pf_v1: "draft vechi", fa_cookie_consent: "granted" });
  assert.deepEqual(citesteSnapshot(s, "salveaza-o-inima"), { soi_draft_pf_v1: "draft vechi" });
  assert.deepEqual(citesteSnapshot(s, "alta-organizatie"), {});
});

test("o scriere nouă a pilotului are prioritate față de cheia veche", () => {
  const s = stocareFalsa({ soi_draft_pf_v1: "vechi" });
  persistaStocare({ t: "ls-set", k: "soi_draft_pf_v1", v: "nou" }, s, "salveaza-o-inima");
  assert.equal(citesteSnapshot(s, "salveaza-o-inima").soi_draft_pf_v1, "nou");
  persistaStocare({ t: "ls-del", k: "soi_draft_pf_v1" }, s, "salveaza-o-inima");
  assert.deepEqual(citesteSnapshot(s, "salveaza-o-inima"), {});
});

test("chei invalide sau prea lungi sunt refuzate", () => {
  const s = stocareFalsa();
  persistaStocare({ t: "ls-set", k: "x".repeat(300), v: "1" }, s, "org-a");
  persistaStocare({ t: "ls-set", k: "sb-abc", v: "1" }, s, "org-a");
  assert.deepEqual(s._chei(), []);
});
