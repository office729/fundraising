// Scrisori oficiale ale organizației: datele de intrare, curățarea lor și tipurile de scrisoare (cu text de pornire).
import { ACCENTE_IMPLICITE, curataAccente, iso, paragrafeDinText, linieDinText, text, textLung, urlLogo, type Accente } from "./documente-comun";
import { curataMotiv, motivImplicit, type Motiv } from "./motiv";
import { dataLunga } from "./raport-impact";

export const MODELE_SCRISORI = [
  { id: "clasic", eticheta: "Clasic", hint: "Hârtie cu antet serif, linie fină și subsol cu datele organizației" },
  { id: "modern", eticheta: "Modern", hint: "Bară verticală colorată și titlu mare, sans" },
  { id: "banda", eticheta: "Bandă", hint: "Antet pe bandă colorată, cu logo-urile în alb" },
  { id: "elegant", eticheta: "Elegant", hint: "Antet centrat, separator ornamental, scris italic" },
  { id: "executiv", eticheta: "Executiv", hint: "Antet aliniat la dreapta, sobru, pentru scrisori oficiale" },
  { id: "lateral", eticheta: "Lateral", hint: "Coloană laterală cu datele organizației, scrisoarea în dreapta" },
  { id: "minimal", eticheta: "Minimal", hint: "Foarte mult spațiu alb, doar esențialul" },
  { id: "tipografic", eticheta: "Tipografic", hint: "Numele organizației mare, în serif, cu datele într-o coloană la dreapta" },
  { id: "inima", eticheta: "Inimă", hint: "Inimă cu puls ca filigran, identitatea organizației" },
  { id: "margine", eticheta: "Margine de notițe", hint: "Data, destinatarul și subiectul în marginea din stânga, textul în dreapta" },
  { id: "dublu-logo", eticheta: "Dublu logo", hint: "Logo-ul organizației și al destinatarului, unul lângă altul" },
  { id: "memo", eticheta: "Memo", hint: "Antet compact: De la, Către, Subiect" },
  { id: "registru", eticheta: "Registru", hint: "Număr de înregistrare în casetă, aspect de instituție" },
  { id: "postal", eticheta: "Poștal", hint: "Adresa destinatarului la poziția ferestrei de plic" },
  { id: "cadru", eticheta: "Cadru fin", hint: "Ramă dublă subțire, antet centrat, pentru scrisori solemne" },
] as const;
export type ModelScrisoare = (typeof MODELE_SCRISORI)[number]["id"];

export type TipScrisoare = "multumire" | "multumire-rapida" | "sponsorizare" | "oferta" | "follow-up" | "reinnoire" | "reactivare" | "parteneriat" | "invitatie" | "confirmare" | "libera";

// Mecanismul fiscal ales explicit de utilizator: abia atunci scrisoarea primește un paragraf despre el (fără cifre sau termene, care se schimbă).
export const MECANISME_SCRISOARE = [
  { id: "", eticheta: "Nu menționez mecanismul fiscal" },
  { id: "sponsorizare", eticheta: "Sponsorizare" },
  { id: "d177", eticheta: "Redirecționare din impozitul pe profit (Declarația 177)" },
] as const;
export type MecanismScrisoare = (typeof MECANISME_SCRISOARE)[number]["id"];
const PARAGRAF_FISCAL: Record<MecanismScrisoare, string> = {
  "": "",
  sponsorizare: "Sponsorizarea poate fi scăzută din impozitul pe profit doar dacă sunt îndeplinite condițiile legale (contract scris, organizație eligibilă, limitele din Codul fiscal). Vă rugăm să le confirmați cu contabilul dumneavoastră.",
  d177: "Dacă firma dumneavoastră datorează impozit pe profit, o parte din acesta poate fi redirecționată către organizații eligibile prin Declarația 177, în condițiile și la termenele prevăzute de lege. Le puteți verifica pe anaf.ro sau cu contabilul dumneavoastră.",
};

