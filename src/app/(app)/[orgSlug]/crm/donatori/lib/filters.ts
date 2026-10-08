// Filtre pentru lista de donatori REALI (persoane fizice): căutare + locație + sumă + campanie + date + paginare.
// Filtrele pe donații (campanie / pentru cine / dată) se aplică împreună: „a donat pentru X între A și B”.

export type FiltruDonatoriReali = {
  q: string;
  pagina: number;
  judet: string;
  localitate: string;
  sumaMin: number | null; // total donat, lei
  sumaMax: number | null;
  proiect: string; // id pagină de campanie
  pentruCine: string; // text liber: numele beneficiarului / titlul campaniei
  dataDe: string; // „YYYY-MM-DD” — data unei donații
  dataPana: string;
  primaDe: string; // „YYYY-MM-DD” — data primei donații
  primaPana: string;
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataOk = (v: string | null) => (v && DATA_ISO.test(v) ? v : "");
const numarOk = (v: string | null) => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseFiltruDonatoriReali(sp: URLSearchParams): FiltruDonatoriReali {
  return {
    q: sp.get("q") ?? "",
    pagina: Math.max(1, Number(sp.get("pagina")) || 1),
    judet: sp.get("judet") ?? "",
    localitate: sp.get("localitate") ?? "",
    sumaMin: numarOk(sp.get("sumaMin")),
    sumaMax: numarOk(sp.get("sumaMax")),
    proiect: sp.get("proiect") ?? "",
    pentruCine: sp.get("pentruCine") ?? "",
    dataDe: dataOk(sp.get("dataDe")),
    dataPana: dataOk(sp.get("dataPana")),
    primaDe: dataOk(sp.get("primaDe")),
    primaPana: dataOk(sp.get("primaPana")),
  };
}

// Câte filtre (în afara căutării text) sunt active — pentru insigna de pe butonul „Filtre”.
export function numarFiltreActiveDonatori(f: FiltruDonatoriReali): number {
  return [f.judet, f.localitate, f.sumaMin, f.sumaMax, f.proiect, f.pentruCine, f.dataDe, f.dataPana, f.primaDe, f.primaPana].filter((v) => v !== "" && v !== null).length;
}