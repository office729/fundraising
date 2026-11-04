import { gasesteJudet } from "@/lib/judete";

// Județul unui influencer: din câmpul „județ” (scris oricum: „iasi”, „Jud. Iași”), iar dacă lipsește, din orașele mari. Restul se aleg manual.
const fara = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();

const ORASE: Record<string, string> = {
  "alba iulia": "Alba", arad: "Arad", pitesti: "Argeș", bacau: "Bacău", oradea: "Bihor", bistrita: "Bistrița-Năsăud", botosani: "Botoșani", braila: "Brăila",
  brasov: "Brașov", bucuresti: "București", bucharest: "București", buzau: "Buzău", calarasi: "Călărași", resita: "Caraș-Severin", "cluj napoca": "Cluj", cluj: "Cluj",
  constanta: "Constanța", "sfantu gheorghe": "Covasna", targoviste: "Dâmbovița", craiova: "Dolj", galati: "Galați", giurgiu: "Giurgiu", "targu jiu": "Gorj",
  "miercurea ciuc": "Harghita", deva: "Hunedoara", slobozia: "Ialomița", iasi: "Iași", voluntari: "Ilfov", "baia mare": "Maramureș", "drobeta turnu severin": "Mehedinți",
  "targu mures": "Mureș", "piatra neamt": "Neamț", slatina: "Olt", ploiesti: "Prahova", zalau: "Sălaj", "satu mare": "Satu Mare", sibiu: "Sibiu", suceava: "Suceava",
  alexandria: "Teleorman", timisoara: "Timiș", tulcea: "Tulcea", "ramnicu valcea": "Vâlcea", "rm valcea": "Vâlcea", vaslui: "Vaslui", focsani: "Vrancea", medias: "Sibiu", hunedoara: "Hunedoara",
  roman: "Neamț", barlad: "Vaslui", turda: "Cluj", onesti: "Bacău", mangalia: "Constanța", sighisoara: "Mureș", pascani: "Iași", petrosani: "Hunedoara",
};

export function judetDin(judet: string | null | undefined, oras?: string | null): string | null {
  const direct = gasesteJudet(judet);
  if (direct) return direct;
  const o = fara(oras ?? "");
  return o ? (ORASE[o] ?? null) : null;
}
