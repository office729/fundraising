// Calendarul de fundraising: logica pură (date, grilă de lună, momente de campanie și termene fixe). Fără baze de date și fără alias-uri `@/`,
// ca să poată fi testată direct. Datele sunt șiruri YYYY-MM-DD (calendar, fără fus orar).

export type TipEveniment = "grant" | "raportare" | "campanie" | "followup" | "voluntari" | "obiectiv" | "fiscal" | "moment";

export type EvenimentCalendar = {
  id: string;
  data: string;
  titlu: string;
  tip: TipEveniment;
  href: string | null;
  detaliu: string | null;
};

export const ETICHETE_TIP_EVENIMENT: Record<TipEveniment, string> = {
  grant: "Termen grant",
  raportare: "Raportare grant",
  campanie: "Sfârșit de campanie",
  followup: "Follow-up companie",
  voluntari: "Activitate cu voluntari",
  obiectiv: "Termen intern",
  fiscal: "Termen fiscal",
  moment: "Moment de campanie",
};

const p2 = (n: number) => String(n).padStart(2, "0");
export const dataIso = (an: number, luna: number, zi: number) => `${an}-${p2(luna)}-${p2(zi)}`;

export function adaugaZile(data: string, zile: number): string {
  const [a, l, z] = data.split("-").map(Number);
  const d = new Date(Date.UTC(a, l - 1, z + zile));
  return dataIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// 0 = duminică … 6 = sâmbătă
const ziuaSaptamanii = (an: number, luna: number, zi: number) => new Date(Date.UTC(an, luna - 1, zi)).getUTCDay();

// Paștele ortodox (calendarul gregorian), algoritmul Meeus pentru calendarul iulian + 13 zile (valabil 1900–2099).
export function pasteOrtodox(an: number): string {
  const a = an % 4;
  const b = an % 7;
  const c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31);
  const zi = ((d + e + 114) % 31) + 1;
  return adaugaZile(dataIso(an, luna, zi), 13);
}

// Giving Tuesday: marțea de după Thanksgiving (a patra joi din noiembrie).
export function givingTuesday(an: number): string {
  const ziNov1 = ziuaSaptamanii(an, 11, 1);
  const prima = 1 + ((4 - ziNov1 + 7) % 7); // prima joi
  return adaugaZile(dataIso(an, 11, prima + 21), 5);
}

// Date în care oamenii sunt deja atenți la o cauză: bune pentru a lansa sau a relansa o campanie.
export function momenteCampanie(an: number): EvenimentCalendar[] {
  const m = (id: string, data: string, titlu: string, detaliu: string): EvenimentCalendar => ({ id: `moment-${id}-${an}`, data, titlu, tip: "moment", href: null, detaliu });
  return [
    m("cancer", dataIso(an, 2, 4), "Ziua Mondială a Cancerului", "Atenție mare pentru cauzele medicale."),
    m("sanatate", dataIso(an, 4, 7), "Ziua Mondială a Sănătății", "Moment bun pentru campanii de sănătate."),
    m("paste", pasteOrtodox(an), "Paștele ortodox", "Perioadă de generozitate: pregătește campania cu două-trei săptămâni înainte."),
    m("copil", dataIso(an, 6, 1), "Ziua Copilului", "Moment bun pentru cauze legate de copii."),
    m("varstnici", dataIso(an, 10, 1), "Ziua Internațională a Persoanelor Vârstnice", "Moment bun pentru cauze legate de vârstnici."),
    m("dizabilitati", dataIso(an, 12, 3), "Ziua Internațională a Persoanelor cu Dizabilități", "Moment bun pentru cauze legate de incluziune."),
    m("voluntari", dataIso(an, 12, 5), "Ziua Internațională a Voluntarilor", "Mulțumește voluntarilor și recrutează alții."),
    m("giving", givingTuesday(an), "Giving Tuesday", "Zi dedicată donațiilor, urmărită și în România."),
    m("craciun", dataIso(an, 12, 25), "Crăciunul", "Sezonul cu cele mai multe donații: lansează campania din noiembrie."),
  ];
}

// Termene fixe cunoscute. Verifică mereu termenele fiscale pe anaf.ro: se pot schimba de la un an la altul.
export function termeneFiscale(an: number): EvenimentCalendar[] {
  return [
    {
      id: `fiscal-f230-${an}`,
      data: dataIso(an, 5, 25),
      titlu: "Termen Formular 230 (redirecționarea a 3,5% din impozit)",
      tip: "fiscal",
      href: null,
      detaliu: "Până la această dată contribuabilii pot depune formularul. Trimite remindere cu 2–3 săptămâni înainte.",
    },
    {
      id: `fiscal-sfarsit-an-${an}`,
      data: dataIso(an, 12, 31),
      titlu: "Încheierea anului fiscal",
      tip: "fiscal",
      href: null,
      detaliu: "Companiile își închid planul de sponsorizări al anului: contactează-le din timp și verifică cu contabilul ce se poate finaliza până atunci.",
    },
  ];
}

