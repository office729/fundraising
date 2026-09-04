import { daysAgo, int, mulberry32, pick } from "./rand";

export type EtapaCompanie =
  | "nou" | "pe_viitor" | "email" | "mesaj" | "onepager" | "telefon" | "online"
  | "contract_trimis" | "contract_semnat" | "contract_asteptare" | "contract_anulat" | "sponsorizat";

export type MecanismFiscal = "d177" | "sponsorizare20" | "ambele" | "niciunul";

export type Companie = {
  id: string;
  nume: string;
  cui: string;
  industrie: string;
  judet: string;
  localitate: string;
  site: string;
  administrator: string;
  ca: number;
  profit: number;
  nrAngajati: number;
  stage: EtapaCompanie;
  status: "open" | "won" | "lost" | "parked";
  sumaSponsorizata: number;
  sumaDisponibila: number;
  ultimaActivitateLa: string;
  responsabil: string;
  urmatoareaActiune: string;
  // Mecanismul fiscal prin care compania susține — redirecționare 20% impozit
  // pe profit (D177) și/sau sponsorizare deductibilă până la 20% din impozit.
  mecanism: MecanismFiscal;
  // Compania facilitează și formulare 230 pentru angajați (mecanism PF, separat).
  formular230: boolean;
  // Proiectul/cazul către care e direcționată susținerea (gol = nealocat).
  proiect: string;
  // Luna în care compania decide de regulă bugetul de sponsorizare/CSR (1-12).
  lunaDecizie: number;
  caen: string;
  regCom: string;
  anInfiintare: number;
  // Contractul de sponsorizare/redirecționare semnat — gol dacă firma n-a
  // ajuns încă la etapa de contract semnat.
  numarContract: string;
  dataSemnare: string;
};

const rng = mulberry32(101);

const DATA: Array<[string, string, string, string, EtapaCompanie, "open" | "won" | "lost" | "parked"]> = [
  ["Nord Est Servicii SRL", "Producție industrială", "Iași", "Iași", "sponsorizat", "won"],
  ["Tehno Soluții SRL", "IT & Software", "Cluj", "Cluj-Napoca", "contract_semnat", "won"],
  ["Agro Development SA", "Agricultură", "Timiș", "Timișoara", "contract_trimis", "open"],
  ["Construct Total SRL", "Construcții", "Ilfov", "Voluntari", "mesaj", "open"],
  ["Grup Exemplu Trading SRL", "Distribuție", "București", "București", "telefon", "open"],
  ["Farmalux Distribuție SRL", "Farmaceutic", "Brașov", "Brașov", "online", "open"],
  ["Rombat Energy SA", "Energie", "Constanța", "Constanța", "email", "open"],
  ["Delta Textile SRL", "Textile", "Bacău", "Bacău", "pe_viitor", "parked"],
  ["Metropol Real Estate SRL", "Imobiliare", "București", "București", "onepager", "open"],
  ["Silva Logistics SRL", "Transport & Logistică", "Sibiu", "Sibiu", "contract_asteptare", "open"],
  ["Vega FinTech SRL", "Servicii financiare", "Cluj", "Cluj-Napoca", "nou", "open"],
  ["Ceres Retail SA", "Retail", "Craiova", "Craiova", "contract_anulat", "lost"],
];

const CONTRACT_SEMNAT: EtapaCompanie[] = ["contract_semnat", "contract_asteptare", "sponsorizat"];

export const COMPANII: Companie[] = DATA.map(([nume, industrie, judet, localitate, stage, status], i) => ({
  id: `co-${i + 1}`,
  nume,
  cui: `RO${int(rng, 10000000, 39999999)}`,
  industrie,
  judet,
  localitate,
  site: `https://www.${nume.toLowerCase().split(" ")[0]}.ro`,
  administrator: pick(rng, ["Mihai Georgescu", "Alina Costea", "Bogdan Marinescu", "Cristina Neagu", "Radu Popa"]),
  ca: int(rng, 1_500_000, 42_000_000),
  profit: int(rng, 80_000, 3_800_000),
  nrAngajati: int(rng, 8, 420),
  stage,
  status,
  sumaSponsorizata: status === "won" ? int(rng, 5000, 60000) : status === "lost" ? 0 : int(rng, 0, 3000),
  sumaDisponibila: int(rng, 5000, 150000),
  ultimaActivitateLa: daysAgo(int(rng, 1, 45)),
  responsabil: pick(rng, ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"]),
  urmatoareaActiune: pick(rng, [
    "Trimite propunere de sponsorizare",
    "Follow-up telefonic",
    "Programează întâlnire",
    "Trimite raport de impact",
    "Reînnoire contract",
  ]),
  mecanism: pick(rng, ["d177", "sponsorizare20", "ambele", "niciunul"] as const),
  formular230: rng() < 0.35,
  proiect: rng() < 0.5 ? pick(rng, ["Urgențe medicale", "Copii cu boli rare", "Educație pentru toți", "Ajutor bătrâni singuri"]) : "",
  lunaDecizie: int(rng, 1, 12),
  caen: String(int(rng, 1000, 9999)),
  regCom: `J${int(rng, 10, 40)}/${int(rng, 100, 9999)}/${int(rng, 1995, 2020)}`,
  anInfiintare: int(rng, 1995, 2020),
  numarContract: CONTRACT_SEMNAT.includes(stage) ? String(int(rng, 100, 999)) : "",
  dataSemnare: CONTRACT_SEMNAT.includes(stage) ? daysAgo(int(rng, 20, 200)) : "",
}));

export function companieById(id: string) {
  return COMPANII.find((c) => c.id === id);
}
