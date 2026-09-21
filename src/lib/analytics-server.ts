import "server-only";

import { cookies } from "next/headers";

// Semnal de 2 minute către client (components/analytics-events.tsx): „acțiunea
// tocmai a reușit". Necesar pentru acțiuni care se încheie cu redirect(), unde
// clientul nu primește nicio valoare de întoarcere. Nu conține date personale;
// clientul îl șterge imediat și trimite evenimentul doar cu acordul pentru
// analiză. Nu e HttpOnly tocmai ca să poată fi citit și șters din browser.
export async function semnalizeazaEveniment(nume: "sign_up") {
  const store = await cookies();
  store.set("fa_evt", nume, {
    path: "/",
    maxAge: 120,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}
