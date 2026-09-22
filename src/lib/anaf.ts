// Date fiscale reale despre firme din România — API-uri publice ANAF, fără
// cheie/autentificare. Folosite pentru „Verifică ANAF" pe fișa unei companii
// (crm/companii/[id]) și pentru scorul de mărime & profitabilitate (vezi
// lib/scor-companie.ts, care consumă direct companies.ca/profit/nrAngajati —
// nu are nevoie de nicio schimbare, doar de date reale în loc de manuale).
//
// Două servicii distincte:
//  - PlatitorTvaRest (v9): stare de înregistrare, plătitor de TVA, inactivare
//    fiscală — practic instant.
//  - /bilant: ultimul bilanț depus (cifră de afaceri, profit/pierdere netă,
//    număr mediu de salariați) — un an fiscal per apel, încercăm ultimii ani
//    până găsim un răspuns cu date.
//
// Limită impusă de ANAF: 1 cerere/secundă per client — nu facem apeluri în
// paralel/în buclă strânsă (folosit azi doar din acțiunea „Verifică ANAF",
// declanșată manual, o firmă o dată — sigur sub limită).

const TVA_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";
const BILANT_URL = "https://webservicesp.anaf.ro/bilant";

// "RO12345678", "ro 12345678", "12345678" → "12345678"
export function curataCui(cui: string): string {
  return cui.trim().toUpperCase().replace(/^RO/, "").replace(/[^0-9]/g, "");
}

export type AnafStareFiscala = {
  cui: string;
  denumire: string | null;
  stareInregistrare: string | null;
  activ: boolean; // opusul lui stare_inactiv.statusInactivi
  platitorTva: boolean;
  codCaen: string | null;
  dataInregistrare: string | null;
};

export async function verificaStareFiscala(cuiText: string): Promise<AnafStareFiscala | null> {
  const cui = curataCui(cuiText);
  if (!cui) return null;
  const azi = new Date().toISOString().slice(0, 10);
  const r = await fetch(TVA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ cui: Number(cui), data: azi }]),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const g = j?.found?.[0];
  if (!g) return null;
  return {
    cui,
    denumire: g.date_generale?.denumire ?? null,
    stareInregistrare: g.date_generale?.stare_inregistrare ?? null,
    activ: g.stare_inactiv?.statusInactivi !== true,
    platitorTva: g.inregistrare_scop_Tva?.scpTVA === true,
    codCaen: g.date_generale?.cod_CAEN ?? null,
    dataInregistrare: g.date_generale?.data_inregistrare ?? null,
  };
}

export type AnafBilant = {
  an: number;
  cifraAfaceri: number | null;
  profitNet: number | null; // negativ dacă a fost pierdere
  numarSalariati: number | null;
};

function citesteIndicator(indicatori: { val_den_indicator: string; val_indicator: number }[], contine: string): number | null {
  const rand = indicatori.find((x) => x.val_den_indicator?.toLowerCase().includes(contine));
  return rand ? Math.round(rand.val_indicator) : null;
}

async function bilantAnPeAn(cui: string, an: number): Promise<AnafBilant | null> {
  const r = await fetch(`${BILANT_URL}?an=${an}&cui=${encodeURIComponent(cui)}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j = await r.json();
  const indicatori: { val_den_indicator: string; val_indicator: number }[] = Array.isArray(j?.i) ? j.i : [];
  if (indicatori.length === 0) return null;
  const cifraAfaceri = citesteIndicator(indicatori, "cifra de afaceri");
  const profit = citesteIndicator(indicatori, "profit net");
  const pierdere = citesteIndicator(indicatori, "pierdere net");
  const numarSalariati = citesteIndicator(indicatori, "numar mediu de salariati");
  if (cifraAfaceri == null && profit == null && pierdere == null) return null;
  return {
    an,
    cifraAfaceri,
    profitNet: pierdere ? -Math.abs(pierdere) : profit,
    numarSalariati,
  };
}

// Cel mai recent bilanț disponibil — bilanțul pentru anul N se depune de
// obicei până în vara anului N+1, deci pornim de la anul trecut și urcăm
// până la 4 ani în urmă dacă lipsește.
export async function celMaiRecentBilant(cuiText: string): Promise<AnafBilant | null> {
  const cui = curataCui(cuiText);
  if (!cui) return null;
  const anCurent = new Date().getFullYear();
  for (let an = anCurent - 1; an >= anCurent - 4; an--) {
    const bilant = await bilantAnPeAn(cui, an);
    if (bilant) return bilant;
    await new Promise((res) => setTimeout(res, 350)); // respectă limita ANAF de 1 cerere/secundă
  }
  return null;
}
