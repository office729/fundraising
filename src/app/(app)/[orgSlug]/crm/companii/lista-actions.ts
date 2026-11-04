"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";

import { curataQsLista } from "./lib/filtre-extra";

// Memorează ultima listă a colegului (parametrii din adresă), ca la intrarea din meniu să reia ce avea: „Doar firme lucrate”, județ, responsabil, pagina.
// Se păstrează doar parametrii cunoscuți (curataQsLista); cheia e legată de organizație și de utilizator.
export const salveazaUltimaLista = withOrgSession(async (ctx, qs: string): Promise<void> => {
  const valoare = curataQsLista(typeof qs === "string" ? qs : "");
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: `lista_companii:${ctx.userId}`, data: { qs: valoare } })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: { qs: valoare }, updatedAt: new Date() } });
});
