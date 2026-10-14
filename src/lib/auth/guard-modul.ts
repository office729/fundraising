import "server-only";

import type { ModulPachet } from "@/lib/billing/packages";

import { withOrgAdmin, withOrgSession, type OrgContext, type OrgSessionOptions } from "./guard";

// Aceleași învelișuri ca în guard.ts, dar pentru un fișier de acțiuni care aparține unui singur modul inclus doar din anumite pachete:
//   const { withOrgSession, withOrgAdmin } = guardModul("kpi");
// Orice acțiune definită cu ele e refuzată pe server pentru un pachet fără modulul respectiv.
export function guardModul(modul: ModulPachet) {
  return {
    withOrgSession: <A extends unknown[], R>(action: (ctx: OrgContext, ...args: A) => Promise<R>, opts?: OrgSessionOptions) => withOrgSession(action, { ...opts, modul }),
    withOrgAdmin: <A extends unknown[], R>(action: (ctx: OrgContext, ...args: A) => Promise<R>, opts?: OrgSessionOptions) => withOrgAdmin(action, { ...opts, modul }),
  };
}
