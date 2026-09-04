export * from "./alocari-plati";
export * from "./automatizari";
export * from "./beneficiari";
export * from "./comunicari";
export * from "./companii";
export * from "./contacte";
export * from "./contracte";
export * from "./documente";
export * from "./donatii";
export * from "./donatori";
export * from "./taskuri";

import type { Companie, EtapaCompanie } from "./companii";
import { COMPANII } from "./companii";
import { CONTRACTE } from "./contracte";
import { DONATII, lunarEvolutie } from "./donatii";
import { DONATORI } from "./donatori";
import { TASKURI } from "./taskuri";
import { DASHBOARD_MOCK_DICT } from "@/lib/i18n/dictionaries/dashboard-mock";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

function inLastDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

function zileDeLa(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// Fluxul real de sponsorizare (D177/20%): contract trimis → semnat → depus la
// ANAF → bani virați (sponsorizat) — singurul pipeline din produs, urmărit pe
// fiecare companie (vezi StagePipeline). Nu mai există un pipeline separat de
// „oportunități" cu valoare ponderată — nu are corespondent real la un ONG.
const ETAPE_ANAF: EtapaCompanie[] = ["contract_trimis", "contract_semnat", "contract_asteptare", "sponsorizat"];

export function companiiPipelineStats(companii: Companie[] = COMPANII, locale: Locale = DEFAULT_LOCALE) {
  const etapaLabel = DASHBOARD_MOCK_DICT[locale].etapaLabel;
  return ETAPE_ANAF.map((stage) => {
    const inEtapa = companii.filter((c) => c.stage === stage);
    return {
      stage,
      label: etapaLabel[stage],
      count: inEtapa.length,
      suma: inEtapa.reduce((s, c) => s + c.sumaSponsorizata, 0),
    };
  });
}

export type PerioadaKpi = { start: Date; end: Date; label: string };

export function dashboardKpis(perioada?: PerioadaKpi, locale: Locale = DEFAULT_LOCALE) {
  const dict = DASHBOARD_MOCK_DICT[locale];
  const sum = (arr: typeof DONATII) => arr.reduce((s, d) => s + d.suma, 0);

  let curent: typeof DONATII;
  let anterior: typeof DONATII;
  if (perioada) {
    const inRange = (iso: string, start: Date, end: Date) => {
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };
    curent = DONATII.filter((d) => inRange(d.data, perioada.start, perioada.end));
    const durata = perioada.end.getTime() - perioada.start.getTime();
    const prevStart = new Date(perioada.start.getTime() - durata - 1);
    const prevEnd = new Date(perioada.start.getTime() - 1);
    anterior = DONATII.filter((d) => inRange(d.data, prevStart, prevEnd));
  } else {
    curent = DONATII.filter((d) => inLastDays(d.data, 30));
    anterior = DONATII.filter((d) => !inLastDays(d.data, 30) && inLastDays(d.data, 60));
  }

  const donatiiCurent = sum(curent);
  const donatiiAnterior = sum(anterior) || 1;
  const sponsorizariIncasate = sum(curent.filter((d) => d.sursa === "companie"));
  const donatoriActivi = DONATORI.filter((d) => d.status === "activ").length;
  const donatiiRecurente = sum(curent.filter((d) => d.recurenta));
  const fonduriDisponibile = COMPANII.reduce((s, c) => s + c.sumaDisponibila, 0);
  const retentie = Math.round(
    (DONATORI.filter((d) => d.segment === "fidel" || d.segment === "recurent").length / DONATORI.length) * 100,
  );

  const evolutie = lunarEvolutie();
  const spark = (key: "pf" | "pj" | "recurent") => evolutie.map((m) => m[key]);
  const perioadaText = perioada ? perioada.label.toLowerCase() : dict.perioadaImplicita;

  return [
    {
      key: "donatii-luna",
      label: perioada ? dict.kpis.donatii : dict.kpis.donatiiLuna,
      valoare: donatiiCurent,
      variatie: Math.round(((donatiiCurent - donatiiAnterior) / donatiiAnterior) * 100),
      spark: spark("pf"),
      explicatie: dict.kpis.explicatieDonatii(perioadaText),
      href: "donatori",
    },
    {
      key: "sponsorizari",
      label: dict.kpis.sponsorizari,
      valoare: sponsorizariIncasate,
      variatie: 12,
      spark: spark("pj"),
      explicatie: dict.kpis.explicatieSponsorizari(perioadaText),
      href: "companii",
    },
    {
      key: "donatori-activi",
      label: dict.kpis.donatoriActivi,
      valoare: donatoriActivi,
      variatie: 4,
      spark: [donatoriActivi - 3, donatoriActivi - 2, donatoriActivi - 1, donatoriActivi],
      explicatie: dict.kpis.explicatieDonatoriActivi,
      href: "donatori",
      unitate: "count" as const,
    },
    {
      key: "recurente",
      label: dict.kpis.recurente,
      valoare: donatiiRecurente,
      variatie: 8,
      spark: spark("recurent"),
      explicatie: dict.kpis.explicatieRecurente(perioadaText),
      href: "donatori",
    },
    {
      key: "fonduri",
      label: dict.kpis.fonduri,
      valoare: fonduriDisponibile,
      variatie: -3,
      spark: [fonduriDisponibile * 0.9, fonduriDisponibile * 0.95, fonduriDisponibile * 0.98, fonduriDisponibile],
      explicatie: dict.kpis.explicatieFonduri,
      href: "fonduri-plati",
    },
    {
      key: "retentie",
      label: dict.kpis.retentie,
      valoare: retentie,
      variatie: 2,
      spark: [retentie - 4, retentie - 2, retentie - 1, retentie],
      explicatie: dict.kpis.explicatieRetentie,
      href: "rfm",
      unitate: "percent" as const,
    },
  ];
}

export function centruDeActiuni(taskuriLive: typeof TASKURI = TASKURI, locale: Locale = DEFAULT_LOCALE) {
  const dict = DASHBOARD_MOCK_DICT[locale];
  const items: {
    id: string;
    motiv: string;
    prioritate: "mare" | "medie" | "mica";
    responsabil: string;
    termen: string;
    tip: "donator" | "companie" | "contract" | "task" | "campanie";
    tinta: string;
    href: string;
  }[] = [];

  taskuriLive
    .filter((t) => t.status === "intarziat")
    .slice(0, 3)
    .forEach((t) =>
      items.push({
        id: t.id,
        motiv: dict.actionCenter.taskIntarziat(t.titlu, t.legatDe.nume),
        prioritate: t.prioritate,
        responsabil: t.responsabil,
        termen: t.termenLa,
        tip: "task",
        tinta: t.legatDe.nume,
        // "companii" (lista, nu un id anume) — modulul Companii e conectat la
        // date reale, iar id-urile astea sunt din prototipul mock; un link
        // direct spre companii/<id-mock> ar da 404.
        href: t.legatDe.tip === "companie" ? "companii" : `donatori/${t.legatDe.id}`,
      }),
    );

  CONTRACTE.filter((c) => c.status === "semnat")
    .slice(0, 2)
    .forEach((c) =>
      items.push({
        id: c.id,
        motiv: dict.actionCenter.contractExpira(c.companyNume),
        prioritate: "mare",
        responsabil: "Andreea Vasilescu",
        termen: c.expiraLa,
        tip: "contract",
        tinta: c.companyNume,
        href: "companii",
      }),
    );

  COMPANII.filter((c) => ETAPE_ANAF.includes(c.stage) && c.stage !== "sponsorizat" && zileDeLa(c.ultimaActivitateLa) > 20)
    .slice(0, 2)
    .forEach((c) =>
      items.push({
        id: c.id,
        motiv: dict.actionCenter.etapaFaraActivitate(dict.etapaLabel[c.stage], zileDeLa(c.ultimaActivitateLa), c.nume),
        prioritate: "medie",
        responsabil: c.responsabil,
        termen: c.ultimaActivitateLa,
        tip: "companie",
        tinta: c.nume,
        href: "companii",
      }),
    );

  return items;
}
