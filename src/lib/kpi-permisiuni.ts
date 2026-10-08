// Permisiuni fine pentru modulul KPI — ce pot face managerii și angajații, peste regula de bază (owner/admin pot tot).
// Valorile implicite păstrează comportamentul de dinainte: doar adminii atribuie KPI, iar angajatul își introduce singur valorile.
export type PermisiuniKpi = {
  /** Managerul direct și adminul de departament pot atribui KPI și modifica targeturile/ponderile oamenilor lor. */
  managerAtribuie: boolean;
  /** Managerul direct și adminul de departament pot introduce / corecta valori pentru oamenii lor. */
  managerValori: boolean;
  /** Angajatul își poate introduce singur valorile KPI-urilor lui manuale. */
  angajatValoriProprii: boolean;
};

export const PERMISIUNI_IMPLICITE: PermisiuniKpi = { managerAtribuie: false, managerValori: false, angajatValoriProprii: true };

export const CHEIE_PERMISIUNI_KV = "kpi_permisiuni";

export function curataPermisiuni(brut: unknown): PermisiuniKpi {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<Record<keyof PermisiuniKpi, unknown>>;
  const bool = (v: unknown, implicit: boolean) => (typeof v === "boolean" ? v : implicit);
  return {
    managerAtribuie: bool(o.managerAtribuie, PERMISIUNI_IMPLICITE.managerAtribuie),
    managerValori: bool(o.managerValori, PERMISIUNI_IMPLICITE.managerValori),
    angajatValoriProprii: bool(o.angajatValoriProprii, PERMISIUNI_IMPLICITE.angajatValoriProprii),
  };
}