// Evenimentele care nu vin din date (momente + termene fixe) ce cad între două date, inclusiv.
export function evenimenteStatice(de: string, panaData: string): EvenimentCalendar[] {
  const aniDe = Number(de.slice(0, 4));
  const aniPana = Number(panaData.slice(0, 4));
  const toate: EvenimentCalendar[] = [];
  for (let an = aniDe; an <= aniPana; an++) toate.push(...momenteCampanie(an), ...termeneFiscale(an));
  return toate.filter((e) => e.data >= de && e.data <= panaData);
}

export type ZiGrila = { data: string; inLuna: boolean; azi: boolean };

// Grila unei luni (luni–duminică): săptămâni complete, cu zilele lunii vecine ca să se completeze rândurile.
export function grilaLuna(an: number, luna: number, azi: string): { saptamani: ZiGrila[][]; de: string; pana: string } {
  const prima = dataIso(an, luna, 1);
  const decalaj = (ziuaSaptamanii(an, luna, 1) + 6) % 7; // luni = 0
  const start = adaugaZile(prima, -decalaj);
  const zileInLuna = new Date(Date.UTC(an, luna, 0)).getUTCDate();
  const nrSaptamani = Math.ceil((decalaj + zileInLuna) / 7);
  const saptamani: ZiGrila[][] = [];
  for (let s = 0; s < nrSaptamani; s++) {
    const saptamana: ZiGrila[] = [];
    for (let z = 0; z < 7; z++) {
      const data = adaugaZile(start, s * 7 + z);
      saptamana.push({ data, inLuna: data.slice(0, 7) === prima.slice(0, 7), azi: data === azi });
    }
    saptamani.push(saptamana);
  }
  return { saptamani, de: start, pana: saptamani[saptamani.length - 1][6].data };
}

// „2026-10” → { an, luna }; orice altceva → luna curentă (din `azi`).
export function lunaDinParametru(param: string | undefined, azi: string): { an: number; luna: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (m) {
    const an = Number(m[1]);
    const luna = Number(m[2]);
    if (an >= 2000 && an <= 2100 && luna >= 1 && luna <= 12) return { an, luna };
  }
  return { an: Number(azi.slice(0, 4)), luna: Number(azi.slice(5, 7)) };
}

export function lunaVecina(an: number, luna: number, delta: number): string {
  const d = new Date(Date.UTC(an, luna - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}`;
}

export const NUME_LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

// Evenimentele grupate pe zi, în ordinea datei; în aceeași zi, termenele (grant, fiscal) înaintea momentelor de campanie.
const ORDINE_TIP: Record<TipEveniment, number> = { grant: 0, raportare: 1, fiscal: 2, campanie: 3, obiectiv: 4, followup: 5, voluntari: 6, moment: 7 };
export function grupeazaPeZile(evenimente: EvenimentCalendar[]): Map<string, EvenimentCalendar[]> {
  const harta = new Map<string, EvenimentCalendar[]>();
  for (const e of [...evenimente].sort((a, b) => a.data.localeCompare(b.data) || ORDINE_TIP[a.tip] - ORDINE_TIP[b.tip] || a.titlu.localeCompare(b.titlu))) {
    const lista = harta.get(e.data) ?? [];
    lista.push(e);
    harta.set(e.data, lista);
  }
  return harta;
}


// Rezumatul săptămânal pe e-mail: ce cere acțiune în următoarele 7 zile (inclusiv azi), fără momentele de campanie, plus momentele din următoarele 14 zile.
export type RezumatSaptamana = { termene: EvenimentCalendar[]; momente: EvenimentCalendar[] };

export function selecteazaPentruRezumat(evenimente: EvenimentCalendar[], azi: string): RezumatSaptamana {
  const peste7 = adaugaZile(azi, 7);
  const peste14 = adaugaZile(azi, 14);
  const ordine = (a: EvenimentCalendar, b: EvenimentCalendar) => a.data.localeCompare(b.data) || a.titlu.localeCompare(b.titlu);
  return {
    termene: evenimente.filter((e) => e.tip !== "moment" && e.data >= azi && e.data <= peste7).sort(ordine),
    momente: evenimente.filter((e) => e.tip === "moment" && e.data >= azi && e.data <= peste14).sort(ordine),
  };
}
