import type { SpatiulMeu } from "@/lib/performanta-activitati";
import type { ActivitateDto, BlocajDto, MembruEchipa } from "@/lib/performanta-activitati-tipuri";
import { SETARI_IMPLICITE, type NotificareDto, type SetariAutomatizari } from "@/lib/performanta-automatizari";
import type { DateDiscutii, IntrareDto } from "@/lib/performanta-evaluari";
import { actualitateDate, aziRo, capacitateSaptamana, incarcareSaptamana, luniSaptamanii, nivelIncarcare, progresObiectiv, progresRezultat, ritmAsteptat, stareRitm, type FrecventaActualizare, type Incredere, type Metoda } from "@/lib/performanta-masurare";
import type { DateSaptamana, ObiectivSimplu } from "@/lib/performanta-pagini";
import { perioadaVecina, rezolvaPerioada } from "@/lib/performanta-perioada";
import type { PrezentareDto } from "@/lib/performanta-prezentare";
import type { RaportEvaluari } from "@/lib/performanta-rapoarte-evaluari";
import { randuriRezultate, type DateRapoarte } from "@/lib/performanta-rapoarte";
import { construiesteRecomandari } from "@/lib/performanta-recomandari";
import { SABLOANE_ROLURI, sablonEfectiv, type SablonEfectiv } from "@/lib/performanta-sabloane";
import type { ReferintaCrm } from "@/lib/performanta-sabloane-setari";
import type { AngajatMic, DepartamentMic, ObiectivDto, OptiuniPerformanta, RezultatDto } from "@/lib/performanta-tipuri";
import { ETICHETE_STARE } from "@/lib/performanta-masurare";

// Date DEMONSTRATIVE pentru Echipă & Performanță: complet fictive, calculate în memorie cu aceleași reguli ca modulul real și relative la ziua de azi.
// Nu citesc și nu scriu nimic în baza de date: paginile din modul demonstrativ nu au acces la datele organizației și nu salvează nimic.

const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);
const cand = (iso: string, ora = 9) => new Date(`${iso}T${String(ora).padStart(2, "0")}:00:00+03:00`);
const uid = (tip: string, n: number | string) => `demo-${tip}-${n}`;

type Cheie = "eu" | "irina" | "radu" | "elena" | "tudor" | "ioana";
const PERSOANE: { cheie: Cheie; nume: string; rol: string; sablon: string; dep: "F" | "C"; manager: Cheie | null; norma: number }[] = [
  { cheie: "eu", nume: "Alexandra Popa", rol: "Conducere și parteneriate", sablon: "conducere", dep: "F", manager: null, norma: 100 },
  { cheie: "irina", nume: "Irina Voicu", rol: "Fundraising și PR", sablon: "fundraising_pr", dep: "F", manager: "eu", norma: 100 },
  { cheie: "radu", nume: "Radu Matei", rol: "Companii și voluntari", sablon: "companii_voluntari", dep: "F", manager: "eu", norma: 100 },
  { cheie: "elena", nume: "Elena Costin", rol: "Donatori persoane fizice", sablon: "donatori_pf", dep: "F", manager: "irina", norma: 100 },
  { cheie: "tudor", nume: "Tudor Barbu", rol: "Video și live", sablon: "video_live", dep: "C", manager: "eu", norma: 100 },
  { cheie: "ioana", nume: "Ioana Pavel", rol: "Statistici, rapoarte și LinkedIn", sablon: "date_rapoarte", dep: "C", manager: "irina", norma: 80 },
];
const DEPARTAMENTE: DepartamentMic[] = [{ id: uid("dep", "F"), nume: "Fundraising" }, { id: uid("dep", "C"), nume: "Comunicare și date" }];
const idP = (c: Cheie) => uid("ang", c);
const numeP = (c: Cheie) => PERSOANE.find((p) => p.cheie === c)!.nume;
const depDe = (c: Cheie) => DEPARTAMENTE[PERSOANE.find((p) => p.cheie === c)!.dep === "F" ? 0 : 1];

// Cât de aproape de ritmul așteptat stă fiecare rezultat manual (1 = exact în ritm; null = fără valoare încă).
const RITM: Record<Cheie, (number | null)[]> = { eu: [1.0, 1.1, 0.95, 1.0], irina: [1.15, 1.0, 1.05, 0.95], radu: [0.7, 0.45, 0.9, 0.8], elena: [1.0, 0.85, 1.1, 1.0], tudor: [1.0, 1.05, 0.95, 1.2], ioana: [0.95, null, 0.6, 1.0] };
// Valori fictive din CRM, pentru rezultatele-cheie care ar veni din platformă (la nivel de organizație).
const CRM_FICTIV: Record<string, { valoare: number }> = { incasari_totale: { valoare: 68000 }, donatori_noi: { valoare: 42 }, retentie_donatori: { valoare: 61 }, completitudine_date_donatori: { valoare: 74 }, donatori_lunari_activi: { valoare: 455 }, sponsorizari_inregistrate: { valoare: 27000 } };

export type DateDemo = ReturnType<typeof dateDemo>;

