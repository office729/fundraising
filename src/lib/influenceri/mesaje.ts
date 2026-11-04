// Influenceri — mesajele către creatori: instrucțiunile pentru AI, citirea răspunsului lui și șablonul de rezervă (fără AI). Fără importuri de valori.
// Mesajele sunt în limba română (creatorii sunt din România); colega le citește, le editează și le trimite ea, manual, din contul organizației.

export type VarianteMesaj = { instagram: string; facebook: string; colaborare: string };
export type CheieVarianta = keyof VarianteMesaj;
export const CHEI_VARIANTE: readonly CheieVarianta[] = ["instagram", "facebook", "colaborare"];

// GDPR (art. 14): fiecare mesaj spune scurt de unde avem datele și că persoana poate refuza / opri contactările. Fraza e fixă, în română (mesajele pentru creatori sunt mereu în română):
// instagram e în registrul „tu” (DM), celelalte în „dumneavoastră”. Șablonul o conține; răspunsul AI primește fraza în instrucțiuni și, dacă lipsește, i se adaugă.
export const FRAZA_INFORMARE: Record<CheieVarianta, string> = {
  instagram: "Ți-am găsit profilul public și de aceea îți scriu. Dacă nu vrei să te mai contactăm, spune-ne și oprim mesajele.",
  facebook: "Am găsit profilul dumneavoastră public și de aceea vă scriem. Dacă nu doriți să mai fiți contactat(ă), spuneți-ne și oprim mesajele.",
  colaborare: "Am găsit profilul dumneavoastră public și de aceea vă scriem. Dacă nu doriți să mai fiți contactat(ă), spuneți-ne și oprim mesajele.",
};

// Adaugă fraza de informare la sfârșitul mesajului dacă lipsește (exact, ignorând spațiile).
export function asiguraInformare(mesaj: string, varianta: CheieVarianta): string {
  const m = mesaj.trim();
  const fraza = FRAZA_INFORMARE[varianta];
  return m.replace(/\s+/g, " ").includes(fraza) ? m : `${m}\n\n${fraza}`.trim();
}

// Datele despre campanie trimise AI-ului: doar ce e deja public pe pagina campaniei (titlul, județul, suma rămasă) și linkul unic.
// Povestea campaniei NU pleacă (poate conține diagnostic sau alte date de sănătate); contactul influencerului, nota și emailul nu pleacă nici ele.
export type DateMesaj = {
  influencer: { nume: string; categorie: string; domeniu: string | null; oras: string | null; tara: string | null };
  campanie: { titlu: string; judet: string | null; ramasLei: number | null };
  link: string;
  expeditor: string; // prenumele colegei care trimite
  organizatie: string;
  indicatii: string | null;
};

export function prenume(nume: string | null | undefined): string {
  const p = (nume ?? "").trim().split(/\s+/)[0] ?? "";
  return p || "Echipa";
}

export function instructiuniAi(organizatie: string): string {
  return [
    `Ești coordonatorul de relații cu creatorii de conținut al organizației „${organizatie}” (ONG din România care strânge fonduri pentru cauze sociale și medicale).`,
    "Scrii mesaje personale, în limba română, către un creator de conținut, ca să-l rogi să distribuie (voluntar, fără plată) o campanie a organizației.",
    "Reguli obligatorii:",
    "- Ton cald, respectuos, sincer, fără presiune și fără vinovăție; fără superlative goale și fără clișee de marketing.",
    "- Personalizează după numele și domeniul creatorului (o frază scurtă, credibilă — nu inventa postări, colaborări sau detalii pe care nu le ai).",
    "- Folosește DOAR datele campaniei primite (titlu, județ, suma rămasă dacă e dată, linkul). Nu inventa detalii medicale, termene sau cifre și nu presupune diagnostice.",
    "- Include exact linkul primit, o singură dată. Fără hashtaguri, fără emoji excesive (maxim unul).",
    "- Spune clar ce cerem (o distribuire / un story) și că e în regulă dacă nu poate.",
    "- Nu promite nimic în schimb (nici bani, nici reclamă).",
    "- Include în fiecare mesaj, copiată EXACT, fără s-o reformulezi, fraza de informare a variantei respective (sursa datelor și dreptul de a refuza), înainte de semnătură:",
    `  instagram: ${FRAZA_INFORMARE.instagram}`,
    `  facebook: ${FRAZA_INFORMARE.facebook}`,
    `  colaborare: ${FRAZA_INFORMARE.colaborare}`,
    "- „indicatii_coleg” este doar o sugestie despre ton sau context; nu repeta în mesaj date personale din ea.",
    "Formate:",
    "- instagram: DM Instagram scurt, 350–550 de caractere.",
    "- facebook: mesaj Facebook Messenger, 500–800 de caractere, puțin mai personal.",
    "- colaborare: propunere de colaborare pe termen lung (distribuiri ocazionale ale campaniilor urgente, recunoaștere ca ambasador al organizației, fără obligații), 700–1100 de caractere.",
    "Semnează cu prenumele colegului care trimite și numele organizației.",
    'Răspunde DOAR cu JSON valid: {"instagram": string, "facebook": string, "colaborare": string}',
  ].join("\n");
}

