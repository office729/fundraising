// Datele de facturare trimise la Netopia pentru antifraud. Înainte, TOATE plățile plecau cu același telefon (0700000000), același oraș
// și județ (București) și „Client” ca prenume — scoring-ul antifraud și 3-D Secure judecau date false, iar pe live asta crește
// refuzurile și provocările. Aici se calculează valorile reale din ce știm despre organizație (telefon, adresa și județul din ANAF,
// numele proprietarului). Funcții pure, fără importuri, ca să se poată testa direct.

// Valoarea care a funcționat până acum; rămâne DOAR ca rezervă când nu există un telefon valid.
export const TELEFON_IMPLICIT = "0700000000";

// Telefon în forma care a funcționat până acum (10 cifre, cu 0 în față). Numerele românești cu prefix (+40, 0040, 40) se aduc la această formă;
// orice altceva (străin, prea scurt) cade pe valoarea implicită, ca să nu riscăm o respingere de format la Netopia.
export function telefonPentruNetopia(telefon: string | null | undefined): { telefon: string; real: boolean } {
  let c = String(telefon ?? "").replace(/[\s().-]/g, "");
  if (c.startsWith("+40")) c = `0${c.slice(3)}`;
  else if (c.startsWith("0040")) c = `0${c.slice(4)}`;
  else if (/^40\d{9}$/.test(c)) c = `0${c.slice(2)}`;
  // Numărul implicit nu e unul real, chiar dacă arată ca un telefon: nu are voie să treacă drept „valid” dacă e scris sau salvat.
  if (/^0\d{9}$/.test(c) && c !== TELEFON_IMPLICIT) return { telefon: c, real: true };
  return { telefon: TELEFON_IMPLICIT, real: false };
}

function faraDiacritice(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ANAF scrie adesea cu cedilă (ş, ţ); în română corectă e virgulă dedesubt (ș, ț).
function normalizeazaDiacritice(s: string): string {
  return s.replace(/ş/g, "ș").replace(/Ş/g, "Ș").replace(/ţ/g, "ț").replace(/Ţ/g, "Ț");
}

function titluri(s: string): string {
  return normalizeazaDiacritice(s)
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, l: string) => sep + l.toUpperCase());
}

// Adresele din ANAF arată ca „JUD. PRAHOVA, SAT PLOPU COM. PLOPU, STR. INDUSTRIEI, NR.3” sau „MUN. CLUJ-NAPOCA, STR. X, NR. 1” sau
// „MUN. BUCUREŞTI SECTOR 3, STR. Y”. Localitatea se ia din segmentul care începe cu MUN./ORȘ./COM./SAT/LOC.; dacă nu se găsește, județul
// (București pentru Capitală). Rezervă: „București”, valoarea veche.
export function extrageLocalitate(adresa: string | null | undefined, judet: string | null | undefined): string {
  const brut = String(adresa ?? "");
  for (const parte of brut.split(",").map((p) => p.trim())) {
    const p = faraDiacritice(parte).toUpperCase();
    if (!/^(MUN\.?|ORS\.?|ORAS|COM\.?|COMUNA|SAT|LOC\.?|MUNICIPIUL)\s/.test(p)) continue;
    // ultima mențiune de tip (ex. „SAT PLOPU COM. PLOPU” -> după „COM.”)
    const dupaTip = parte.replace(/^.*\b(MUN|ORȘ|ORŞ|ORS|COM|SAT|LOC)\.?\s+/iu, "");
    const curat = dupaTip.replace(/\s+SECTOR\s*\d+\s*$/i, "").trim();
    if (curat) return titluri(curat).slice(0, 60);
  }
  const j = String(judet ?? "").trim();
  return j ? titluri(j).slice(0, 60) : "București";
}

// Pentru plata interactivă: fără un telefon valid nu pornim plata. Înainte, plecau „0700000000” și alte valori inventate, iar Netopia a marcat „Fraudă”
// tranzacțiile cu date de test, înainte de bancă; același card cu date reale a ajuns la 3-D Secure.
export const MESAJ_TELEFON_LIPSA = "Completează un număr de telefon valid (ex. 0722 123 456) înainte de plată: banca și procesatorul de plăți îl cer pentru a verifica plata.";

export function telefonPlataValid(telefon: string | null | undefined): boolean {
  return telefonPentruNetopia(telefon).real;
}

export type DateAntifraud = {
  prenume: string;
  nume: string;
  telefon: string;
  telefonReal: boolean;
  oras: string;
  judet: string;
  adresa: string;
};

// `numeUtilizator`: numele plătitorului (interactiv) sau al proprietarului (reînnoire). Un singur cuvânt -> prenume, iar numele de familie
// rămâne denumirea organizației (câmp obligatoriu), ca înainte.
export function dateAntifraud(p: {
  numeUtilizator?: string | null;
  orgName: string;
  telefon?: string | null;
  adresaSediu?: string | null;
  judet?: string | null;
}): DateAntifraud {
  const [prenume, ...rest] = String(p.numeUtilizator ?? "").trim().split(/\s+/).filter(Boolean);
  const tel = telefonPentruNetopia(p.telefon);
  const judet = String(p.judet ?? "").trim();
  const adresa = String(p.adresaSediu ?? "").trim();
  return {
    prenume: (prenume ?? "Client").slice(0, 60),
    nume: (rest.join(" ") || p.orgName).slice(0, 60),
    telefon: tel.telefon,
    telefonReal: tel.real,
    oras: extrageLocalitate(adresa, judet),
    judet: (judet || "București").slice(0, 60),
    adresa: (adresa || "-").slice(0, 120),
  };
}
