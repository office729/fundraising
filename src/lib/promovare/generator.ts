export type DateCampanie = {
  titlu: string;
  poveste: string;
  orgName: string;
  url: string;
  sumaStransa: number;
  sumaTinta: number | null;
};

export type Etapa = {
  cheie: string;
  eticheta: string;
  activa: boolean;
  mesaj: string;
};

export type PostZilnic = {
  zi: number;
  unghi: string;
  text: string;
};

export type MesajGrup = {
  eticheta: string;
  text: string;
};

function formatLei(n: number): string {
  return `${n.toLocaleString("ro-RO")} lei`;
}

function procentDin(c: DateCampanie): number | null {
  if (!c.sumaTinta) return null;
  return Math.min(100, Math.round((c.sumaStransa / c.sumaTinta) * 100));
}

function povesteScurta(c: DateCampanie, maxLen = 220): string {
  const p = c.poveste.trim().replace(/\s+/g, " ");
  return p.length > maxLen ? `${p.slice(0, maxLen - 1)}…` : p;
}

export function genereazaEtape(c: DateCampanie): Etapa[] {
  const procent = procentDin(c);
  const ramas = c.sumaTinta ? Math.max(0, c.sumaTinta - c.sumaStransa) : null;

  const praguri: { cheie: string; eticheta: string; min: number; mesaj: (c: DateCampanie) => string }[] = [
    {
      cheie: "start",
      eticheta: "0–24%",
      min: 0,
      mesaj: (c) =>
        `Tocmai a pornit „${c.titlu}” — o campanie susținută de ${c.orgName}. Fiecare distribuire contează acum, la început, ca să ajungem la cât mai mulți oameni. ${c.url}`,
    },
    {
      cheie: "avans",
      eticheta: "25–49%",
      min: 25,
      mesaj: (c) =>
        `Am pornit bine! „${c.titlu}” a strâns deja ${formatLei(c.sumaStransa)}${c.sumaTinta ? ` din ${formatLei(c.sumaTinta)}` : ""}. Ajută-ne să menținem ritmul — distribuie mai departe. ${c.url}`,
    },
    {
      cheie: "jumatate",
      eticheta: "50–74%",
      min: 50,
      mesaj: (c) =>
        `Am ajuns la jumătatea drumului pentru „${c.titlu}”! ${formatLei(c.sumaStransa)} strânși până acum${c.sumaTinta ? `, din ${formatLei(c.sumaTinta)}` : ""}. Nu ne oprim aici — orice sumă și orice distribuire ne apropie de obiectiv. ${c.url}`,
    },
    {
      cheie: "aproape",
      eticheta: "75–99%",
      min: 75,
      mesaj: (c) =>
        `Suntem foarte aproape! Mai avem nevoie de${ramas != null ? ` ${formatLei(ramas)}` : " puțin"} ca să atingem obiectivul campaniei „${c.titlu}”. Ultimul push contează cel mai mult — distribuie acum. ${c.url}`,
    },
    {
      cheie: "atins",
      eticheta: "100%",
      min: 100,
      mesaj: (c) =>
        `Obiectivul campaniei „${c.titlu}” a fost atins — mulțumim tuturor celor care au donat și distribuit! ${c.orgName} continuă să aibă nevoie de sprijin și pentru alte cazuri. ${c.url}`,
    },
  ];

  return praguri.map((p, i) => {
    const urmatorul = praguri[i + 1];
    const activa = procent == null ? p.cheie === "start" : procent >= p.min && (!urmatorul || procent < urmatorul.min);
    return { cheie: p.cheie, eticheta: p.eticheta, activa, mesaj: p.mesaj(c) };
  });
}

