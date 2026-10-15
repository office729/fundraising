// Asamblarea raportului „Performanța reclamelor” din rândurile agregate aduse din baza de date. Funcții pure, fără importuri.
// Costurile și donațiile se agregă SEPARAT și se corelează abia la o granularitate comună (platformă + cod de campanie sau zi), ca niciun cost
// să nu se înmulțească printr-un join.

export type Totaluri = {
  cheltuieliBani: number;
  donatii: number;
  brutBani: number;
  rambursatBani: number;
  donatoriNoi: number;
  donatoriExistenti: number;
  donatoriNeclasificati: number;
};

export type RandCostAgg = { platforma: string; plasament?: string; ziua: string; campanieCheie: string; campanieNume: string; costBani: number; afisari: number | null; clicuri: number | null };
export type RandDonatieAgg = { ziua: string; plasament?: string; platforma: string | null; utmCampanie: string | null; clasaDonator: "nou" | "existent" | "necl"; n: number; brutBani: number; rambursatBani: number };
export type LegaturaCampanie = { platforma: string; campanieCheie: string; campanieNume: string; utmCampanie: string | null };

export type LinieRaport = {
  cheie: string;
  eticheta: string;
  platforma: string;
  utmCampanie: string | null;
  // false = cheltuială fără cod UTM legat (nealocată) sau cod UTM fără cheltuială importată
  legata: boolean;
  nota: string | null;
  totaluri: Totaluri;
  afisari: number | null;
  clicuri: number | null;
};

export type ZiRaport = { ziua: string; cheltuieliBani: number; donatii: number; brutBani: number; netBani: number };

export type Raport = {
  totaluri: Totaluri;
  pePlatforma: LinieRaport[];
  // Defalcare pe plasament (Facebook, Instagram etc.): aceleași sume ca pe platformă, doar împărțite; nu se adună încă o dată la total.
  pePlasament: LinieRaport[];
  peCampanie: LinieRaport[];
  peZi: ZiRaport[];
  costNealocatBani: number;
  donatiiFaraCostLegat: number;
};

const goale = (): Totaluri => ({ cheltuieliBani: 0, donatii: 0, brutBani: 0, rambursatBani: 0, donatoriNoi: 0, donatoriExistenti: 0, donatoriNeclasificati: 0 });

const MS_ZI = 86_400_000;
const dinIso = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
function zileDintre(de: string, pana: string): string[] {
  const rez: string[] = [];
  for (let ms = dinIso(de); ms <= dinIso(pana); ms += MS_ZI) rez.push(new Date(ms).toISOString().slice(0, 10));
  return rez;
}

function adaugaDonatii(t: Totaluri, d: RandDonatieAgg) {
  t.donatii += d.n;
  t.brutBani += d.brutBani;
  t.rambursatBani += d.rambursatBani;
  if (d.clasaDonator === "nou") t.donatoriNoi += d.n;
  else if (d.clasaDonator === "existent") t.donatoriExistenti += d.n;
  else t.donatoriNeclasificati += d.n;
}

const adunaOpt = (a: number | null, b: number | null): number | null => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));

export const ETICHETE_PLASAMENT: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", audience_network: "Audience Network", messenger: "Messenger", "": "Plasament nespecificat" };

