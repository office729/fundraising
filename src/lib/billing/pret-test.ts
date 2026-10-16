// Preț de TEST pentru verificarea plății reale, fără a taxa 49 de lei. Funcție pură, fără importuri.
// Se aplică DOAR dacă sunt setate AMBELE variabile de mediu și organizația are exact slug-ul din NETOPIA_PRET_TEST_ORG; clienții reali nu pot
// ajunge aici (slug-ul e unic). Plafon de 5 lei, ca o valoare greșită în variabilă să nu scadă prețul sub control. După test se șterg ambele
// variabile din Vercel — codul rămâne inert.
export const PRET_TEST_MAXIM_LEI = 5;

type Env = Record<string, string | undefined>;

export function pretDeTest(orgSlug: string, env: Env = process.env): number | null {
  const slug = env.NETOPIA_PRET_TEST_ORG?.trim();
  const brut = env.NETOPIA_PRET_TEST_LEI?.trim();
  if (!slug || !brut || slug !== orgSlug) return null;
  if (!/^\d+$/.test(brut)) return null;
  const suma = Number(brut);
  return suma >= 1 && suma <= PRET_TEST_MAXIM_LEI ? suma : null;
}
