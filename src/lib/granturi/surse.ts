// Sursele de finanțare unde merită căutat periodic. Lista e orientativă și o actualizăm manual: nu citește apeluri în timp real.
// Termenele, sumele și condițiile de eligibilitate se verifică întotdeauna pe site-ul finanțatorului, înainte de a aplica.

export type SursaFinantare = {
  id: string;
  nume: string;
  tip: "corporate" | "fundatie" | "ue" | "public" | "platforma" | "alt";
  descriere: string; // ce este, într-o frază
  cum: string; // cum se folosește: unde cauți și ce urmărești
  url: string;
  // Domenii în care e relevantă; „toate” = orice organizație.
  domenii: ("toate" | "sanatate" | "social" | "educatie" | "mediu" | "cultura" | "copii")[];
  // „apeluri” = publică apeluri cu termen; „agregator” = adună apeluri ale altora; „platforma” = program/platformă permanentă.
  fel: "apeluri" | "agregator" | "platforma";
};

export const SURSE_FINANTARE: SursaFinantare[] = [
  {
    id: "fdsc",
    nume: "Fundația pentru Dezvoltarea Societății Civile (FDSC)",
    tip: "fundatie",
    descriere: "Organizație care administrează programe de finanțare și sprijin pentru societatea civilă din România.",
    cum: "Urmărește secțiunea de apeluri deschise și programele pentru organizații neguvernamentale.",
    url: "https://www.fdsc.ro",
    domenii: ["toate"],
    fel: "apeluri",
  },
  {
    id: "granturi-see",
    nume: "Granturile SEE și Norvegiene",
    tip: "ue",
    descriere: "Programe de finanțare ale Islandei, Liechtensteinului și Norvegiei pentru state europene, inclusiv fonduri pentru societatea civilă.",
    cum: "Pe site-ul oficial vezi programele active în România și cine administrează fiecare apel.",
    url: "https://eeagrants.org",
    domenii: ["toate"],
    fel: "apeluri",
  },
  {
    id: "fonduri-ue",
    nume: "Fonduri europene în România (portalul oficial)",
    tip: "ue",
    descriere: "Portalul oficial cu programele operaționale și apelurile de proiecte finanțate din fonduri europene în România.",
    cum: "Filtrează apelurile după program și după tipul de solicitant; verifică dacă ONG-urile sunt eligibile.",
    url: "https://fonduri-ue.ro",
    domenii: ["toate"],
    fel: "agregator",
  },
  {
    id: "eu-funding-tenders",
    nume: "EU Funding & Tenders Portal",
    tip: "ue",
    descriere: "Portalul Comisiei Europene unde se publică apelurile directe (de exemplu CERV, EU4Health, Erasmus+) și se depun cererile.",
    cum: "Caută după program și cuvinte-cheie; cererile directe se fac de obicei în parteneriat, în engleză.",
    url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home",
    domenii: ["toate", "sanatate", "social", "educatie"],
    fel: "apeluri",
  },
  {
    id: "erasmus-plus",
    nume: "Erasmus+",
    tip: "ue",
    descriere: "Programul european pentru educație, tineret și sport; organizațiile non-profit pot depune sau se pot alătura parteneriatelor.",
    cum: "Verifică ghidul programului și agenția națională din România pentru apelurile curente.",
    url: "https://erasmus-plus.ec.europa.eu",
    domenii: ["educatie", "social", "copii"],
    fel: "apeluri",
  },
  {
    id: "benevity",
    nume: "Benevity",
    tip: "platforma",
    descriere: "Platformă folosită de companii pentru donații ale angajaților și programe de voluntariat; organizațiile eligibile pot primi fonduri prin ea.",
    cum: "Verifică procesul de înscriere și condițiile pentru organizații din afara SUA, apoi cere-le partenerilor corporativi să te găsească pe platformă.",
    url: "https://benevity.com",
    domenii: ["toate"],
    fel: "platforma",
  },
  {
    id: "globalgiving",
    nume: "GlobalGiving",
    tip: "platforma",
    descriere: "Platformă internațională de strângere de fonduri pentru organizații, cu proces propriu de verificare și acceptare.",
    cum: "Citește criteriile de acceptare și costurile înainte să te înscrii; funcționează bine cu o poveste și rezultate clare.",
    url: "https://www.globalgiving.org",
    domenii: ["toate"],
    fel: "platforma",
  },
  {
    id: "transnational-giving",
    nume: "Transnational Giving Europe",
    tip: "platforma",
    descriere: "Rețea de fundații care ajută donatorii din alte țări europene să doneze unei organizații din România, cu tratament fiscal în țara lor.",
    cum: "Util când un donator sau o companie din străinătate vrea să doneze și vrea avantaj fiscal acolo.",
    url: "https://www.transnationalgiving.eu",
    domenii: ["toate"],
    fel: "platforma",
  },
  {
    id: "open-society",
    nume: "Open Society Foundations",
    tip: "fundatie",
    descriere: "Fundație internațională care finanțează organizații pentru drepturile omului, justiție și societate deschisă.",
    cum: "Citește prioritățile actuale și procesul de cerere (de multe ori pe invitație sau prin apeluri anunțate).",
    url: "https://www.opensocietyfoundations.org",
    domenii: ["social"],
    fel: "apeluri",
  },
  {
    id: "fundatia-vodafone",
    nume: "Fundația Vodafone România",
    tip: "corporate",
    descriere: "Fundația companiei Vodafone în România, cu programe pentru societate și tehnologie.",
    cum: "Urmărește programele anunțate și condițiile de participare pentru ONG-uri.",
    url: "https://www.fundatia.vodafone.ro",
    domenii: ["toate"],
    fel: "apeluri",
  },
  {
    id: "fundatia-orange",
    nume: "Fundația Orange",
    tip: "corporate",
    descriere: "Fundația companiei Orange în România, cu programe sociale și educaționale.",
    cum: "Verifică programele active și cum se depun propunerile.",
    url: "https://www.fundatia.orange.ro",
    domenii: ["toate", "educatie", "social"],
    fel: "apeluri",
  },
  {
    id: "fundatia-bcr",
    nume: "Fundația BCR",
    tip: "corporate",
    descriere: "Fundația băncii BCR, cu programe pentru comunități și organizații neguvernamentale.",
    cum: "Verifică apelurile deschise și criteriile de eligibilitate.",
    url: "https://www.fundatiabcr.ro",
    domenii: ["toate"],
    fel: "apeluri",
  },
  {
    id: "google-nonprofits",
    nume: "Google for Nonprofits",
    tip: "platforma",
    descriere: "Program prin care organizațiile eligibile primesc instrumente Google gratuite, inclusiv credit publicitar (Ad Grants).",
    cum: "Aplică cu datele organizației; creditul publicitar aduce trafic către paginile de campanie.",
    url: "https://www.google.com/nonprofits",
    domenii: ["toate"],
    fel: "platforma",
  },
  {
    id: "microsoft-nonprofits",
    nume: "Microsoft for Nonprofits",
    tip: "platforma",
    descriere: "Program cu reduceri sau acces gratuit la produse Microsoft pentru organizațiile eligibile.",
    cum: "Verifică criteriile de eligibilitate și procesul de validare.",
    url: "https://nonprofit.microsoft.com",
    domenii: ["toate"],
    fel: "platforma",
  },
  {
    id: "finantare-ro",
    nume: "finantare.ro",
    tip: "alt",
    descriere: "Site care adună apeluri de finanțare din România (fonduri europene, granturi și alte surse).",
    cum: "Abonează-te la alerte pe domeniul tău de activitate și verifică sursa originală a fiecărui apel.",
    url: "https://finantare.ro",
    domenii: ["toate"],
    fel: "agregator",
  },
  {
    id: "stiriong",
    nume: "StiriONG",
    tip: "alt",
    descriere: "Publicație pentru sectorul ONG din România, cu știri și anunțuri despre apeluri de finanțare.",
    cum: "Parcurge periodic secțiunea de finanțări și oportunități.",
    url: "https://www.stiriong.ro",
    domenii: ["toate"],
    fel: "agregator",
  },
];

export const ETICHETE_FEL: Record<SursaFinantare["fel"], string> = {
  apeluri: "Publică apeluri",
  agregator: "Adună apeluri",
  platforma: "Program permanent",
};

// Luna în care a fost verificată ultima dată lista de mai sus (linkuri și descrieri); se actualizează la fiecare revizuire manuală.
export const SURSE_VERIFICATE_IN = "octombrie 2026";
