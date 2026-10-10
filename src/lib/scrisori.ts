// Scrisori oficiale ale organizației: datele de intrare, curățarea lor și tipurile de scrisoare (cu text de pornire).
import { ACCENTE_IMPLICITE, curataAccente, iso, paragrafeDinText, linieDinText, text, textLung, urlLogo, type Accente } from "./documente-comun";
import { dataLunga } from "./raport-impact";

export const MODELE_SCRISORI = [
  { id: "clasic", eticheta: "Clasic", hint: "Hârtie cu antet serif, linie fină și subsol cu datele organizației" },
  { id: "modern", eticheta: "Modern", hint: "Bară verticală colorată și titlu mare, sans" },
  { id: "banda", eticheta: "Bandă", hint: "Antet pe bandă colorată, cu logo-urile în alb" },
  { id: "elegant", eticheta: "Elegant", hint: "Antet centrat, separator ornamental, scris italic" },
  { id: "executiv", eticheta: "Executiv", hint: "Antet aliniat la dreapta, sobru, pentru scrisori oficiale" },
  { id: "lateral", eticheta: "Lateral", hint: "Coloană laterală cu datele organizației, scrisoarea în dreapta" },
  { id: "minimal", eticheta: "Minimal", hint: "Foarte mult spațiu alb, doar esențialul" },
  { id: "corporate", eticheta: "Corporate", hint: "Bară închisă sus și jos, pentru parteneri mari" },
  { id: "inima", eticheta: "Inimă", hint: "Inimă cu puls ca filigran, identitatea organizației" },
  { id: "colt", eticheta: "Colț", hint: "Formă colorată în colț, aspect modern" },
  { id: "dublu-logo", eticheta: "Dublu logo", hint: "Logo-ul organizației și al destinatarului, unul lângă altul" },
  { id: "memo", eticheta: "Memo", hint: "Antet compact: De la, Către, Subiect" },
  { id: "registru", eticheta: "Registru", hint: "Număr de înregistrare în casetă, aspect de instituție" },
  { id: "postal", eticheta: "Poștal", hint: "Adresa destinatarului la poziția ferestrei de plic" },
  { id: "cald", eticheta: "Cald", hint: "Hârtie ușor colorată, colțuri rotunjite, semnătură cursivă" },
] as const;
export type ModelScrisoare = (typeof MODELE_SCRISORI)[number]["id"];

export type TipScrisoare = "multumire" | "sponsorizare" | "parteneriat" | "invitatie" | "confirmare" | "libera";

