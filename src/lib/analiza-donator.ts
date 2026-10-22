// Analiză deterministă a unui donator din istoricul agregat de donații: ritm, data probabilă a următoarei donații, risc de pierdere,
// valoare estimată de viitor (CLV simplu). Fără AI, fără servicii externe și fără trimiterea datelor donatorilor în afara platformei.
// Sumele sunt în unitatea monedei donațiilor (lei). Modul pur, fără importuri: rulează identic pe server, în client și în teste.
// Portat din CRM-ul Asociației Salvează o Inimă (lib/analiza-donator.ts), adaptat la sume în lei.

export type IntrareAnaliza = {
  primaAt: Date | string | null;
  ultimaAt: Date | string | null;
  nr: number;
  total: number;
};

export type NivelRisc = "scazut" | "mediu" | "ridicat" | "necunoscut";

export type Analiza = {
  nr: number;
  total: number;
  cadentaZile: number | null; // ritmul mediu între donații
  urmatoareaAt: string | null; // ISO: data probabilă a următoarei donații
  valoareAnuala: number | null; // ritm valoric pe an
  valoareViitor: number | null; // valoare estimată de viitor (CLV simplu)
  risc: NivelRisc;
  riscMotiv: string;
  eticheta: string;
};

const ZI = 86_400_000;

function laData(v: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function analizeazaDonator(x: IntrareAnaliza, acum: Date = new Date()): Analiza {
  const prima = laData(x.primaAt);
  const ultima = laData(x.ultimaAt);
  const nr = Math.max(0, Math.floor(x.nr || 0));
  const total = Math.max(0, Number(x.total) || 0);

  if (nr === 0 || !ultima) {
    return { nr, total, cadentaZile: null, urmatoareaAt: null, valoareAnuala: null, valoareViitor: null, risc: "necunoscut", riscMotiv: "Fără donații înregistrate.", eticheta: "Fără donații" };
  }

  const zileDeLaUltima = Math.max(0, (acum.getTime() - ultima.getTime()) / ZI);

  // Cadența: media intervalelor dintre donații (cere cel puțin 2 donații și o primă dată validă).
  let cadentaZile: number | null = null;
  if (nr >= 2 && prima && ultima.getTime() > prima.getTime()) {
    cadentaZile = (ultima.getTime() - prima.getTime()) / ZI / (nr - 1);
  }

  const urmatoareaAt = cadentaZile ? new Date(ultima.getTime() + cadentaZile * ZI).toISOString() : null;

  // Ritm valoric pe an: totalul împărțit la vechime (dacă are cel puțin un an), altfel totalul.
  let valoareAnuala: number | null;
  if (prima && ultima.getTime() > prima.getTime()) {
    const vechimeAni = (ultima.getTime() - prima.getTime()) / ZI / 365;
    valoareAnuala = vechimeAni >= 1 ? Math.round(total / vechimeAni) : total;
  } else {
    valoareAnuala = total;
  }

  // Risc de pierdere.
  let risc: NivelRisc;
  let riscMotiv: string;
  let eticheta: string;
  if (cadentaZile) {
    const raport = zileDeLaUltima / cadentaZile;
    if (raport <= 1.2) {
      risc = "scazut";
      riscMotiv = "Donează constant și e la zi cu ritmul lui.";
      eticheta = "Fidel";
    } else if (raport <= 2.5) {
      risc = "mediu";
      riscMotiv = `A întârziat: a trecut de ~${(Math.round(raport * 10) / 10).toLocaleString("ro-RO")}× ritmul lui obișnuit. Merită un contact.`;
      eticheta = "În întârziere";
    } else {
      risc = "ridicat";
      riscMotiv = `Mult peste ritm (~${Math.round(raport)}× intervalul lui): probabil pierdut. Reactivare urgentă.`;
      eticheta = "La risc";
    }
  } else {
    // Donator unic (o singură donație).
    const luni = Math.max(1, Math.round(zileDeLaUltima / 30));
    if (luni <= 6) {
      risc = "mediu";
      riscMotiv = `Donator unic, recent (acum ~${luni} luni): poate fi transformat în donator recurent.`;
      eticheta = "Donator unic";
    } else {
      risc = "ridicat";
      riscMotiv = `Donator unic, rece de ~${luni} luni: a donat o singură dată.`;
      eticheta = "Unic, rece";
    }
  }

  // Valoare estimată de viitor (CLV simplu): ritmul anual × anii probabili rămași, în funcție de risc.
  const aniViitor = risc === "scazut" ? 3 : risc === "mediu" ? 1.5 : 0.5;
  const valoareViitor = valoareAnuala != null ? Math.round(valoareAnuala * aniViitor) : null;

  return { nr, total, cadentaZile, urmatoareaAt, valoareAnuala, valoareViitor, risc, riscMotiv, eticheta };
}

const ORDINE_RISC: Record<NivelRisc, number> = { ridicat: 0, mediu: 1, scazut: 2, necunoscut: 3 };

// Cine merită contactat primul: întâi riscul mai mare, apoi valoarea anuală mai mare (un donator mare la risc înaintea unuia mic).
export function comparaPrioritateReactivare(a: Analiza, b: Analiza): number {
  if (a.risc !== b.risc) return ORDINE_RISC[a.risc] - ORDINE_RISC[b.risc];
  return (b.valoareAnuala ?? 0) - (a.valoareAnuala ?? 0);
}

// Ritmul în cuvinte: „o donație la ~3 luni”.
export function ritmInCuvinte(cadentaZile: number | null): string {
  if (!cadentaZile) return "o singură donație";
  if (cadentaZile < 45) return `o donație la ~${Math.round(cadentaZile)} zile`;
  const luni = cadentaZile / 30.4;
  if (luni < 11) return `o donație la ~${Math.round(luni)} luni`;
  const ani = cadentaZile / 365;
  return ani < 1.6 ? "o donație pe an (aproximativ)" : `o donație la ~${(Math.round(ani * 10) / 10).toLocaleString("ro-RO")} ani`;
}

// Data probabilă a următoarei donații a trecut deja (donatorul a întârziat față de ritmul lui).
export function urmatoareaDepasita(a: Pick<Analiza, "urmatoareaAt">, acum: Date = new Date()): boolean {
  return a.urmatoareaAt ? new Date(a.urmatoareaAt).getTime() < acum.getTime() : false;
}
