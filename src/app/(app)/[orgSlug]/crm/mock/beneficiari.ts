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

// Proiecte demonstrative (nu cazuri individuale). Câmpul „varsta” nu se mai afișează; rămâne 0
// doar pentru compatibilitatea tipului cu datele importate.
const DATA: Array<[string, number, string, "activa" | "finalizata" | "urgenta", string, number]> = [
  ["Cabinet de fizioterapie pentru copii", 0, "Iași", "urgenta", "Dotarea unui cabinet de fizioterapie pentru copii din medii vulnerabile.", 85000],
  ["Tabăra de vară „Aripi”", 0, "Cluj-Napoca", "activa", "O tabără de vară pentru 60 de copii din familii cu venituri mici.", 120000],
  ["Ateliere educaționale în școlile rurale", 0, "Constanța", "activa", "Materiale și mentori pentru ateliere de după-școală în 12 comune.", 45000],
  ["Renovarea centrului de zi", 0, "Timișoara", "finalizata", "Renovarea și dotarea centrului de zi pentru vârstnici, încheiată cu succes.", 60000],
  ["Program de burse pentru elevi", 0, "Brașov", "activa", "Burse lunare pentru 40 de elevi cu rezultate bune din familii vulnerabile.", 200000],
  ["Masa caldă pentru vârstnici", 0, "București", "urgenta", "Mese calde zilnice pentru 150 de vârstnici care locuiesc singuri.", 150000],
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