export const TIPURI_SCRISOARE: { id: TipScrisoare; eticheta: string; subiect: string; formulaAdresare: string; corp: string; formulaFinala: string }[] = [
  {
    id: "multumire",
    eticheta: "Scrisoare de mulțumire",
    subiect: "Mulțumiri pentru sprijinul acordat",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "În numele {ORGANIZATIE}, vă mulțumim pentru sprijinul acordat{SUMA_TXT}{PROIECT_TXT}. Contribuția dumneavoastră a fost direcționată către proiectele convenite, iar rezultatele vi le prezentăm în raportul atașat.\n\nVă vom trimite o actualizare la finalul fiecărui proiect și rămânem la dispoziția dumneavoastră pentru orice întrebare sau document justificativ.",
    formulaFinala: "Cu recunoștință,",
  },
  {
    id: "sponsorizare",
    eticheta: "Solicitare de sponsorizare",
    subiect: "Propunere de sponsorizare",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "Vă scriem din partea {ORGANIZATIE} pentru a vă invita să susțineți un proiect pentru oamenii pe care îi sprijinim.\n\nSusținerea se poate face prin contract de sponsorizare, în condițiile Legii nr. 32/1994 și ale Codului fiscal; vă recomandăm să discutați tratamentul fiscal cu contabilul dumneavoastră. Contractul se semnează înainte de plată, iar la final vă transmitem un raport despre ce s-a realizat cu sprijinul dumneavoastră.\n\nVă propunem o întâlnire scurtă, la o dată potrivită pentru dumneavoastră, în care să vă prezentăm proiectul.",
    formulaFinala: "Cu respect,",
  },
  {
    id: "parteneriat",
    eticheta: "Propunere de parteneriat",
    subiect: "Propunere de parteneriat",
    formulaAdresare: "Stimați reprezentanți ai {FIRMA},",
    corp: "{ORGANIZATIE} vă propune un parteneriat pe termen lung între {FIRMA} și organizația noastră.\n\nPutem construi împreună proiecte comune, campanii cu implicarea angajaților și rapoarte periodice despre ce s-a realizat.\n\nVă rugăm să ne spuneți când vi se potrivește o discuție, pentru a stabili împreună pașii următori.",
    formulaFinala: "Cu stimă,",
  },
  {
    id: "invitatie",
    eticheta: "Invitație la eveniment",
    subiect: "Invitație la eveniment",
    formulaAdresare: "Stimați reprezentanți ai {FIRMA},",
    corp: "{ORGANIZATIE} are plăcerea de a vă invita la evenimentul nostru, un prilej de a ne cunoaște mai bine și de a vedea împreună rezultatele ultimilor ani.\n\nDetaliile (data, ora și locul) le găsiți mai jos sau le puteți afla de la echipa noastră. Prezența dumneavoastră ar însemna mult pentru noi.\n\nVă rugăm să ne confirmați participarea, pentru a ne pregăti pentru dumneavoastră.",
    formulaFinala: "Cu stimă,",
  },
  {
    id: "confirmare",
    eticheta: "Confirmare de primire",
    subiect: "Confirmare de primire a sprijinului",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "Prin prezenta confirmăm că {ORGANIZATIE} a primit sprijinul acordat de {FIRMA}{SUMA_TXT}{PROIECT_TXT} și vă mulțumim pentru încredere.\n\nSprijinul va fi folosit conform destinației convenite prin contract; dacă apar modificări sau un surplus, vă informăm și stabilim împreună cum se folosește. Pentru documente suplimentare (contract, raport, dovezi), vă stăm la dispoziție.\n\nAceastă scrisoare are caracter informativ și nu ține loc de contract sau de document fiscal.",
    formulaFinala: "Cu respect,",
  },
  {
    id: "libera",
    eticheta: "Scrisoare liberă",
    subiect: "",
    formulaAdresare: "Stimată doamnă / Stimate domnule {DESTINATAR},",
    corp: "",
    formulaFinala: "Cu respect,",
  },
];

export type DateScrisoare = Accente & {
  model: ModelScrisoare;
  logoOng: string;
  logoDestinatar: string;
  tip: TipScrisoare;
  antetNume: string; // numele organizației din antet
  antetLinii: string; // adresă, CIF, IBAN, contact: câte un rând
  loc: string;
  data: string; // YYYY-MM-DD
  nrInregistrare: string;
  destNume: string;
  destFunctie: string;
  destFirma: string;
  destAdresa: string;
  formulaAdresare: string;
  subiect: string;
  corp: string;
  formulaFinala: string;
  semnNume: string;
  semnFunctie: string;
  ps: string;
  anexe: string;
  suma: string; // pentru {SUMA}, ex. „5.000 lei”
  proiect: string; // pentru {PROIECT}
  an: string; // pentru {AN}
};

export type InfoOrganizatie = { nume: string; cif: string | null; adresa: string | null; judet: string | null; iban: string | null; logo: string; culoare: string | null };

export function antetDinOrganizatie(o: InfoOrganizatie): string {
  // Județul se adaugă doar dacă adresa nu îl conține deja (ex. „…, București” + județul „București”).
  const adresa = o.adresa && o.judet && !o.adresa.toLowerCase().includes(o.judet.toLowerCase()) ? `${o.adresa}, ${o.judet}` : o.adresa;
  return [adresa, o.cif && `CIF: ${o.cif}`, o.iban && `IBAN: ${o.iban}`].filter(Boolean).join("\n");
}

