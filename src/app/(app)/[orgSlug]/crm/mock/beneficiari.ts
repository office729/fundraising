import { int, mulberry32, pick } from "./rand";

export type Beneficiar = {
  id: string;
  nume: string;
  varsta: number;
  localitate: string;
  statusCampanie: "activa" | "finalizata" | "urgenta";
  poveste: string;
  obiectiv: number;
  sumaStransa: number;
  sumaAlocata: number;
  sumaAchitata: number;
  zileActive: number;
  sponsoriIds: string[];
};

const rng = mulberry32(303);

const DATA: Array<[string, number, string, "activa" | "finalizata" | "urgenta", string, number]> = [
  ["Maria Ionescu", 7, "Iași", "urgenta", "Are nevoie de o intervenție chirurgicală urgentă la inimă.", 85000],
  ["David Popa", 12, "Cluj-Napoca", "activa", "Luptă cu leucemie și are nevoie de tratament continuu.", 120000],
  ["Ștefan Enache", 5, "Constanța", "activa", "Recuperare după un accident, are nevoie de fizioterapie.", 45000],
  ["Ioana Marin", 9, "Timișoara", "finalizata", "Operație de corectare a coloanei, campanie încheiată cu succes.", 60000],
  ["Andrei Toma", 3, "Brașov", "activa", "Diagnosticat cu o boală genetică rară, necesită tratament specializat.", 200000],
  ["Elena Dobre", 14, "București", "urgenta", "Are nevoie de un transplant și tratament post-operator.", 150000],
];

export const BENEFICIARI: Beneficiar[] = DATA.map(([nume, varsta, localitate, statusCampanie, poveste, obiectiv], i) => {
  const pct = statusCampanie === "finalizata" ? 100 : int(rng, 20, 85);
  const sumaStransa = Math.round((obiectiv * pct) / 100);
  const sumaAlocata = Math.round(sumaStransa * (int(rng, 60, 95) / 100));
  return {
    id: `ben-${i + 1}`,
    nume,
    varsta,
    localitate,
    statusCampanie,
    poveste,
    obiectiv,
    sumaStransa,
    sumaAlocata,
    sumaAchitata: Math.round(sumaAlocata * (int(rng, 50, 90) / 100)),
    zileActive: statusCampanie === "finalizata" ? int(rng, 60, 180) : int(rng, 5, 90),
    sponsoriIds: [pick(rng, ["co-1", "co-2", "co-3"]), pick(rng, ["co-4", "co-5", "co-6"])],
  };
});

export function beneficiarById(id: string) {
  return BENEFICIARI.find((b) => b.id === id);
}