export const TIPURI_SCRISOARE: { id: TipScrisoare; eticheta: string; subiect: string; formulaAdresare: string; corp: string; formulaFinala: string }[] = [
  {
    id: "multumire",
    eticheta: "Scrisoare de mulțumire",
    subiect: "Mulțumiri pentru sprijinul acordat",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "În numele {ORGANIZATIE}, vă mulțumim pentru sprijinul acordat{SUMA_TXT}{PROIECT_TXT}. Sprijinul dumneavoastră contribuie la proiectele convenite, iar rezultatele vi le prezentăm în raportul atașat.\n\nVă vom ține la curent cu rezultatele, în forma și la termenele pe care le stabilim împreună, și rămânem la dispoziția dumneavoastră pentru orice întrebare.\n\nPentru {AN_URMATOR}, vă invităm la o discuție despre cum putem continua împreună: vă propunem o întâlnire scurtă, la o dată potrivită pentru dumneavoastră.",
    formulaFinala: "Cu recunoștință,",
  },
  {
    id: "multumire-rapida",
    eticheta: "Mulțumire rapidă (în 48 de ore)",
    subiect: "Mulțumim pentru sprijin",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "În numele {ORGANIZATIE}, vă mulțumim pentru sprijinul acordat{SUMA_TXT}{PROIECT_TXT}. Am înregistrat contribuția dumneavoastră și vă vom transmite, în curând, mai multe detalii despre cum este folosită.\n\nDacă aveți nevoie de lămuriri sau de documente, ne puteți scrie oricând.",
    formulaFinala: "Cu mulțumiri,",
  },
  {
    id: "sponsorizare",
    eticheta: "Solicitare de sponsorizare",
    subiect: "Propunere de sponsorizare",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "Vă scriem din partea {ORGANIZATIE} pentru a vă propune să susțineți {PROIECT}, un proiect pentru oamenii pe care îi sprijinim.\n\nCu {SUMA_CERUTA}, {FIRMA} poate contribui la {REZULTAT}.\n\n{PARAGRAF_FISCAL}\n\nSusținerea se face pe bază de contract scris, în condițiile Legii nr. 32/1994 și ale Codului fiscal; vă recomandăm să îl încheiem înainte de transferul sumei. Condițiile fiscale depind de situația firmei dumneavoastră, așa că vă rugăm să le confirmați cu contabilul. După implementare, vă informăm despre utilizarea sprijinului, în forma și la termenele convenite.\n\nVă propunem o discuție de 20 de minute, {TERMEN}. Dacă preferați altă dată, ne spuneți și ne adaptăm.",
    formulaFinala: "Cu respect,",
  },
  {
    id: "oferta",
    eticheta: "Ofertă: pachete de sponsorizare",
    subiect: "Ofertă de sponsorizare pentru {PROIECT}",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "Vă mulțumim pentru discuția despre {PROIECT}. Vă prezentăm mai jos trei variante de susținere, fiecare cu un rezultat concret:\n\n• Varianta 1 — {SUMA_CERUTA}: {REZULTAT}\n• Varianta 2 — [suma]: [rezultatul]\n• Varianta 3 — [suma]: [rezultatul]\n\nPentru toate variantele oferim: mențiunea sprijinului dumneavoastră în comunicarea proiectului (cu acordul dumneavoastră), informări despre utilizarea sprijinului, în forma și la termenele convenite, și un certificat de recunoștință, cu valoare simbolică.\n\n{PARAGRAF_FISCAL}\n\nPutem stabili împreună varianta potrivită și redactăm contractul. Vă rugăm să ne răspundeți {TERMEN}.",
    formulaFinala: "Cu respect,",
  },
  {
    id: "follow-up",
    eticheta: "Follow-up după propunere",
    subiect: "Despre propunerea trimisă",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "Revenim pe scurt la propunerea trimisă pentru {PROIECT}. Înțelegem că agenda unei firme e încărcată, așa că rezumăm: {SUMA_CERUTA} contribuie la {REZULTAT}.\n\nPutem discuta într-un telefon de 15 minute, {TERMEN}. Dacă momentul nu e potrivit, ne puteți spune când să revenim.",
    formulaFinala: "Cu respect,",
  },
  {
    id: "reinnoire",
    eticheta: "Reînnoirea sprijinului",
    subiect: "Continuăm împreună în {AN_URMATOR}?",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "Vă mulțumim pentru sprijinul acordat{SUMA_TXT}{PROIECT_TXT}. Rezultatele sunt prezentate în raportul atașat.\n\nPentru {AN_URMATOR} vă propunem să continuăm împreună. Cu {SUMA_CERUTA}, sprijinul dumneavoastră ar contribui la {REZULTAT}.\n\n{PARAGRAF_FISCAL}\n\nCa să avem timp să stabilim detaliile, vă rugăm să ne răspundeți {TERMEN}.",
    formulaFinala: "Cu recunoștință,",
  },
  {
    id: "reactivare",
    eticheta: "Reluarea colaborării",
    subiect: "Ne-ar plăcea să reluăm colaborarea",
    formulaAdresare: "Stimată conducere {FIRMA},",
    corp: "A trecut ceva timp de când nu am mai vorbit, iar {ORGANIZATIE} a continuat să lucreze la {PROIECT}. Rezultatele recente sunt în documentul atașat.\n\nDacă vă interesează să reluăm colaborarea, vă propunem o discuție scurtă, {TERMEN}. Dacă nu, vă mulțumim pentru sprijinul de până acum și vă ținem la curent doar dacă doriți.",
    formulaFinala: "Cu respect,",
  },
  {
    id: "parteneriat",
    eticheta: "Propunere de parteneriat",
    subiect: "Propunere de parteneriat",
    formulaAdresare: "Stimați reprezentanți ai {FIRMA},",
    corp: "{ORGANIZATIE} vă propune un parteneriat pe termen lung între {FIRMA} și organizația noastră.\n\nPutem construi împreună proiecte comune, campanii cu implicarea angajaților și informări periodice despre ce s-a realizat, în forma pe care o stabilim împreună.\n\nVă rugăm să ne spuneți când vi se potrivește o discuție, pentru a stabili pașii următori.",
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
    corp: "Prin prezenta confirmăm că {ORGANIZATIE} a primit sprijinul acordat de {FIRMA}{SUMA_TXT}{PROIECT_TXT} și vă mulțumim pentru încredere.\n\nSprijinul va fi folosit conform destinației convenite cu dumneavoastră; dacă apar modificări, vă informăm și stabilim împreună pașii următori. Pentru documente privind utilizarea sprijinului, vă stăm la dispoziție.\n\nAceastă scrisoare are caracter informativ: nu constituie contract, factură sau document justificativ fiscal. Evidența se face pe baza contractului și a extrasului de cont.",
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
  sumaCeruta: string; // pentru {SUMA_CERUTA}, ex. „12.000 lei”
  rezultat: string; // pentru {REZULTAT}, ex. „40 de copii examinați la timp”
  termen: string; // pentru {TERMEN}, ex. „marți, între 10 și 12”
  mecanism: MecanismScrisoare; // pentru {PARAGRAF_FISCAL}
  motivGrafic: Motiv;
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
    sumaCeruta: "",
    rezultat: "",
    termen: "",
    mecanism: "",
    motivGrafic: motivImplicit(o.nume),
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
    sumaCeruta: text(b.sumaCeruta, 60),
    rezultat: text(b.rezultat, 200),
    termen: text(b.termen, 120),
    mecanism: MECANISME_SCRISOARE.some((m) => m.id === b.mecanism) ? (b.mecanism as MecanismScrisoare) : "",
    motivGrafic: curataMotiv(b.motivGrafic),
  };
}

