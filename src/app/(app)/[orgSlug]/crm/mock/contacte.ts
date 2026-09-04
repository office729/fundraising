import { COMPANII } from "./companii";
import { int, mulberry32, pick } from "./rand";

export const POZITII_CONTACT = [
  "CEO", "OWNER", "DIRECTOR ECONOMIC", "CSR", "DIRECTOR FINANCIAR",
  "HR", "MARKETING", "ADMINISTRATOR", "PREȘEDINTE", "CONTABIL",
] as const;

export type Contact = {
  id: string;
  companyId: string;
  nume: string;
  pozitii: string[];
  functie: string;
  telefon: string;
  email: string;
  facebook: string;
  linkedin: string;
  website: string;
  dataPropunerii: string;
  prioritar: boolean;
};

const rng = mulberry32(4242);
const NUME = [
  "Maftei Mădălina", "Popescu Ionuț", "Georgescu Ana", "Dumitrescu Mihai",
  "Constantin Elena", "Voicu Radu", "Stanciu Diana", "Marinescu Paul",
  "Iliescu Corina", "Munteanu Alex", "Neagu Simona", "Barbu Cătălin",
];

export const CONTACTE: Contact[] = COMPANII.filter(() => rng() < 0.8).map((c, i) => {
  const nume = NUME[i % NUME.length];
  const domeniu = c.site.replace("https://www.", "");
  return {
    id: `ct-${i + 1}`,
    companyId: c.id,
    nume,
    pozitii: [pick(rng, POZITII_CONTACT)],
    functie: "",
    telefon: `07${int(rng, 20, 89)}${int(rng, 100000, 999999)}`,
    email: `${nume.toLowerCase().replace(" ", ".")}@${domeniu}`,
    facebook: "",
    linkedin: "",
    website: c.site,
    dataPropunerii: "",
    prioritar: rng() < 0.4,
  };
});

export function contacteByCompanie(companyId: string) {
  return CONTACTE.filter((c) => c.companyId === companyId);
}
