"use client";

import { useLocale } from "../../lib/locale-context";

// Text în limba curentă, pentru componentele care nu sunt „use client” (ex. stări goale/eroare folosite și din pagini server):
// <Lt ro="…" en="…" /> citește limba din contextul CRM.
export function Lt({ ro, en }: { ro: string; en: string }) {
  return <>{useLocale() === "ro" ? ro : en}</>;
}
