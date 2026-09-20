"use client";

import type { ReactNode } from "react";

import { logoutAction } from "./actions";

// La deconectare ștergem datele de lucru ținute în browser (importuri, ciorne,
// stare instrumente) ca să nu rămână citibile pe un calculator partajat. Sesiunea
// (chei "sb-") nu se atinge aici — o închide logoutAction.
export function LogoutForm({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <form
      action={logoutAction}
      onSubmit={() => {
        try {
          for (const k of Object.keys(window.localStorage)) {
            if (k.startsWith("ci-") || k.startsWith("soi-") || k.startsWith("soi_")) window.localStorage.removeItem(k);
          }
        } catch {
          /* stocare blocată — nimic de șters */
        }
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