export function genereazaCalendarZilnic(c: DateCampanie): PostZilnic[] {
  const procent = procentDin(c);
  const etape = genereazaEtape(c);
  const etapaCurenta = etape.find((e) => e.activa) ?? etape[0];
  const scurta = povesteScurta(c);

  return [
    {
      zi: 1,
      unghi: "Prezentarea cazului",
      text: `${c.titlu}\n\n${scurta}\n\nDacă vrei să ajuți, poți dona aici: ${c.url}`,
    },
    {
      zi: 2,
      unghi: "Progres până acum",
      text: `Actualizare „${c.titlu}”: am strâns până acum ${formatLei(c.sumaStransa)}${
        c.sumaTinta ? ` din ${formatLei(c.sumaTinta)}${procent != null ? ` (${procent}%)` : ""}` : ""
      }. Mulțumim tuturor celor care au donat deja. ${c.url}`,
    },
    {
      zi: 3,
      unghi: "De ce contează fiecare leu",
      text: `Nu e nevoie de o sumă mare — contează orice donație pentru „${c.titlu}”, susținută de ${c.orgName}. Dacă 20 de oameni donează câte 20 lei, deja e o diferență reală. ${c.url}`,
    },
    {
      zi: 4,
      unghi: "Mulțumire + reamintire",
      text: `Mulțumim tuturor celor care au donat și distribuit până acum pentru „${c.titlu}”! Dacă n-ai apucat încă, campania e tot activă: ${c.url}`,
    },
    {
      zi: 5,
      unghi: "Distribuie, nu doar dona",
      text: `Nu poți dona acum? Poți ajuta la fel de mult doar distribuind campania „${c.titlu}” mai departe, pe grupul tău sau la cineva care crezi că ar vrea să ajute. ${c.url}`,
    },
    {
      zi: 6,
      unghi: `Mesajul pragului curent (${etapaCurenta.eticheta})`,
      text: etapaCurenta.mesaj,
    },
    {
      zi: 7,
      unghi: "Recapitulare finală",
      text: `Recapitulare „${c.titlu}”: ${formatLei(c.sumaStransa)} strânși${
        c.sumaTinta ? ` din ${formatLei(c.sumaTinta)}` : ""
      } cu sprijinul vostru. Campania rămâne activă — fiecare distribuire mai contează. ${c.url}`,
    },
  ];
}

export function genereazaMesajeGrupuri(c: DateCampanie): MesajGrup[] {
  const scurta = povesteScurta(c, 160);
  return [
    {
      eticheta: "Scurt",
      text: `Susține „${c.titlu}” — campanie verificată de ${c.orgName}. ${c.url}`,
    },
    {
      eticheta: "Poveste",
      text: `${scurta}\n\nDacă vrei să ajuți, campania „${c.titlu}” e susținută de ${c.orgName}: ${c.url}`,
    },
    {
      eticheta: "Urgent",
      text: `Apel pentru „${c.titlu}” — avem nevoie de sprijinul vostru acum. Orice donație sau distribuire contează. ${c.url}`,
    },
  ];
}

export function genereazaComunicatPresa(c: DateCampanie): string {
  const procent = procentDin(c);
  return `COMUNICAT DE PRESĂ

[Localitate], [DATA]

${c.orgName} lansează un apel public pentru „${c.titlu}”

${povesteScurta(c, 400)}

Până în prezent, campania a strâns ${formatLei(c.sumaStransa)}${
    c.sumaTinta ? ` din obiectivul de ${formatLei(c.sumaTinta)}${procent != null ? ` (${procent}%)` : ""}` : ""
  }. ${c.orgName} face un apel către comunitate și către presa locală pentru a ajuta la distribuirea acestui caz către cât mai mulți oameni.

„[Citat al coordonatorului campaniei sau al unui reprezentant ${c.orgName}]”

Detalii despre campanie și modalitatea de a dona: ${c.url}

Despre ${c.orgName}
[DE COMPLETAT — scurtă prezentare a organizației: an înființare, misiune, cazuri susținute până acum.]

Contact presă
[DE COMPLETAT — nume, email, telefon]`;
}