// {DESTINATAR}, {FIRMA}, {ORGANIZATIE}, {DATA}, {SUBIECT}, {SEMNATAR}, {SUMA}, {PROIECT}, {AN}, {AN_URMATOR}, {SUMA_CERUTA}, {REZULTAT}, {TERMEN}, {PARAGRAF_FISCAL} se completează la randare.
// Un câmp gol lasă acoloada vizibilă în text, ca să nu se trimită o frază ruptă fără să se observe (vezi `campuriNecompletate`).
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
    AN_URMATOR: String((Number(d.an) || Number(d.data.slice(0, 4)) || new Date().getFullYear()) + 1),
    SUMA_CERUTA: d.sumaCeruta || "{SUMA_CERUTA}",
    REZULTAT: d.rezultat || "{REZULTAT}",
    TERMEN: d.termen || "{TERMEN}",
    PARAGRAF_FISCAL: PARAGRAF_FISCAL[d.mecanism],
  };
}

// Câmpurile din text rămase necompletate ({SUMA_CERUTA}, [suma] etc.): se arată înainte de export.
export function campuriNecompletate(d: DateScrisoare): string[] {
  const t = corpScrisoare(d).join(" ") + " " + liniiScrisoare(d.subiect, d);
  return [...new Set([...(t.match(/\{[A-Z_]+\}/g) ?? []), ...(t.match(/\[(?:suma|rezultatul)\]/g) ?? [])])];
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
    sumaCeruta: "12.000 lei",
    rezultat: "examinarea la timp a 40 de copii",
    termen: "marți, între 10 și 12",
    mecanism: "sponsorizare",
  };
}
