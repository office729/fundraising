// Scriptul de apel către o firmă: deschidere, calificare (autoritate, buget, moment), propunerea mecanismului fiscal, cererea unei întâlniri de 15 minute și răspunsuri rapide
// la obiecții. Text pur, personalizat cu datele firmei; fără importuri, ca să se poată testa direct.
// Sunt puncte de plecare de adaptat, nu texte finale: sumele, termenele și mecanismele fiscale se confirmă cu contabilul organizației.

export type MecanismScript = "d177" | "mec20" | "ambele";

export type VariabileScript = {
  firma: string;
  ong: string; // numele organizației
  askLei: number; // suma de la care pornește discuția (de mână sau estimată din bilanț); 0 = necunoscută
  mecanism: MecanismScript;
  sezon: string; // propoziția despre fereastra fiscală curentă (vezi propozitieSezon)
  persoana: string | null; // prenumele persoanei pe care o suni, dacă o știi
};

export type SectiuneScript = { titlu: string; pasi: string[] };
export type ObiectieScript = { obiectie: string; raspuns: string };
export type ScriptApel = { sectiuni: SectiuneScript[]; obiectii: ObiectieScript[] };

// Mecanismul din marcajele firmei: ambele bifate sau niciuna = ambele (nu forțăm o alegere pe care echipa nu a făcut-o).
export function mecanismDinMarcaje(d177: boolean, mec20: boolean): MecanismScript {
  if (d177 && !mec20) return "d177";
  if (mec20 && !d177) return "mec20";
  return "ambele";
}

// Propoziția despre momentul fiscal, după ferestrele deschise acum (vezi lib/ferestre-fiscale.ts): ambele ferestre, doar D177 sau niciuna.
export function propozitieSezon(ferestre: readonly { cheie: string }[]): string {
  const are = (c: string) => ferestre.some((f) => f.cheie === c);
  if (are("sponsorizare20") && are("d177")) return "Suntem acum în fereastra D177 (termen 25 iunie) și în cea a sponsorizării cu contract (31 decembrie): e momentul să decideți pe anul acesta.";
  if (are("d177")) return "Suntem în fereastra D177: termenul de depunere e 25 iunie, deci merită decis din timp.";
  return "Pregătim din timp: fereastra D177 se redeschide în octombrie.";
}

const MECANISM_TEXT: Record<MecanismScript, string> = {
  d177: "prin Declarația 177 puteți redirecționa până la 20% din impozitul pe profit către organizație: bani care oricum ajung la stat, deci nu costă firma nimic în plus",
  mec20: "printr-un contract de sponsorizare, scăzut din impozitul pe profit în limita a 20% din impozit și a 0,75% din cifra de afaceri, deci costul real pentru firmă e mic",
  ambele: "fie prin Declarația 177 (redirecționați până la 20% din impozitul pe profit, bani care oricum ajung la stat), fie printr-un contract de sponsorizare scăzut din impozit în limita a 20% din impozit și a 0,75% din cifra de afaceri",
};

export function textMecanism(m: MecanismScript): string {
  return MECANISM_TEXT[m];
}

const rotunjit = (n: number) => (n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n));

export function scriptApel(v: VariabileScript): ScriptApel {
  const salut = v.persoana ? `Bună ziua, ${v.persoana}!` : "Bună ziua!";
  const suma = v.askLei > 0 ? `de ordinul a ${rotunjit(v.askLei).toLocaleString("ro-RO")} lei` : "adaptat la ce vă permite impozitul pe profit";
  return {
    sectiuni: [
      {
        titlu: "1. Deschidere (15 secunde)",
        pasi: [
          `${salut} Sunt de la ${v.ong}. Vă sun scurt, să nu vă răpesc timpul: lucrăm cu firme care vor să sprijine o cauză fără să le crească cheltuielile. Aveți un minut?`,
          "Dacă nu: „Când vă sun înapoi, mai bine dimineața sau după-amiaza?” și treci data în fișa firmei.",
        ],
      },
      {
        titlu: "2. Calificare: autoritate, buget, moment",
        pasi: [
          `Autoritate: „La ${v.firma}, cine hotărăște sponsorizările sau redirecționarea impozitului pe profit: dumneavoastră, conducerea sau departamentul financiar?”`,
          "Buget: „Anul acesta aveți un plan de sponsorizări sau de responsabilitate socială? Ați mai sprijinit organizații ca a noastră?”",
          `Moment: ${v.sezon} „Când vă este mai ușor să discutăm cifrele cu financiarul?”`,
        ],
      },
      {
        titlu: "3. Propune mecanismul",
        pasi: [`„Pentru ${v.firma} se poate face ${MECANISM_TEXT[v.mecanism]}. Ne ocupăm noi de documente. Ordinul de mărime ar fi ${suma}, de confirmat cu contabilul dumneavoastră.”`],
      },
      {
        titlu: "4. Cererea: 15 minute",
        pasi: [
          "„Vă propun 15 minute, online sau la telefon, cu dumneavoastră și cu cine se ocupă de impozit: să vă arăt cifrele pe firma voastră. Vă convine marți sau joi?”",
          "Fixează ziua și ora, apoi trimite imediat invitația pe e-mail, cu o frază despre ce discutați.",
        ],
      },
    ],
    obiectii: [
      { obiectie: "„Nu avem buget.”", raspuns: "Redirecționarea impozitului pe profit nu e un buget nou: banii oricum se duc la stat, iar firma doar alege ca până la 20% din impozit să meargă la o cauză. Costul în plus e zero." },
      { obiectie: "„Poate anul viitor.”", raspuns: "Ferestrele fiscale se închid: D177 se depune până pe 25 iunie, iar contractele de sponsorizare trebuie semnate până pe 31 decembrie. Ce nu se face acum se pierde pe anul acesta." },
      { obiectie: "„Trimiteți un e-mail.”", raspuns: "Cu plăcere, vi-l trimit chiar acum. Ca să fie util, spuneți-mi cui să i-l adresez și când vă pot suna ca să-l parcurgem împreună, 5 minute." },
      { obiectie: "„Susținem deja o altă organizație.”", raspuns: "Foarte bine, înseamnă că vă pasă. Sumele se pot împărți: redirecționarea impozitului și cele 3,5% din impozitul angajaților prin Formularul 230 sunt mecanisme diferite, care se completează." },
    ],
  };
}

// Scriptul ca text simplu, pentru butonul „Copiază”.
export function scriptCaText(s: ScriptApel): string {
  const parti = s.sectiuni.map((x) => `${x.titlu}\n${x.pasi.map((p) => `- ${p}`).join("\n")}`);
  const obiectii = `Obiecții rapide\n${s.obiectii.map((o) => `- ${o.obiectie} ${o.raspuns}`).join("\n")}`;
  return [...parti, obiectii].join("\n\n");
}
