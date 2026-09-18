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
// `design_familie`/`design_vitalitate`/`design_comunitate`/`design_adapost`/
// `design_natura`/`design_avant`/`design_orizont`/`design_muzeu` — 8 design-uri
// dedicate, structural proprii per domeniu (nu doar recolorate), cercetate pe
// baza unor identități vizuale reale (St. Jude, Susan G. Komen, Habitat for
// Humanity, WWF, Special Olympics, identitate muzeală) — vezi TPL_META din
// newsletter-pf.base.html. Fiecare domeniu recomandă întâi propriul design
// dedicat, apoi cel mai apropiat design generic existent ca a doua opțiune.
export const NEWSLETTER_PF_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["design_familie", "design_poveste", "design_acuarela"],
  sanatate: ["design_vitalitate", "design_radiografie", "design_acuarela"],
  social_incluziune: ["design_comunitate", "design_acuarela", "design_givewell"],
  animale: ["design_adapost", "design_givewell", "design_acuarela"],
  mediu: ["design_natura", "design_givewell", "design_acuarela"],
  sport: ["design_avant", "design_eveniment_elegant", "design_givewell"],
  educatie: ["design_orizont", "design_eveniment_elegant", "design_givewell"],
  cultura: ["design_muzeu", "design_eveniment_elegant", "design_givewell"],
  altele: [],
};

// Aceleași 8 design-uri dedicate ca la Newsletter PF (identică identitate
// vizuală, adaptată la placeholder-ele și tonul de companie-parteneră ale
// PJ — vezi TPL_META din newsletter-pj.base.html). Fiecare domeniu
// recomandă întâi propriul design dedicat, apoi cel mai apropiat design
// generic existent ca a doua/a treia opțiune.
export const NEWSLETTER_PJ_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["design_familie", "design_warm", "design_scrisoare"],
  sanatate: ["design_vitalitate", "design_scrisoare", "design_chitanta"],
  social_incluziune: ["design_comunitate", "design_scrisoare", "design_warm"],
  animale: ["design_adapost", "design_foto", "design_minimal"],
  mediu: ["design_natura", "design_foto", "design_minimal"],
  sport: ["design_avant", "design_bold", "design_manifest"],
  educatie: ["design_orizont", "design_certificat", "design_cronologie"],
  cultura: ["design_muzeu", "design_editorial", "design_gazeta"],
  altele: [],
};

// Generator one-pager — 21 layout-uri: cele 5 generice (`standard` + 4
// familii) plus câte DOUĂ dedicate per domeniu (copii/sanatate/social/
// animale/mediu/sport/educatie/cultura) — cercetate pe baza unor identități
// vizuale reale. Primul rând: St. Jude, Susan G. Komen, Habitat for
// Humanity, WWF, Special Olympics, identitate muzeală clasică. Al doilea
// rând (impuls/hotarare/cerc/garda/semnal/laur/pagina/galerie): UNICEF,
// American Cancer Society, United Way, RSPCA, Greenpeace, Laureus Sport for
// Good, Room to Read, identitate de galerie modernă — fiecare un layout
// structural propriu, nu doar recolorat. Fiecare domeniu recomandă întâi
// cele două design-uri dedicate, apoi cel mai apropiat design generic ca a
// treia opțiune. `altele` rămâne fără recomandare — implicit "standard".
export const ONE_PAGER_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["copii", "impuls", "warm"],
  sanatate: ["sanatate", "hotarare", "warm"],
  social_incluziune: ["social", "cerc", "warm"],
  animale: ["animale", "garda", "minimal"],
  mediu: ["mediu", "semnal", "minimal"],
  sport: ["sport", "laur", "bold"],
  educatie: ["educatie", "pagina", "bold"],
  cultura: ["cultura", "galerie", "editorial"],
  altele: [],
};
