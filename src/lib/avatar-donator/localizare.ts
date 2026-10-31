// Variantele localizate ale constantelor din tipuri.ts / intrebari.ts / motor.ts. În română se întorc chiar constantele din bibliotecă
// (neschimbate); în engleză, aceleași structuri cu etichetele din dicționar, potrivite după cheie sau număr (nu după textul românesc).

import type { Locale } from "../i18n/config";
import { AVATAR_LIB_EN } from "../i18n/dictionaries/avatar-donator-ui-3";
import { ETAPE, type Etapa } from "./intrebari";
import { DIMENSIUNI_MATURITATE } from "./motor";
import { CANAL_STATISTICI_IMPLICIT, CHECKLIST_CONFORMITATE, CONVERSII, GRADE, PROFILE, REZUMAT_CAMPURI, TIPURI_FISA, type CanalId } from "./tipuri";

const EN = AVATAR_LIB_EN;

export const gradeLoc = (l: Locale) => (l === "ro" ? GRADE : GRADE.map((g) => ({ ...g, label: EN.grade[g.key] ?? g.label })));

export const conversiiLoc = (l: Locale) => (l === "ro" ? CONVERSII : CONVERSII.map((c) => ({ ...c, label: EN.conversii[c.key] ?? c.label })));

export const statisticiImplicitEticheta = (id: CanalId, l: Locale) => (l === "ro" ? CANAL_STATISTICI_IMPLICIT[id].eticheta : (EN.canalStatistici[id] ?? CANAL_STATISTICI_IMPLICIT[id].eticheta));

export const profileLoc = (l: Locale) =>
  l === "ro"
    ? PROFILE
    : PROFILE.map((p) => ({ ...p, titlu: EN.profile[p.id]?.titlu ?? p.titlu, criterii: p.criterii.map((c) => ({ ...c, label: EN.profile[p.id]?.criterii[c.key] ?? c.label })) }));

export const rezumatCampuriLoc = (l: Locale) => (l === "ro" ? REZUMAT_CAMPURI : REZUMAT_CAMPURI.map((c) => ({ ...c, label: EN.rezumat[c.key] ?? c.label })));

export const checklistLoc = (l: Locale) => (l === "ro" ? CHECKLIST_CONFORMITATE : CHECKLIST_CONFORMITATE.map((c) => ({ ...c, text: EN.checklist[c.key] ?? c.text })));

export const tipuriFisaLoc = (l: Locale) => (l === "ro" ? TIPURI_FISA : TIPURI_FISA.map((t) => ({ ...t, label: EN.tipuriFisa[t.key]?.label ?? t.label, descriere: EN.tipuriFisa[t.key]?.descriere ?? t.descriere })));

export const dimensiuneEticheta = (key: string, labelRo: string, l: Locale) => (l === "ro" ? labelRo : (EN.dimensiuni[key] ?? labelRo));

export const dimensiuniMaturitateLoc = (l: Locale) => DIMENSIUNI_MATURITATE.map((d) => ({ ...d, label: dimensiuneEticheta(d.key, d.label, l) }));

export const etapeLoc = (l: Locale): Etapa[] =>
  l === "ro"
    ? ETAPE
    : ETAPE.map((e) => ({
        ...e,
        titlu: EN.etape[e.nr] ?? e.titlu,
        intrebari: e.intrebari.map((q) => {
          const t = EN.intrebari[q.nr];
          return t ? { ...q, text: t[0], prompt: t[1] } : q;
        }),
      }));