export function dateDemo(aziIn?: string) {
  const azi = aziIn ?? aziRo();
  const luni = luniSaptamanii(azi);
  const trim = rezolvaPerioada(null, azi);
  const anterior = perioadaVecina(trim, -1);
  const an = azi.slice(0, 4);
  const e = ritmAsteptat(trim.start, trim.end, azi);

  // ───────── obiective ─────────
  let nOb = 0;
  let nKr = 0;
  const obiective: ObiectivDto[] = [];

  function adaugaObiectiv(p: { nivel: ObiectivDto["nivel"]; titlu: string; descriere: string; resp: Cheie; start: string; end: string; parentId?: string | null; rez: (obId: string) => RezultatDto[]; blocaje?: number; colaboratori?: Cheie[] }): ObiectivDto {
    const oid = uid("ob", ++nOb);
    const rezultate = p.rez(oid);
    const ag = progresObiectiv(rezultate.map((r) => ({ progres: r.progres, pondere: r.pondere, activ: r.status === "activ" })));
    const manuale = rezultate.filter((r) => r.sursa === "manual");
    const ord = { fara_date: 0, la_zi: 1, intarziata: 2, veche: 3 } as const;
    const actualitate = manuale.length === 0 ? "la_zi" : manuale.reduce<RezultatDto["actualitate"]>((w, r) => (ord[r.actualitate] > ord[w] ? r.actualitate : w), "fara_date");
    const ultimele = rezultate.map((r) => r.ultimaActualizare).filter((x): x is string => !!x).sort();
    const o: ObiectivDto = {
      id: oid, parentId: p.parentId ?? null, nivel: p.nivel, titlu: p.titlu, descriere: p.descriere, responsabilId: idP(p.resp), responsabilNume: numeP(p.resp), departmentId: depDe(p.resp).id, departmentNume: depDe(p.resp).nume,
      perioadaStart: p.start, perioadaEnd: p.end, status: "activ", motivAnulare: null, vizibilitate: "organizatie",
      colaboratori: (p.colaboratori ?? []).map((c) => ({ id: idP(c), nume: numeP(c), departmentId: depDe(c).id, managerId: null, activ: true })),
      rezultate, progres: ag.progres, rkCuDate: ag.cuDate, rkTotal: ag.total, stare: stareRitm({ progres: ag.progres, start: p.start, end: p.end, azi, status: "activ" }),
      actualitate, nrActivitati: 0, nrActivitatiFinalizate: 0, blocajeDeschise: p.blocaje ?? 0, legaturi: [], poateEdita: true, creatDe: null, ultimaActualizare: ultimele.length ? ultimele[ultimele.length - 1] : null,
    };
    obiective.push(o);
    return o;
  }

  function rezultat(oid: string, o: { titlu: string; metoda: Metoda; tipTinta?: "cumulativ" | "periodic"; unitate?: string | null; nivelInitial?: number | null; tinta: number | null; tintaMax?: number | null; valoare: number | null; pondere?: number; sursa?: "manual" | "crm"; metrica?: string; frecventa?: FrecventaActualizare; zileDeLaActualizare?: number; formula?: string | null; reguli?: string | null; atribuire?: string | null; incredere?: Incredere | null; start: string; end: string }): RezultatDto {
    const m = progresRezultat({ metoda: o.metoda, nivelInitial: o.nivelInitial ?? null, tinta: o.tinta, tintaMax: o.tintaMax ?? null, valoare: o.valoare });
    const crm = o.sursa === "crm";
    const ultima = o.valoare === null ? null : crm ? cand(azi, 6) : cand(adauga(azi, -(o.zileDeLaActualizare ?? 2)), 10);
    const frecv = (crm ? "zilnic" : (o.frecventa ?? "lunar")) as FrecventaActualizare;
    return {
      id: uid("kr", ++nKr), obiectivId: oid, titlu: o.titlu, descriere: null, metoda: o.metoda, tipTinta: o.tipTinta ?? "cumulativ", unitate: o.unitate ?? null, nivelInitial: o.nivelInitial ?? null, tinta: o.tinta, tintaMax: o.tintaMax ?? null, valoare: o.valoare,
      pondere: o.pondere ?? 1, sursa: crm ? "crm" : "manual", sursaEticheta: crm ? `CRM: ${o.metrica}` : null, kpiDefinitieId: null, kpiAngajatId: null, sursaConfig: crm ? { metrica: o.metrica } : null, frecventaActualizare: frecv,
      ultimaActualizare: ultima ? ultima.toISOString() : null, incredere: o.incredere ?? (crm ? null : "medie"), termen: null, responsabilId: null, responsabilNume: null, formula: o.formula ?? null, reguli: o.reguli ?? null, atribuire: o.atribuire ?? null, status: "activ",
      progres: m.progres, avertisment: m.avertisment, peste: m.peste, stare: stareRitm({ progres: m.progres, start: o.start, end: o.end, azi, status: "activ" }), actualitate: actualitateDate(ultima, frecv, cand(azi, 12)), ordine: nKr, poateActualiza: !crm,
    };
  }

  // strategice, pe tot anul: în ritm pe cifre mari
  const s1 = adaugaObiectiv({
    nivel: "strategic", titlu: "Creștem veniturile din donații individuale cu 25%", descriere: "Obiectivul anului: mai mulți donatori care rămân, nu doar mai multe campanii.", resp: "eu", start: `${an}-01-01`, end: `${an}-12-31`,
    rez: (o) => [
      rezultat(o, { titlu: "Încasări din donații", metoda: "crescator", unitate: "lei", nivelInitial: 0, tinta: 250000, valoare: 192000, pondere: 3, sursa: "crm", metrica: "incasari_totale", formula: "Suma donațiilor reușite din perioadă, după rambursări.", atribuire: "Rezultat al organizației; nu se atribuie unei singure persoane.", start: `${an}-01-01`, end: `${an}-12-31` }),
      rezultat(o, { titlu: "Donatori noi în an", metoda: "crescator", unitate: "donatori", nivelInitial: 0, tinta: 600, valoare: 410, pondere: 2, sursa: "crm", metrica: "donatori_noi", atribuire: "Rezultat al organizației, la care contribuie campaniile și comunicarea.", start: `${an}-01-01`, end: `${an}-12-31` }),
    ],
  });
  const s2 = adaugaObiectiv({
    nivel: "strategic", titlu: "Parteneriate strategice pe termen lung", descriere: "Mai puține relații, dar solide.", resp: "eu", start: `${an}-01-01`, end: `${an}-12-31`, colaboratori: ["radu"],
    rez: (o) => [
      rezultat(o, { titlu: "Parteneriate strategice semnate", metoda: "crescator", unitate: "parteneriate", nivelInitial: 0, tinta: 4, valoare: 3, pondere: 3, start: `${an}-01-01`, end: `${an}-12-31`, formula: "Acorduri semnate de ambele părți, în perioadă." }),
      rezultat(o, { titlu: "Raport către consiliu predat", metoda: "binar", tipTinta: "periodic", tinta: 1, valoare: null, start: `${an}-01-01`, end: `${an}-12-31` }),
    ],
  });

  // pe roluri, din șabloane (ținte-exemplu), cu valori după tiparul fiecărei persoane
  for (const p of PERSOANE) {
    const sablon = SABLOANE_ROLURI.find((s) => s.id === p.sablon)!;
    let i = 0;
    sablon.obiective.forEach((os, idx) => {
      adaugaObiectiv({
        nivel: "individual", titlu: os.titlu, descriere: `Țintă de exemplu: ajustează-o înainte să fie folosită. ${os.descriere}`, resp: p.cheie, start: trim.start, end: trim.end, parentId: idx === 0 ? (p.cheie === "radu" || p.cheie === "eu" ? s2.id : s1.id) : null,
        blocaje: p.cheie === "radu" && idx === 0 ? 1 : p.cheie === "tudor" && idx === 0 ? 1 : 0,
        rez: (o) =>
          os.rezultate.map((r) => {
            const ratio = RITM[p.cheie][i % RITM[p.cheie].length];
            i++;
            const ti = r.tinta ?? 0;
            const ni = r.nivelInitial ?? 0;
            let v: number | null;
            if (r.sursa === "crm" && r.metrica && CRM_FICTIV[r.metrica] && ["incasari_totale", "donatori_noi", "retentie_donatori", "completitudine_date_donatori"].includes(r.metrica)) v = CRM_FICTIV[r.metrica].valoare;
            else if (ratio === null) v = null;
            else if (r.metoda === "binar") v = ratio >= 1 ? 1 : 0;
            else if (r.metoda === "interval") v = ratio >= 0.9 ? ((r.tinta ?? 0) + (r.tintaMax ?? 0)) / 2 : (r.tinta ?? 0) * 0.5;
            else if (r.metoda === "descrescator") v = ni - (ni - ti) * Math.min(1, e * ratio);
            else v = r.tipTinta === "periodic" ? ni + (ti - ni) * Math.min(1, e * ratio) : Math.max(1, Math.round(ti * Math.min(1, e * ratio)));
            if (v !== null) v = Math.round(v * 10) / 10;
            // ținte potrivite cu valorile fictive din CRM, ca să nu pară „întârziat” fără motiv
            let tinta = r.tinta;
            let nivel = r.metoda === "interval" || r.metoda === "binar" ? null : (r.nivelInitial ?? 0);
            if (r.sursa === "crm" && v !== null && ["incasari_totale", "donatori_noi"].includes(r.metrica ?? "")) tinta = Math.round(v / Math.max(e, 0.05) / (r.metrica === "incasari_totale" ? 1000 : 5)) * (r.metrica === "incasari_totale" ? 1000 : 5);
            if (r.sursa === "crm" && v !== null && ["retentie_donatori", "completitudine_date_donatori"].includes(r.metrica ?? "")) {
              nivel = Math.round(v - 6);
              tinta = Math.round(v + 9);
            }
            const crmFaraDate = r.sursa === "crm" && !["incasari_totale", "donatori_noi", "retentie_donatori", "completitudine_date_donatori"].includes(r.metrica ?? "");
            return rezultat(o, {
              titlu: r.titlu, metoda: r.metoda, tipTinta: r.tipTinta, unitate: r.unitate ?? null, nivelInitial: nivel, tinta, tintaMax: r.tintaMax ?? null, valoare: v, pondere: r.pondere, sursa: r.sursa === "crm" && !crmFaraDate ? "crm" : "manual", metrica: r.metrica,
              frecventa: r.frecventa, zileDeLaActualizare: p.cheie === "ioana" && i === 3 ? 90 : 1 + (i % 4), formula: r.formula, reguli: r.reguli ?? null, atribuire: r.atribuire, start: trim.start, end: trim.end,
            });
          }),
      });
    });
  }

  // ───────── activități ─────────
  let nAct = 0;
  const act = (v: Partial<ActivitateDto> & { titlu: string; resp: Cheie; zile: number | null }): ActivitateDto => {
    const status = v.status ?? "de_facut";
    const termen = v.zile === null ? null : adauga(azi, v.zile);
    const { resp, zile, ...rest } = v;
    void zile;
    return {
      id: uid("act", ++nAct), descriere: null, responsabilId: idP(resp), responsabilNume: numeP(resp), obiectivId: null, obiectivTitlu: null, rezultatId: null, rezultatTitlu: null, prioritate: "medie", termen, efortOre: 2, status,
      aprobareNecesara: false, aprobata: false, aprobataDeNume: null, rezultatAsteptat: null, criteriuFinalizare: null, dependeDe: null, recurenta: "nu", sursa: "manual", finalizatLa: status === "finalizat" ? cand(termen ?? azi, 15).toISOString() : null,
      intarziata: Boolean(termen && termen < azi && ["de_facut", "in_lucru", "in_asteptare", "blocat"].includes(status)), blocaj: null, poateEdita: true, poateAproba: false, ...rest,
    };
  };
  const titluOb = (r: Cheie, k = 0) => obiective.filter((o) => o.responsabilId === idP(r) && o.nivel === "individual")[k];
  const legat = (r: Cheie, k = 0) => {
    const o = titluOb(r, k);
    return { obiectivId: o?.id ?? null, obiectivTitlu: o?.titlu ?? null };
  };
  const exportCrm = act({ titlu: "Cere exportul de date de la contabilitate", resp: "ioana", zile: -1, prioritate: "mare", status: "in_lucru", efortOre: 1 });
  const blocajContract: BlocajDto = { id: uid("bl", 1), activitateId: null, activitateTitlu: "Finalizează contractul cu firma Alpha", obiectivId: null, obiectivTitlu: null, motiv: "Aprobarea juridică a sponsorului întârzie; fără ea nu putem semna.", rezolvatorId: idP("eu"), rezolvatorNume: numeP("eu"), raportatDeNume: numeP("radu"), termenRevenire: adauga(azi, -1), necesitaDecizie: true, status: "deschis", rezolvare: null, deschisLa: cand(adauga(azi, -6)).toISOString(), rezolvatLa: null, intarziat: true, poateInchide: true };
  const contract = act({ titlu: "Finalizează contractul cu firma Alpha", resp: "radu", zile: -2, prioritate: "critica", status: "blocat", efortOre: 3, ...legat("radu", 0), blocaj: blocajContract });
  blocajContract.activitateId = contract.id;
  const activitati: ActivitateDto[] = [
    exportCrm,
    act({ titlu: "Pregătește raportul pentru sponsorul Alpha", resp: "ioana", zile: 2, prioritate: "critica", efortOre: 6, ...legat("ioana", 0), dependeDe: { id: exportCrm.id, titlu: exportCrm.titlu, status: "in_lucru" }, criteriuFinalizare: "Raportul e trimis sponsorului, cu cifrele verificate în platformă." }),
    act({ titlu: "Raport săptămânal de statistici", resp: "ioana", zile: 0, recurenta: "saptamanal" }),
    act({ titlu: "Postare LinkedIn despre campania de iarnă", resp: "ioana", zile: 3, efortOre: 1.5, ...legat("ioana", 1) }),
    act({ titlu: "Comunicat de presă: lansarea campaniei de iarnă", resp: "irina", zile: 1, prioritate: "mare", aprobareNecesara: true, aprobata: false, poateAproba: true, efortOre: 3, ...legat("irina", 1) }),
    act({ titlu: "Mesaj de mulțumire către sponsorii din vară", resp: "irina", zile: 4, aprobareNecesara: true, aprobata: true, aprobataDeNume: numeP("eu"), efortOre: 1.5 }),
    act({ titlu: "Planifică calendarul campaniilor din T4", resp: "irina", zile: -3, prioritate: "mare", status: "finalizat", efortOre: 4, ...legat("irina", 0) }),
    act({ titlu: "Interviu pentru emisiunea de dimineață", resp: "irina", zile: 5, efortOre: 2, ...legat("irina", 1) }),
    contract,
    act({ titlu: "Întâlnire cu un potențial partener corporate", resp: "radu", zile: 1, prioritate: "mare", ...legat("radu", 0) }),
    act({ titlu: "Contactează 10 companii noi din lista de prospecți", resp: "radu", zile: 0, efortOre: 3, ...legat("radu", 0) }),
    act({ titlu: "Ghid pentru voluntarii noi", resp: "radu", zile: 7, prioritate: "scazuta", efortOre: 5, ...legat("radu", 1) }),
    act({ titlu: "Sună donatorii dormanți din lista de reactivare", resp: "elena", zile: 0, prioritate: "mare", efortOre: 3, ...legat("elena", 0) }),
    act({ titlu: "Curăță datele donatorilor fără telefon", resp: "elena", zile: 2, efortOre: 4, ...legat("elena", 1) }),
    act({ titlu: "Trimite mulțumirile din ultima campanie", resp: "elena", zile: -1, prioritate: "mare", status: "finalizat", efortOre: 2, ...legat("elena", 0) }),
    act({ titlu: "Mulțumește donatorilor primei donații", resp: "elena", zile: 1, efortOre: 0.5, sursa: "automatizare", criteriuFinalizare: "Donatorul a primit mulțumirea (telefon, mesaj sau email)." }),
    act({ titlu: "Montaj clip de mulțumire pentru donatorii lunari", resp: "tudor", zile: 3, prioritate: "mare", status: "in_lucru", efortOre: 8, ...legat("tudor", 0) }),
    act({ titlu: "Transmisiune live: povestea unui beneficiar", resp: "tudor", zile: 6, prioritate: "critica", efortOre: 6, ...legat("tudor", 0) }),
    act({ titlu: "Arhivează materialele brute din campania de vară", resp: "tudor", zile: null, prioritate: "scazuta", efortOre: null }),
    act({ titlu: "Pregătește raportul trimestrial pentru consiliu", resp: "eu", zile: 5, prioritate: "mare", efortOre: 5, ...legat("eu", 1) }),
    act({ titlu: "Decizie: prioritățile campaniei de iarnă", resp: "eu", zile: -1, prioritate: "critica", status: "in_asteptare", efortOre: 1 }),
    act({ titlu: "Revizuiește țintele din șabloanele de roluri", resp: "eu", zile: 2 }),
    act({ titlu: "Raport către sponsor: partenerul Beta", resp: "ioana", zile: 20, prioritate: "mare", efortOre: 3, sursa: "automatizare", criteriuFinalizare: "Raportul a fost trimis sponsorului." }),
  ];
  for (const o of obiective) {
    const ale = activitati.filter((a) => a.obiectivId === o.id);
    o.nrActivitati = ale.length;
    o.nrActivitatiFinalizate = ale.filter((a) => a.status === "finalizat").length;
  }

  const blocajeDeschise: BlocajDto[] = [
    blocajContract,
    { id: uid("bl", 2), activitateId: null, activitateTitlu: null, obiectivId: titluOb("tudor", 0).id, obiectivTitlu: titluOb("tudor", 0).titlu, motiv: "Studioul de montaj e ocupat până joi; clipul de mulțumire riscă să se mute.", rezolvatorId: idP("irina"), rezolvatorNume: numeP("irina"), raportatDeNume: numeP("tudor"), termenRevenire: azi, necesitaDecizie: false, status: "deschis", rezolvare: null, deschisLa: cand(adauga(azi, -3)).toISOString(), rezolvatLa: null, intarziat: false, poateInchide: true },
  ];

  // ───────── echipă, capacitate ─────────
  // Ore din alte activități (neafișate aici), ca harta de capacitate să arate niveluri variate.
  const EXTRA: Record<Cheie, number[]> = { eu: [14, 18, 10, 26, 22, 8], irina: [18, 24, 38, 44, 20, 6], radu: [26, 0, 30, 34, 28, 16], elena: [28, 22, 30, 8, 36, 30], tudor: [16, 12, 24, 6, 10, 0], ioana: [10, 20, 14, 22, 26, 9] };
  const abs: Record<Cheie, { tip: "concediu" | "medical" | "altele"; dataStart: string; dataSfarsit: string; nota: string | null }[]> = {
    eu: [], irina: [], ioana: [],
    radu: [{ tip: "concediu", dataStart: adauga(luni, 7), dataSfarsit: adauga(luni, 11), nota: "Concediu planificat" }],
    elena: [{ tip: "medical", dataStart: azi, dataSfarsit: adauga(azi, 2), nota: null }],
    tudor: [{ tip: "concediu", dataStart: adauga(luni, 21), dataSfarsit: adauga(luni, 32), nota: "Concediu de odihnă" }],
  };
  const luniLista = Array.from({ length: 6 }, (_, i) => adauga(luni, i * 7));
  const membri: MembruEchipa[] = PERSOANE.map((p) => {
    const ale = activitati.filter((a) => a.responsabilId === idP(p.cheie) && ["de_facut", "in_lucru", "in_asteptare", "blocat"].includes(a.status));
    const absente = abs[p.cheie].map((x, i) => ({ id: uid("abs", `${p.cheie}${i}`), angajatId: idP(p.cheie), ...x, poateSterge: true }));
    return {
      id: idP(p.cheie), nume: p.nume, email: `${p.cheie === "eu" ? "alexandra" : p.cheie}@demo.invalid`, rol: p.rol, departmentId: depDe(p.cheie).id, departmentNume: depDe(p.cheie).nume, managerId: p.manager ? idP(p.manager) : null, managerNume: p.manager ? numeP(p.manager) : null,
      status: "activ", normaProcent: p.norma, vedeDetalii: true, deschise: ale.length, blocate: ale.filter((a) => a.status === "blocat").length, intarziate: ale.filter((a) => a.intarziata).length,
      obiectiveResponsabil: obiective.filter((o) => o.responsabilId === idP(p.cheie)).length, absente,
      saptamani: luniLista.map((l, wi) => {
        const cap = capacitateSaptamana({ luni: l, normaProcent: p.norma, absente: absente.map((x) => ({ start: x.dataStart, end: x.dataSfarsit })) });
        const inc = incarcareSaptamana(ale.map((x) => ({ termen: x.termen, efortOre: x.efortOre, status: x.status })), l, l === luni);
        const ore = inc.ore + (cap.ore > 0 ? EXTRA[p.cheie][wi] : 0);
        return { luni: l, capacitateOre: cap.ore, incarcareOre: ore, fara_estimare: inc.fara_estimare, nrActivitati: inc.nr, zileAbsente: cap.zileAbsente, nivel: nivelIncarcare(ore, cap.ore) };
      }),
    };
  });

  const angajatiMici: AngajatMic[] = PERSOANE.map((p) => ({ id: idP(p.cheie), nume: p.nume, departmentId: depDe(p.cheie).id, managerId: p.manager ? idP(p.manager) : null, activ: true }));
  const optiuni: OptiuniPerformanta = { angajati: angajatiMici, departamente: DEPARTAMENTE, kpiuri: [], euAngajatId: idP("eu"), admin: true };
  const obiectiveSimple: ObiectivSimplu[] = obiective.filter((o) => o.nivel !== "individual" || true).map((o) => ({ id: o.id, titlu: o.titlu, rezultate: o.rezultate.map((r) => ({ id: r.id, titlu: r.titlu })) }));
  const dependente = activitati.filter((a) => ["de_facut", "in_lucru", "in_asteptare", "blocat"].includes(a.status)).map((a) => ({ id: a.id, titlu: a.titlu }));
  const context = { optiuni, obiective: obiectiveSimple, dependente };

  // ───────── pagini ─────────
  const saptamana: DateSaptamana = {
    luni, duminica: adauga(luni, 6), azi,
    activitati: activitati.filter((a) => a.termen && a.termen <= adauga(luni, 6) && (a.termen >= luni || a.intarziata)),
    neplanificate: activitati.filter((a) => a.termen === null),
    capacitate: null, context,
  };

  const sumar = (l: ObiectivDto[]) => {
    const cu = l.filter((o) => o.progres !== null);
    return { progresMediu: cu.length ? cu.reduce((s, o) => s + Math.min(1, o.progres ?? 0), 0) / cu.length : null, nrObiective: l.length, cuDate: cu.length };
  };
  const blocajeDecizie = blocajeDeschise.filter((b) => b.necesitaDecizie).map((b) => ({ id: b.id, motiv: b.motiv, termenRevenire: b.termenRevenire, contextTitlu: b.activitateTitlu ?? b.obiectivTitlu, rezolvator: b.rezolvatorNume, intarziat: b.intarziat }));
  const munca = membri.map((x) => ({ angajatId: x.id, nume: x.nume, deschise: x.deschise, blocate: x.blocate, intarziate: x.intarziate, ore: activitati.filter((a) => a.responsabilId === x.id).reduce((s, a) => s + (a.efortOre ?? 0), 0) })).sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  const prezentare: PrezentareDto = {
    perioada: { cod: trim.cod, start: trim.start, end: trim.end, eticheta: trim.eticheta },
    anterioara: { eticheta: anterior.eticheta, progresMediu: 0.71, nrObiective: 11, cuDate: 11 },
    curenta: sumar(obiective), obiective, optiuni, blocaje: blocajeDecizie, munca,
    termene: activitati.filter((a) => a.termen && a.termen >= azi && a.termen <= adauga(azi, 14) && a.status !== "finalizat").slice(0, 8).map((a) => ({ id: a.id, titlu: a.titlu, termen: a.termen as string, responsabilNume: a.responsabilNume, prioritate: a.prioritate, obiectivTitlu: a.obiectivTitlu })),
    recomandari: construiesteRecomandari({ obiective, blocaje: blocajeDecizie, munca, azi }), azi, actualizatLa: cand(azi, 8).toISOString(),
  };

  const euObiective = obiective.filter((o) => o.responsabilId === idP("eu") || o.colaboratori.some((c) => c.id === idP("eu")));
  const spatiulMeu: SpatiulMeu = {
    azi, luni, eu: { angajatId: idP("eu"), nume: numeP("eu") },
    prioritati: activitati.filter((a) => a.responsabilId === idP("eu")).concat(activitati.filter((a) => a.poateAproba)).slice(0, 6),
    saptamana: { total: 7, finalizate: 3 }, blocaje: blocajeDeschise, deAprobat: activitati.filter((a) => a.poateAproba),
    rezultateDeActualizat: [{ obiectivId: euObiective[0]?.id ?? s2.id, obiectivTitlu: s2.titlu, rezultatId: s2.rezultate[1].id, titlu: s2.rezultate[1].titlu, actualitate: "fara_date", ultimaActualizare: null }],
    obiective: euObiective.length ? euObiective : [s1, s2], capacitate: { luni, capacitateOre: 40, incarcareOre: 21.5, fara_estimare: 0, nrActivitati: 6, zileAbsente: 0, nivel: "echilibrat" },
  };

  // ───────── discuții și evaluări ─────────
  let nInt = 0;
  const intr = (cine: Cheie, tip: IntrareDto["tip"], zile: number, continut: Record<string, unknown>, autor: Cheie | null): IntrareDto => ({
    id: uid("int", ++nInt), tip, angajatId: idP(cine), data: tip === "checkin" ? luniSaptamanii(adauga(azi, zile)) : adauga(azi, zile), continut, autorNume: autor ? numeP(autor) : numeP(cine), esteAutor: autor === "eu", poateEdita: autor === "eu", poateSterge: true, creatLa: cand(adauga(azi, zile)).toISOString(),
  });
  const prevT = anterior.cod;
  const toateIntrarile: IntrareDto[] = [
    intr("eu", "checkin", 0, { realizari: "Am pus la punct calendarul campaniilor și am vorbit cu doi parteneri.", blocaje: "Aștept decizia juridică pentru contractul Alpha.", prioritate: "Raportul către consiliu." }, "eu"),
    intr("irina", "checkin", 0, { realizari: "Comunicatul e gata de aprobare; am confirmat un interviu.", blocaje: "", prioritate: "Calendarul de mulțumiri." }, null),
    intr("irina", "checkin", -7, { realizari: "Am finalizat calendarul T4.", blocaje: "", prioritate: "Comunicatul de presă." }, null),
    intr("radu", "checkin", -7, { realizari: "Am avut două întâlniri cu companii.", blocaje: "Contractul Alpha stă la juridic.", prioritate: "Închiderea contractului." }, null),
    intr("elena", "checkin", 0, { realizari: "Am sunat 12 donatori dormanți, 4 au promis o nouă donație.", blocaje: "", prioritate: "Curățarea datelor." }, null),
    intr("ioana", "checkin", -7, { realizari: "Am predat statisticile lunii.", blocaje: "Exportul de la contabilitate vine târziu.", prioritate: "Raportul pentru sponsorul Alpha." }, null),
    intr("irina", "1la1", -20, { subiecte: "Prioritățile T4, încărcarea lunii octombrie", decizii: "Comunicatul pentru presă trece prin aprobare.", actiuni: "Irina: calendar T4. Alexandra: decizie bugete.", urmatoarea: adauga(azi, 10) }, "eu"),
    intr("radu", "1la1", -62, { subiecte: "Pipeline companii", decizii: "Prioritizăm 5 companii mari.", actiuni: "Radu: întâlniri până la sfârșitul lunii.", urmatoarea: null }, "eu"),
    intr("elena", "1la1", -12, { subiecte: "Reactivarea donatorilor dormanți", decizii: "Apeluri scurte, cu mulțumire.", actiuni: "Elena: 30 de apeluri pe săptămână.", urmatoarea: adauga(azi, 18) }, "eu"),
    intr("ioana", "1la1", -31, { subiecte: "Rapoartele de sponsor", decizii: "Format standard pentru toate rapoartele.", actiuni: "Ioana: șablon de raport.", urmatoarea: null }, "eu"),
    intr("irina", "review_trimestrial", -5, { perioada: prevT, rezumat: "Un trimestru solid: campaniile au ieșit la termen, iar relația cu presa s-a consolidat.", puncteTari: "Planificare, comunicare clară cu partenerii.", deDezvoltat: "Delegarea sarcinilor mărunte către colegi.", partajat: true, obiective: [{ titlu: "Campanii care ajung la oameni", progres: 0.94, stare: "in_grafic" }, { titlu: "Vizibilitate în presă", progres: 0.75, stare: "in_grafic" }] }, "eu"),
    intr("radu", "review_trimestrial", -4, { perioada: prevT, rezumat: "Pipeline bun, dar contractele se închid greu.", puncteTari: "Relații bune cu companiile.", deDezvoltat: "Ritmul de urmărire după întâlniri.", partajat: false, obiective: [{ titlu: "Dezvoltăm parteneriatele cu companii", progres: 0.55, stare: "in_risc" }] }, "eu"),
    intr("elena", "autoevaluare", -6, { perioada: prevT, ceaIesit: "Mulțumirile în 48 de ore au devenit rutină.", ceamInvatat: "Cum să deschid o convorbire cu un donator care nu a mai dat de mult.", nevoieSprijin: "Un script de bază pentru apeluri dificile." }, null),
    intr("irina", "feedback", -8, { tipFeedback: "apreciere", text: "Comunicatul pentru campania de vară a fost clar și scurt, iar presa l-a preluat aproape neschimbat.", context: "Campania de vară" }, "eu"),
    intr("tudor", "feedback", -10, { tipFeedback: "sugestie", text: "La clipurile lungi, primele 10 secunde decid dacă rămân oamenii; merită un cadru de început mai puternic.", context: "Clipurile din campania de iarnă" }, "eu"),
    intr("irina", "obiectiv_dezvoltare", -30, { titlu: "Scrierea de cereri de finanțare", descriere: "Un curs și o cerere scrisă împreună cu un mentor.", termen: adauga(azi, 60), status: "in_curs", comentariu: "Cursul a început." }, "eu"),
    intr("elena", "obiectiv_dezvoltare", -15, { titlu: "Comunicare empatică la telefon", descriere: "Două ateliere și exerciții practice.", termen: adauga(azi, 90), status: "de_inceput", comentariu: "" }, "eu"),
    intr("ioana", "obiectiv_dezvoltare", -40, { titlu: "Tablouri de bord în Power BI", descriere: "Curs online și un tablou pentru raportul lunar.", termen: adauga(azi, 45), status: "in_curs", comentariu: "Primul tablou e în lucru." }, "eu"),
  ];
  const discutii = (angajatCerut: string | null): DateDiscutii => {
    const sel = PERSOANE.find((p) => idP(p.cheie) === angajatCerut)?.cheie ?? "irina";
    const ale = toateIntrarile.filter((i) => i.angajatId === idP(sel));
    const poateSelf = sel === "eu";
    const dif = (data: string | null) => (data ? Math.round((Date.parse(`${azi}T00:00:00Z`) - Date.parse(`${data}T00:00:00Z`)) / 86400000) : null);
    return {
      azi, luni, euAngajatId: idP("eu"), admin: true, persoane: PERSOANE.map((p) => ({ id: idP(p.cheie), nume: p.nume })), angajatId: idP(sel), numeAngajat: numeP(sel),
      intrari: ale.sort((a, b) => (a.data < b.data ? 1 : -1)),
      poate: { checkin: poateSelf, "1la1": !poateSelf, review_trimestrial: !poateSelf, autoevaluare: poateSelf, feedback: !poateSelf, obiectiv_dezvoltare: true },
      echipa: PERSOANE.filter((p) => p.cheie !== "eu").map((p) => {
        const unu = toateIntrarile.filter((i) => i.angajatId === idP(p.cheie) && i.tip === "1la1").sort((a, b) => (a.data < b.data ? 1 : -1))[0];
        const ck = toateIntrarile.filter((i) => i.angajatId === idP(p.cheie) && i.tip === "checkin").sort((a, b) => (a.data < b.data ? 1 : -1))[0];
        const zile = dif(unu?.data ?? null);
        return { id: idP(p.cheie), nume: p.nume, ultimulCheckin: ck?.data ?? null, checkinSaptamana: !!ck && ck.data >= luni, ultima1la1: unu?.data ?? null, urmatoarea1la1: (unu?.continut.urmatoarea as string | null) ?? null, stare1la1: (zile === null ? "niciodata" : zile > 45 ? "de_programat" : "la_zi") as "niciodata" | "de_programat" | "la_zi" };
      }),
    };
  };

  // ───────── rapoarte ─────────
  const saptRap: DateRapoarte["saptamani"] = [];
  for (let l = luniSaptamanii(trim.start); l <= trim.end; l = adauga(l, 7)) {
    const i = saptRap.length;
    const planificate = [6, 9, 12, 8, 14, 10, 7, 11, 9, 13, 8, 6, 5][i] ?? 6;
    saptRap.push({ luni: l, planificate, finalizate: l > luni ? 0 : Math.max(0, planificate - [1, 1, 3, 0, 4, 1, 2, 2, 3, 4, 3, 2, 5][i % 13]), laTermen: l > luni ? 0 : Math.max(0, planificate - 4) });
  }
  const stariMap = new Map<string, number>();
  for (const o of obiective) stariMap.set(o.stare, (stariMap.get(o.stare) ?? 0) + 1);
  const rapoarte: DateRapoarte = {
    perioada: { cod: trim.cod, start: trim.start, end: trim.end, eticheta: trim.eticheta }, azi, actualizatLa: cand(azi, 8).toISOString(), obiective, randuri: randuriRezultate(obiective),
    stari: [...stariMap].map(([stare, n]) => ({ stare: stare as never, eticheta: ETICHETE_STARE[stare as keyof typeof ETICHETE_STARE], n })),
    surse: { manual: obiective.flatMap((o) => o.rezultate).filter((r) => r.sursa === "manual").length, crm: obiective.flatMap((o) => o.rezultate).filter((r) => r.sursa === "crm").length, kpi: 0 },
    saptamani: saptRap,
    persoane: PERSOANE.map((p) => {
      const ale = activitati.filter((a) => a.responsabilId === idP(p.cheie));
      return { nume: p.nume, planificate: ale.length + 6, finalizate: ale.filter((a) => a.status === "finalizat").length + 4, laTermen: ale.filter((a) => a.status === "finalizat").length + 3, restante: ale.filter((a) => a.intarziata).length, blocajeDeschise: ale.filter((a) => a.blocaj).length };
    }).sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
    blocaje: { total: 7, deschise: 2, rezolvate: 4, zileMedii: 3.5 },
  };
  const raportEvaluari: RaportEvaluari = {
    perioada: { cod: trim.cod, start: trim.start, end: trim.end, eticheta: trim.eticheta, saptamaniScurse: Math.max(1, Math.ceil((Date.parse(`${azi}T00:00:00Z`) - Date.parse(`${trim.start}T00:00:00Z`) + 86400000) / (7 * 86400000))) }, azi, actualizatLa: cand(azi, 8).toISOString(),
    persoane: PERSOANE.map((p) => {
      const ale = toateIntrarile.filter((i) => i.angajatId === idP(p.cheie));
      const rev = ale.filter((i) => i.tip === "review_trimestrial");
      const dez = ale.filter((i) => i.tip === "obiectiv_dezvoltare");
      return {
        id: idP(p.cheie), nume: p.nume, checkinuri: ale.filter((i) => i.tip === "checkin").length, nr1la1: ale.filter((i) => i.tip === "1la1").length, ultima1la1: ale.filter((i) => i.tip === "1la1").map((i) => i.data).sort().pop() ?? null,
        review: (rev.length === 0 ? "niciunul" : rev.some((i) => i.continut.partajat === true) ? "partajat" : "privat") as "niciunul" | "privat" | "partajat", autoevaluare: ale.some((i) => i.tip === "autoevaluare"),
        feedbackPrimit: ale.filter((i) => i.tip === "feedback").length, feedbackDat: p.cheie === "eu" ? 2 : 0, dezvoltareTotal: dez.length, dezvoltareAtinse: 0, dezvoltareInCurs: dez.filter((i) => i.continut.status === "in_curs").length,
      };
    }).sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
    totaluri: { persoane: 6, cuCheckin: 5, cu1la1: 4, cuReview: 2, cuAutoevaluare: 1 },
  };

  // ───────── automatizări, notificări, șabloane ─────────
  const setari: SetariAutomatizari = { ...SETARI_IMPLICITE, multumire: true, responsabilMultumireId: idP("elena"), raportSponsor: true, responsabilRaportId: idP("ioana"), ultimaRulare: { la: cand(azi, 5).toISOString(), rezumat: { termene: 3, blocaje: 2, actualizari: 2, rezumat: 4, risc: 1, multumiri: 2, rapoarte: 1 } } };
  const notificari: NotificareDto[] = [
    { id: uid("n", 1), tip: "termen", titlu: "Termene: 3 cu termen în curând, 2 cu termenul depășit", continut: "Termen în curând:\n• Pregătește raportul trimestrial pentru consiliu\n• Revizuiește țintele din șabloanele de roluri\n\nTermen depășit:\n• Decizie: prioritățile campaniei de iarnă", link: null, citit: false, creatLa: cand(azi, 6).toISOString() },
    { id: uid("n", 2), tip: "blocaj", titlu: "Un blocaj așteaptă decizia ta", continut: "Aprobarea juridică a sponsorului întârzie; fără ea nu putem semna.", link: null, citit: false, creatLa: cand(adauga(azi, -6), 6).toISOString() },
    { id: uid("n", 3), tip: "risc", titlu: "„Dezvoltăm parteneriatele cu companii” e în urma ritmului", continut: "Responsabil: Radu Matei. Merită o discuție despre ce ar ajuta.", link: null, citit: true, creatLa: cand(adauga(azi, -2), 6).toISOString() },
    { id: uid("n", 4), tip: "rezumat", titlu: "Săptămâna ta în cifre", continut: "Activități cu termen în această săptămână: 7\nRestanțe: 2\nObiective ale echipei tale în risc sau întârziate: 3", link: null, citit: true, creatLa: cand(luni, 6).toISOString() },
  ];
  const sabloane: SablonEfectiv[] = SABLOANE_ROLURI.map((s, i) =>
    sablonEfectiv(s, i === 0 ? { confirmat: true, confirmatLa: adauga(azi, -12), tinte: { "Parteneriate strategice semnate": { tinta: 4, tintaMax: null, nivelInitial: 0 }, "Întâlniri cu parteneri potențiali": { tinta: 10, tintaMax: null, nivelInitial: 0 }, "Decizii în așteptare de peste 5 zile lucrătoare": { tinta: 3, tintaMax: null, nivelInitial: 8 } } } : undefined),
  );
  const referinte: Record<string, ReferintaCrm> = Object.fromEntries(
    Object.entries(CRM_FICTIV).map(([m, v]) => [m, { metrica: m, trimestruAnterior: Math.round(v.valoare * 0.92), etichetaAnterior: anterior.eticheta, acelasiAnTrecut: Math.round(v.valoare * 0.78), etichetaAnTrecut: `${trim.eticheta.replace(/\d{4}/, String(Number(an) - 1))}` }]),
  );

  return { azi, trim, obiective, optiuni, saptamana, prezentare, spatiulMeu, context, membri, departamente: DEPARTAMENTE, discutii, rapoarte, raportEvaluari, setari, angajatiSetari: PERSOANE.map((p) => ({ id: idP(p.cheie), nume: p.nume })), notificari, sabloane, referinte };
}