export function asambleaza(input: { de: string; pana: string; costuri: RandCostAgg[]; donatii: RandDonatieAgg[]; legaturi: LegaturaCampanie[]; etichetePlatforme: Record<string, string> }): Raport {
  const { de, pana, costuri, donatii, legaturi } = input;
  // cod UTM legat, după (platformă + cheia campaniei de la platformă)
  const codPentruCampanie = new Map<string, string>();
  const campaniiCuCod = new Set<string>(); // platforma|cod
  for (const l of legaturi) {
    if (l.utmCampanie) {
      codPentruCampanie.set(`${l.platforma}|${l.campanieCheie}`, l.utmCampanie);
      campaniiCuCod.add(`${l.platforma}|${l.utmCampanie}`);
    }
  }

  const total = goale();
  const pePlatformaMap = new Map<string, LinieRaport>();
  const peCampanieMap = new Map<string, LinieRaport>();
  const pePlasamentMap = new Map<string, LinieRaport>();
  const peZiMap = new Map<string, ZiRaport>(zileDintre(de, pana).map((z) => [z, { ziua: z, cheltuieliBani: 0, donatii: 0, brutBani: 0, netBani: 0 }]));

  const linie = (map: Map<string, LinieRaport>, cheie: string, init: () => Omit<LinieRaport, "totaluri" | "afisari" | "clicuri">): LinieRaport => {
    let l = map.get(cheie);
    if (!l) {
      l = { ...init(), totaluri: goale(), afisari: null, clicuri: null };
      map.set(cheie, l);
    }
    return l;
  };
  const platforma = (p: string) => linie(pePlatformaMap, p, () => ({ cheie: p, eticheta: input.etichetePlatforme[p] ?? p, platforma: p, utmCampanie: null, legata: true, nota: null }));

  const plasament = (p: string, pl: string) =>
    linie(pePlasamentMap, `${p}|${pl}`, () => ({ cheie: `${p}|${pl}`, eticheta: ETICHETE_PLASAMENT[pl] ?? pl, platforma: p, utmCampanie: null, legata: true, nota: null }));

  let costNealocatBani = 0;
  for (const c of costuri) {
    total.cheltuieliBani += c.costBani;
    const pls = plasament(c.platforma, c.plasament ?? "");
    pls.totaluri.cheltuieliBani += c.costBani;
    pls.afisari = adunaOpt(pls.afisari, c.afisari);
    pls.clicuri = adunaOpt(pls.clicuri, c.clicuri);
    const pl = platforma(c.platforma);
    pl.totaluri.cheltuieliBani += c.costBani;
    pl.afisari = adunaOpt(pl.afisari, c.afisari);
    pl.clicuri = adunaOpt(pl.clicuri, c.clicuri);
    const zi = peZiMap.get(c.ziua);
    if (zi) zi.cheltuieliBani += c.costBani;

    const cod = codPentruCampanie.get(`${c.platforma}|${c.campanieCheie}`) ?? null;
    const l = cod
      ? linie(peCampanieMap, `${c.platforma}|${cod}`, () => ({ cheie: `${c.platforma}|${cod}`, eticheta: c.campanieNume || cod, platforma: c.platforma, utmCampanie: cod, legata: true, nota: null }))
      : linie(peCampanieMap, `${c.platforma}|~${c.campanieCheie}`, () => ({
          cheie: `${c.platforma}|~${c.campanieCheie}`,
          eticheta: c.campanieNume || c.campanieCheie || "Campanie nespecificată",
          platforma: c.platforma,
          utmCampanie: null,
          legata: false,
          nota: "Cheltuială nealocată: leagă campania de un cod UTM",
        }));
    l.totaluri.cheltuieliBani += c.costBani;
    l.afisari = adunaOpt(l.afisari, c.afisari);
    l.clicuri = adunaOpt(l.clicuri, c.clicuri);
    if (!cod) costNealocatBani += c.costBani;
  }

  let donatiiFaraCostLegat = 0;
  for (const d of donatii) {
    adaugaDonatii(total, d);
    const pcheie = d.platforma ?? "altele";
    adaugaDonatii(platforma(pcheie).totaluri, d);
    adaugaDonatii(plasament(pcheie, d.plasament ?? "").totaluri, d);
    const zi = peZiMap.get(d.ziua);
    if (zi) {
      zi.donatii += d.n;
      zi.brutBani += d.brutBani;
      zi.netBani += d.brutBani - d.rambursatBani;
    }
    const legat = d.utmCampanie !== null && campaniiCuCod.has(`${pcheie}|${d.utmCampanie}`);
    const cheieC = `${pcheie}|${d.utmCampanie ?? "~fara-cod"}`;
    const l = linie(peCampanieMap, cheieC, () => ({
      cheie: cheieC,
      eticheta: d.utmCampanie ?? "Fără cod de campanie în link",
      platforma: pcheie,
      utmCampanie: d.utmCampanie,
      legata: legat,
      nota: legat ? null : d.utmCampanie ? "Cod UTM fără cheltuială legată" : "Linkul n-a avut utm_campaign",
    }));
    adaugaDonatii(l.totaluri, d);
    if (!legat) donatiiFaraCostLegat += d.n;
  }

  const sorteaza = (a: LinieRaport, b: LinieRaport) => b.totaluri.cheltuieliBani - a.totaluri.cheltuieliBani || b.totaluri.brutBani - a.totaluri.brutBani || a.eticheta.localeCompare(b.eticheta, "ro");
  return {
    totaluri: total,
    pePlatforma: [...pePlatformaMap.values()].sort(sorteaza),
    pePlasament: [...pePlasamentMap.values()].sort(sorteaza),
    peCampanie: [...peCampanieMap.values()].sort(sorteaza),
    peZi: [...peZiMap.values()],
    costNealocatBani,
    donatiiFaraCostLegat,
  };
}

// Totaluri simple pentru perioada anterioară (comparație): fără defalcări.
export function totaluriSimple(costuri: { costBani: number }[], donatii: RandDonatieAgg[]): Totaluri {
  const t = goale();
  for (const c of costuri) t.cheltuieliBani += c.costBani;
  for (const d of donatii) adaugaDonatii(t, d);
  return t;
}
