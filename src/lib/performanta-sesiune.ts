import "server-only";

import { headers } from "next/headers";

import { withOrgSession } from "@/lib/auth/guard";

// Învelișul acțiunilor modulului Echipă & Performanță. Paginile din modul demonstrativ (/…/performanta/demo) folosesc date fictive din memorie și
// NU au voie să citească sau să scrie în baza de date a organizației: orice acțiune de server pornită dintr-o pagină demonstrativă e refuzată aici,
// înainte de a deschide o sesiune de bază de date, cu un răspuns `{ ok: false, eroare }` pe care interfața îl arată ca pe orice altă eroare.
// Paginile reale nu sunt afectate: ele apelează funcțiile direct (nu printr-o cerere de acțiune), deci nu au antetul `next-action`.
const DIN_DEMO = /\/performanta\/demo(\/|\?|#|$)/;
export const MESAJ_DEMO = "Modul demonstrativ nu salvează și nu citește nimic din datele organizației. Ieși din demo ca să lucrezi cu datele tale.";

export function withOrgSessionPerf<A extends unknown[], R>(action: Parameters<typeof withOrgSession<A, R>>[0]): (orgSlug: string, ...args: A) => Promise<R> {
  const inner = withOrgSession(action);
  return async (orgSlug: string, ...args: A) => {
    const h = await headers();
    if (h.get("next-action") && DIN_DEMO.test(h.get("referer") ?? "")) return { ok: false, eroare: MESAJ_DEMO } as unknown as R;
    return inner(orgSlug, ...args);
  };
}
