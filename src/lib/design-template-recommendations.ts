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
// Al doilea design dedicat per domeniu (impuls/hotarare/cerc/garda/semnal/
// laur/pagina/galerie) — UNICEF, American Cancer Society, United Way,
// RSPCA, Greenpeace, Laureus Sport for Good, Room to Read, identitate de
// galerie modernă. Al treilea design dedicat (scut/stea/blazon/refugiu/
// insigna/start/creion/cortina) — Save the Children, Make-A-Wish, Armata
// Salvării, Best Friends Animal Society, Sierra Club, Right To Play,
// Pencils of Promise, eleganța unei săli de spectacol. Fiecare domeniu
// recomandă acum toate cele trei design-uri dedicate, apoi cel mai
// apropiat design generic existent.
export const NEWSLETTER_PF_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["design_familie", "design_impuls", "design_scut", "design_poveste"],
  sanatate: ["design_vitalitate", "design_hotarare", "design_stea", "design_radiografie"],
  social_incluziune: ["design_comunitate", "design_cerc", "design_blazon", "design_acuarela"],
  animale: ["design_adapost", "design_garda", "design_refugiu", "design_givewell"],
  mediu: ["design_natura", "design_semnal", "design_insigna", "design_givewell"],
  sport: ["design_avant", "design_laur", "design_start", "design_eveniment_elegant"],
  educatie: ["design_orizont", "design_pagina", "design_creion", "design_eveniment_elegant"],
  cultura: ["design_muzeu", "design_galerie", "design_cortina", "design_eveniment_elegant"],
  altele: [],
};

// Aceleași 8 design-uri dedicate ca la Newsletter PF (identică identitate
// vizuală, adaptată la placeholder-ele și tonul de companie-parteneră ale
// PJ — vezi TPL_META din newsletter-pj.base.html). Fiecare domeniu
// recomandă întâi propriul design dedicat, apoi cel mai apropiat design
// generic existent ca a doua/a treia opțiune.
// Al doilea design dedicat per domeniu — aceleași 8 identități noi ca la
// Newsletter PF (impuls/hotarare/cerc/garda/semnal/laur/pagina/galerie).
export const NEWSLETTER_PJ_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["design_familie", "design_impuls", "design_warm"],
  sanatate: ["design_vitalitate", "design_hotarare", "design_scrisoare"],
  social_incluziune: ["design_comunitate", "design_cerc", "design_scrisoare"],
  animale: ["design_adapost", "design_garda", "design_foto"],
  mediu: ["design_natura", "design_semnal", "design_foto"],
  sport: ["design_avant", "design_laur", "design_bold"],
  educatie: ["design_orizont", "design_pagina", "design_certificat"],
  cultura: ["design_muzeu", "design_galerie", "design_editorial"],
  altele: [],
};

// Generator one-pager — 29 layout-uri: cele 5 generice (`standard` + 4
// familii) plus câte TREI dedicate per domeniu (copii/sanatate/social/
// animale/mediu/sport/educatie/cultura) — cercetate pe baza unor identități
// vizuale reale. Primul rând: St. Jude, Susan G. Komen, Habitat for
// Humanity, WWF, Special Olympics, identitate muzeală clasică. Al doilea
// rând (impuls/hotarare/cerc/garda/semnal/laur/pagina/galerie): UNICEF,
// American Cancer Society, United Way, RSPCA, Greenpeace, Laureus Sport for
// Good, Room to Read, identitate de galerie modernă. Al treilea rând
// (scut/stea/blazon/refugiu/insigna/start/creion/cortina): Save the
// Children, Make-A-Wish, Armata Salvării, Best Friends Animal Society,
// Sierra Club, Right To Play, Pencils of Promise, eleganța unei săli de
// spectacol — fiecare un layout structural propriu, nu doar recolorat.
// Fiecare domeniu recomandă întâi cele trei design-uri dedicate, apoi cel
// mai apropiat design generic. `altele` rămâne fără recomandare.
export const ONE_PAGER_DESIGN_RECOMANDAT: Record<DomeniuActivitate, string[]> = {
  copii: ["copii", "impuls", "scut", "warm"],
  sanatate: ["sanatate", "hotarare", "stea", "warm"],
  social_incluziune: ["social", "cerc", "blazon", "warm"],
  animale: ["animale", "garda", "refugiu", "minimal"],
  mediu: ["mediu", "semnal", "insigna", "minimal"],
  sport: ["sport", "laur", "start", "bold"],
  educatie: ["educatie", "pagina", "creion", "bold"],
  cultura: ["cultura", "galerie", "cortina", "editorial"],
  altele: [],
};
