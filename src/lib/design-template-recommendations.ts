import type { DomeniuActivitate } from "./campaign-templates";

// Ordinea de RECOMANDARE a stilurilor de design deja existente în galeriile
// Newsletter PF/PJ (vezi TPL_META din *.base.html), per domeniu de
// activitate — NU o listă închisă: toate stilurile rămân mereu disponibile,
// la fel ca înainte. Doar cele potrivite domeniului urcă primele în galerie
// și primesc un semn "Recomandat". Nu ating stilurile de CONȚINUT (apel/
// urgent la PF; d177/propunere/multumire/raport/eveniment/bunvenit la PJ) —
// alea țin de tipul mesajului, nu de identitatea vizuală a domeniului.
//
// Curatoriat inițial pe baza descrierilor tematice ale fiecărui stil și a
// familiilor de layout din campaign-templates.ts (cald-protector/natural-
// ancorat/indraznet-dinamic/elegant-editorial) — ajustează liber listele,
// designul rămâne la tine.
export const NEWSLETTER_PF_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["design_poveste", "design_acuarela", "design_givewell"],
  sanatate: ["design_radiografie", "design_acuarela", "design_givewell"],
  social_incluziune: ["design_acuarela", "design_givewell", "design_eveniment_elegant"],
  animale: ["design_givewell", "design_acuarela"],
  mediu: ["design_givewell", "design_acuarela"],
  sport: ["design_eveniment_elegant", "design_givewell"],
  educatie: ["design_eveniment_elegant", "design_givewell"],
  cultura: ["design_eveniment_elegant", "design_givewell"],
  altele: [],
};

export const NEWSLETTER_PJ_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["design_warm", "design_scrisoare", "design_foto"],
  sanatate: ["design_scrisoare", "design_chitanta", "design_minimal"],
  social_incluziune: ["design_scrisoare", "design_warm", "design_chitanta"],
  animale: ["design_foto", "design_minimal"],
  mediu: ["design_foto", "design_minimal"],
  sport: ["design_bold", "design_manifest"],
  educatie: ["design_certificat", "design_cronologie", "design_bold"],
  cultura: ["design_editorial", "design_gazeta", "design_cronologie"],
  altele: [],
};

// Generator one-pager — 13 layout-uri: cele 5 generice (`standard` + 4
// familii) plus câte UNUL nou, dedicat, per domeniu (copii/sanatate/social/
// animale/mediu/sport/educatie/cultura) — cercetat pe baza unor identități
// vizuale reale (St. Jude, Susan G. Komen, Habitat for Humanity, WWF,
// Special Olympics, identitate muzeală) și construit ca layout structural
// propriu, nu doar recolorat. Fiecare domeniu recomandă întâi propriul
// design dedicat, apoi cel mai apropiat design generic ca a doua opțiune.
// `altele` rămâne fără recomandare — implicit "standard".
export const ONE_PAGER_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["copii", "warm"],
  sanatate: ["sanatate", "warm"],
  social_incluziune: ["social", "warm"],
  animale: ["animale", "minimal"],
  mediu: ["mediu", "minimal"],
  sport: ["sport", "bold"],
  educatie: ["educatie", "bold"],
  cultura: ["cultura", "editorial"],
  altele: [],
};