export function dateScrisoareGoale(o: { nume: string; antetLinii?: string; logo?: string; acc?: Accente }, azi: string): DateScrisoare {
  const t = TIPURI_SCRISOARE[0];
  return {
    ...(o.acc ?? ACCENTE_IMPLICITE),
    model: "clasic",
    logoOng: o.logo ?? "",
    logoDestinatar: "",
    tip: t.id,
    antetNume: o.nume,
    antetLinii: o.antetLinii ?? "",
    loc: "",
    data: azi,
    nrInregistrare: "",
    destNume: "",
    destFunctie: "",
    destFirma: "",
    destAdresa: "",
    formulaAdresare: t.formulaAdresare,
    subiect: t.subiect,
    corp: t.corp,
    formulaFinala: t.formulaFinala,
    semnNume: "",
    semnFunctie: "",
    ps: "",
    anexe: "",
    suma: "",
    proiect: "",
    an: "",
  };
}

// Orice vine din formular sau din ciornă trece pe aici: lungimi, tipuri, culori și logo-uri sigure.
export function curataDateScrisoare(brut: unknown, azi = ""): DateScrisoare {
  const b = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  return {
    ...curataAccente(b),
    model: MODELE_SCRISORI.some((m) => m.id === b.model) ? (b.model as ModelScrisoare) : "clasic",
    logoOng: urlLogo(b.logoOng),
    logoDestinatar: urlLogo(b.logoDestinatar),
    tip: TIPURI_SCRISOARE.some((t) => t.id === b.tip) ? (b.tip as TipScrisoare) : "libera",
    antetNume: text(b.antetNume, 160),
    antetLinii: textLung(b.antetLinii, 600),
    loc: text(b.loc, 80),
    data: iso(b.data) || azi,
    nrInregistrare: text(b.nrInregistrare, 60),
    destNume: text(b.destNume, 120),
    destFunctie: text(b.destFunctie, 120),
    destFirma: text(b.destFirma, 160),
    destAdresa: textLung(b.destAdresa, 300),
    formulaAdresare: text(b.formulaAdresare, 160),
    subiect: text(b.subiect, 200),
    corp: textLung(b.corp, 6000),
    formulaFinala: text(b.formulaFinala, 80),
    semnNume: text(b.semnNume, 120),
    semnFunctie: text(b.semnFunctie, 120),
    ps: textLung(b.ps, 600),
    anexe: textLung(b.anexe, 600),
    suma: text(b.suma, 40),
    proiect: text(b.proiect, 160),
    an: text(b.an, 4),
  };
}

// {DESTINATAR}, {FIRMA}, {ORGANIZATIE}, {DATA}, {SUBIECT}, {SEMNATAR}, {SUMA}, {PROIECT}, {AN} se completează la randare.
// {SUMA_TXT} și {PROIECT_TXT} adaugă fraza „ în valoare de …” / „, pentru proiectul …” doar dacă datele există.
export function valoriScrisoare(d: DateScrisoare): Record<string, string> {
  return {
    DESTINATAR: d.destNume || "destinatar",
    FIRMA: d.destFirma || "compania dumneavoastră",
    ORGANIZATIE: d.antetNume || "organizația noastră",
    DATA: dataLunga(d.data),
    SUBIECT: d.subiect,
    SEMNATAR: d.semnNume,
    SUMA: d.suma,
    PROIECT: d.proiect,
    AN: d.an,
    SUMA_TXT: d.suma ? ` în valoare de ${d.suma}` : "",
    PROIECT_TXT: d.proiect ? `, pentru proiectul „${d.proiect}”` : "",
  };
}
export const corpScrisoare = (d: DateScrisoare) => paragrafeDinText(d.corp, valoriScrisoare(d));
export const liniiScrisoare = (brut: string, d: DateScrisoare) => linieDinText(brut, valoriScrisoare(d));

export function dateScrisoareExemplu(o: { nume: string; antetLinii?: string; logo?: string; acc?: Accente }, azi: string): DateScrisoare {
  return {
    ...dateScrisoareGoale(o, azi),
    loc: "București",
    nrInregistrare: "Nr. 125 / " + azi.split("-").reverse().join(".").slice(0, 10),
    destNume: "Maria Ionescu",
    destFunctie: "Director general",
    destFirma: "Exemplu Construct SRL",
    destAdresa: "Str. Exemplului nr. 10\nCluj-Napoca",
    semnNume: "Vlad Popescu",
    semnFunctie: "Președinte",
    anexe: "Raportul de impact 2025–2026",
    suma: "84.300 lei",
    proiect: "Echipament pentru cardiologie pediatrică",
    an: "2026",
  };
}
