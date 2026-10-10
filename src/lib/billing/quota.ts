import type { CustomPlanConfigSaved } from "./custom-plan";
import { PACKAGE_LIMITS, type OrgPackage } from "./packages";

// Cotele efective ale unei organizații — singurul loc care știe cum se combină
// PACKAGE_LIMITS (pachete fixe) cu CustomPlanConfigSaved (planul personalizat,
// unde utilizatorul își alege propriile cote, salvate pe organizație). Înainte
// de acest fișier, PACKAGE_LIMITS era citit DOAR în UI-ul de preț/checkout —
// nicăieri la crearea efectivă a unui utilizator/donator/companie, deci cotele
// nu însemnau nimic în practică.
export type LimiteEfective = {
  utilizatori: number | null;
  contactePf: number | null;
  companiiPj: number | null;
  campaniiActive: number | null;
  conturi230: number | null;
  rapoartePeLuna: number | null;
  voluntariActivitati: boolean;
  avatarComplet: boolean;
  domeniuPropriu: boolean;
};

export function getLimiteleEfective(pkg: OrgPackage, customPlanConfig: CustomPlanConfigSaved | null): LimiteEfective {
  if (pkg === "custom") {
    // Nu ar trebui să existe un org "custom" fără configurație salvată (se
    // salvează împreună la alegerea planului) — dar dacă totuși lipsește,
    // cădem pe cote minime în loc de nelimitat, ca să nu deschidem accidental
    // acces gratuit total.
    // Planul personalizat nu are cote pe campanii și funcții noi (nu se pot alege în constructor): rămân deschise.
    const deschise = { campaniiActive: null, conturi230: null, rapoartePeLuna: null, voluntariActivitati: true, avatarComplet: true, domeniuPropriu: true };
    if (!customPlanConfig) return { utilizatori: 1, contactePf: 0, companiiPj: 0, ...deschise };
    return {
      utilizatori: customPlanConfig.utilizatori,
      contactePf: customPlanConfig.contactePf,
      companiiPj: customPlanConfig.companiiPj,
      ...deschise,
    };
  }
  const limite = PACKAGE_LIMITS[pkg];
  return {
    utilizatori: limite.utilizatori,
    contactePf: limite.contactePf,
    companiiPj: limite.companiiPj,
    campaniiActive: limite.campaniiActive,
    conturi230: limite.conturi230,
    rapoartePeLuna: limite.rapoarteCompaniiPeLuna,
    voluntariActivitati: limite.voluntariActivitati,
    avatarComplet: limite.avatarComplet,
    domeniuPropriu: limite.domeniuPropriu,
  };
}

// `null` = nelimitat (convenția deja folosită în PackageLimits).
export function subCota(curent: number, limita: number | null): boolean {
  return limita === null || curent < limita;
}

// Numele pachetului în mesajele către utilizator.
const NUME_PACHET: Record<OrgPackage, string> = { trial: "de probă", start: "START", crestere: "CREȘTERE", impact: "IMPACT", custom: "personalizat" };

// Mesajele de limită: spun ce include pachetul și ce poate face utilizatorul (nu doar „eroare”).
export const mesajeCote = {
  campanii: (pkg: OrgPackage, limita: number) =>
    `Pachetul ${NUME_PACHET[pkg]} include ${limita} ${limita === 1 ? "campanie activă" : "campanii active"} în același timp. Închide o campanie sau treci la un pachet mai mare din Facturare.`,
  conturi230: (pkg: OrgPackage, limita: number) =>
    `Pachetul ${NUME_PACHET[pkg]} include ${limita} ${limita === 1 ? "cont" : "conturi"} de Formular 230. Treci la un pachet mai mare din Facturare ca să adaugi altele.`,
  rapoarte: (pkg: OrgPackage, limita: number) =>
    `Pachetul ${NUME_PACHET[pkg]} include ${limita} ${limita === 1 ? "raport" : "rapoarte"} de impact pe lună și le-ai folosit pe toate luna aceasta. Se reia din prima zi a lunii următoare, sau poți trece la un pachet mai mare din Facturare.`,
  voluntariActivitati: (pkg: OrgPackage) =>
    `Activitățile pe teren (ture, cod QR, remindere, adeverințe) sunt incluse începând cu pachetul CREȘTERE. Acum ai pachetul ${NUME_PACHET[pkg]}; sarcinile online rămân disponibile.`,
  domeniuPropriu: (pkg: OrgPackage) => `Domeniul propriu e inclus în pachetul IMPACT. Acum ai pachetul ${NUME_PACHET[pkg]}.`,
};