// `d.indicatii` trebuie să sosească deja curățat de emailuri, telefoane și conturi (curataPii din lib/curata-pii.ts, aplicat în acțiunea care construiește DateMesaj);
// fișierul de față rămâne fără importuri de valori ca să poată fi testat direct.
export function cerereAi(d: DateMesaj): string {
  const date = {
    creator: { nume: d.influencer.nume, categorie: d.influencer.categorie, domeniu: d.influencer.domeniu, oras: d.influencer.oras, tara: d.influencer.tara },
    campanie: { titlu: d.campanie.titlu, judet: d.campanie.judet, suma_ramasa_lei: d.campanie.ramasLei, link: d.link },
    expeditor: d.expeditor,
    indicatii_coleg: d.indicatii ? d.indicatii.slice(0, 400) : null,
  };
  return `Date (JSON):\n${JSON.stringify(date, null, 1)}`;
}

// Mesajul trebuie să conțină linkul unic al influencerului (altfel rezultatul nu se poate măsura): dacă lipsește, se adaugă la sfârșit.
export function asiguraLink(mesaj: string, link: string): string {
  const m = mesaj.trim();
  return m.includes(link) ? m : `${m}\n\n${link}`.trim();
}

// Citește răspunsul modelului: JSON (eventual în ```), cu cele trei variante. Altfel null — apelantul cade pe șablon.
export function citesteVariante(raspuns: string, link: string): VarianteMesaj | null {
  const curat = raspuns.replace(/```(?:json)?/gi, "");
  const a = curat.indexOf("{");
  const b = curat.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let j: unknown;
  try {
    j = JSON.parse(curat.slice(a, b + 1));
  } catch {
    return null;
  }
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const ig = typeof o.instagram === "string" ? o.instagram.trim() : "";
  const fb = typeof o.facebook === "string" ? o.facebook.trim() : "";
  if (!ig || !fb) return null;
  const col = typeof o.colaborare === "string" && o.colaborare.trim() ? o.colaborare.trim() : fb;
  // Informarea întâi, linkul la urmă (linkul unic rămâne ultimul element al mesajului, ca până acum).
  return {
    instagram: asiguraLink(asiguraInformare(ig, "instagram"), link),
    facebook: asiguraLink(asiguraInformare(fb, "facebook"), link),
    colaborare: asiguraLink(asiguraInformare(col, "colaborare"), link),
  };
}

// Varianta fără AI (contul Anthropic neconectat sau răspuns neutilizabil): șablon simplu, completat cu datele campaniei.
export function sablonMesaje(d: DateMesaj): VarianteMesaj {
  const pren = prenume(d.expeditor);
  const cine = d.campanie.titlu;
  const suma = d.campanie.ramasLei ? ` Mai avem de strâns ${Math.round(d.campanie.ramasLei).toLocaleString("ro-RO")} lei.` : "";
  const nume = d.influencer.nume;
  const org = d.organizatie;
  return {
    instagram: `Bună, ${nume}! Sunt ${pren} de la ${org}. Strângem fonduri pentru campania „${cine}”.${suma} Ne-ar ajuta enorm un story cu linkul campaniei: ${d.link}\n${FRAZA_INFORMARE.instagram}\nDacă nu poți, înțelegem perfect. Mulțumim!`,
    facebook: `Bună ziua, ${nume}!\n\nMă numesc ${pren} și lucrez la ${org}. Acum strângem fonduri pentru campania „${cine}”.${suma}\n\nComunitatea dumneavoastră ar putea face diferența: o singură distribuire ne poate aduce donatori noi. Linkul campaniei este: ${d.link}\n\n${FRAZA_INFORMARE.facebook}\n\nVă mulțumim din suflet, chiar dacă nu puteți de această dată.\n${pren}, ${org}`,
    colaborare: `Bună ziua, ${nume}!\n\nSunt ${pren} de la ${org}. Construim o rețea de ambasadori: creatori de conținut care, din când în când, distribuie o campanie urgentă. Fără obligații și fără plată — doar atunci când puteți.\n\nAcum strângem pentru campania „${cine}”.${suma} Linkul campaniei: ${d.link}\n\nAmbasadorii primesc recunoașterea organizației și un raport cu impactul distribuirilor. V-ar interesa?\n\n${FRAZA_INFORMARE.colaborare}\n\nCu recunoștință,\n${pren}, ${org}`,
  };
}
