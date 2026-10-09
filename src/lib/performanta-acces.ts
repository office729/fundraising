// Echipă & Performanță — cine vede și cine modifică ce. Reguli pure (fără acces la baza de date), aplicate pe server în fiecare acțiune
// și citire; interfața doar le reflectă (butoane ascunse NU sunt o măsură de securitate).
//
//  - Organization Admin (owner / admin) vede și modifică tot.
//  - Obiectivele cu vizibilitate „organizație” le vede orice membru; „echipă” — echipa departamentului, responsabilul, colaboratorii și
//    managerii lui; „privat” — responsabilul, colaboratorii, creatorul și managerii responsabilului.
//  - Modifică un obiectiv: adminul, responsabilul, managerul responsabilului (direct sau indirect), adminul de departament, creatorul.
//  - Actualizează un rezultat-cheie: cine modifică obiectivul, colaboratorii și responsabilul rezultatului.
//  - Evaluările private (autoevaluare, feedback) rămân între angajat, autor și managerul lui; vezi lib/performanta-evaluari.ts.

export type AngajatStructura = { id: string; appUserId: string | null; departmentId: string | null; managerId: string | null; nivelAcces: string; status: string };

export type Eu = {
  admin: boolean;
  userId: string;
  angajatId: string | null;
  departmentId: string | null;
  adminDepartament: boolean;
  /** Angajații pentru care sunt manager (direct sau indirect), plus tot departamentul meu dacă sunt admin de departament. */
  subordonati: Set<string>;
};

export function construiesteEu(angajati: AngajatStructura[], userId: string, admin: boolean): Eu {
  const eu = angajati.find((a) => a.appUserId === userId) ?? null;
  const subordonati = new Set<string>();
  if (eu) {
    // Descendenții pe lanțul de manageri (cu protecție la cicluri).
    const pe = new Map<string, string[]>();
    for (const a of angajati) if (a.managerId) pe.set(a.managerId, [...(pe.get(a.managerId) ?? []), a.id]);
    const coada = [eu.id];
    while (coada.length) {
      const m = coada.pop()!;
      for (const c of pe.get(m) ?? []) if (c !== eu.id && !subordonati.has(c)) {
        subordonati.add(c);
        coada.push(c);
      }
    }
    if (eu.nivelAcces === "admin_departament" && eu.departmentId) for (const a of angajati) if (a.departmentId === eu.departmentId && a.id !== eu.id) subordonati.add(a.id);
  }
  return { admin, userId, angajatId: eu?.id ?? null, departmentId: eu?.departmentId ?? null, adminDepartament: eu?.nivelAcces === "admin_departament", subordonati };
}

export type ObiectivAcces = {
  vizibilitate: string;
  responsabilId: string | null;
  departmentId: string | null;
  creatDe: string | null; // app_users.id
  colaboratori: string[]; // angajati.id
};

const esteImplicat = (eu: Eu, o: ObiectivAcces) =>
  Boolean(eu.angajatId && (o.responsabilId === eu.angajatId || o.colaboratori.includes(eu.angajatId))) || o.creatDe === eu.userId || Boolean(o.responsabilId && eu.subordonati.has(o.responsabilId));

export function vedeObiectiv(eu: Eu, o: ObiectivAcces): boolean {
  if (eu.admin) return true;
  if (esteImplicat(eu, o)) return true;
  if (o.vizibilitate === "organizatie") return true;
  if (o.vizibilitate === "echipa") return Boolean(eu.departmentId && o.departmentId && eu.departmentId === o.departmentId);
  return false; // privat
}

export function poateEditaObiectiv(eu: Eu, o: ObiectivAcces): boolean {
  if (eu.admin) return true;
  return Boolean((eu.angajatId && o.responsabilId === eu.angajatId) || o.creatDe === eu.userId || (o.responsabilId && eu.subordonati.has(o.responsabilId)));
}

export function poateActualizaRezultat(eu: Eu, o: ObiectivAcces, rezultatResponsabilId: string | null): boolean {
  if (poateEditaObiectiv(eu, o)) return true;
  if (!eu.angajatId) return false;
  return o.colaboratori.includes(eu.angajatId) || rezultatResponsabilId === eu.angajatId;
}

// Activități: le vede responsabilul, creatorul, managerii responsabilului și adminii; alții doar dacă pot vedea obiectivul legat.
export type ActivitateAcces = { responsabilId: string | null; creatDe: string | null };
export function vedeActivitate(eu: Eu, a: ActivitateAcces, obiectivVizibil: boolean): boolean {
  if (eu.admin || obiectivVizibil) return true;
  return Boolean((eu.angajatId && a.responsabilId === eu.angajatId) || a.creatDe === eu.userId || (a.responsabilId && eu.subordonati.has(a.responsabilId)));
}
export function poateEditaActivitate(eu: Eu, a: ActivitateAcces): boolean {
  if (eu.admin) return true;
  return Boolean((eu.angajatId && a.responsabilId === eu.angajatId) || a.creatDe === eu.userId || (a.responsabilId && eu.subordonati.has(a.responsabilId)));
}
// Aprobarea o dă managerul responsabilului sau adminul; responsabilul simplu nu își aprobă propria activitate.
export function poateAproba(eu: Eu, a: ActivitateAcces): boolean {
  if (eu.admin) return true;
  return Boolean(a.responsabilId && eu.subordonati.has(a.responsabilId));
}

// Cine poate crea un obiectiv: adminul oricare; obiectivele strategice doar adminul; cele de echipă — managerii pentru ei și oamenii lor;
// cele individuale — fiecare pentru sine, iar managerul pentru oamenii lui.
export function poateCreaObiectiv(eu: Eu, nivel: string, responsabilId: string | null): boolean {
  if (eu.admin) return true;
  if (nivel === "strategic" || !responsabilId) return false;
  const pentruMine = Boolean(eu.angajatId && responsabilId === eu.angajatId);
  const pentruEchipa = eu.subordonati.has(responsabilId);
  if (nivel === "echipa") return eu.subordonati.size > 0 && (pentruMine || pentruEchipa);
  return pentruMine || pentruEchipa;
}
