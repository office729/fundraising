import { PRAG_IN_GRAFIC, PRAG_IN_RISC, ritmAsteptat } from "@/lib/performanta-masurare";
import type { ObiectivDto } from "@/lib/performanta-tipuri";

// Acțiuni recomandate pe pagina de prezentare. Sunt SUGESTII bazate pe reguli explicite, nu pe un model: fiecare arată regula și datele pe care se sprijină,
// iar decizia rămâne la om. Tonul e de sprijin: nu numesc vinovați și nu compară oameni între ei.

export type BlocajDecizie = { id: string; motiv: string; termenRevenire: string; contextTitlu: string | null; rezolvator: string | null; intarziat: boolean };
export type MuncaAngajat = { angajatId: string; nume: string; deschise: number; blocate: number; intarziate: number; ore: number };

export type Recomandare = {
  id: string;
  prioritate: 1 | 2 | 3; // 1 = cea mai urgentă
  titlu: string;
  text: string;
  regula: string;
  baza: string; // datele concrete pe care se sprijină sugestia
  obiectivId?: string;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;
const lista = (xs: string[], max = 3) => (xs.length <= max ? xs.join(", ") : `${xs.slice(0, max).join(", ")} și încă ${xs.length - max}`);

export function construiesteRecomandari(p: { obiective: ObiectivDto[]; blocaje: BlocajDecizie[]; munca: MuncaAngajat[]; azi: string }): Recomandare[] {
  const rec: Recomandare[] = [];
  const active = p.obiective.filter((o) => o.status === "activ");

  for (const o of active) {
    if (o.stare === "in_risc" || o.stare === "intarziat") {
      const asteptat = ritmAsteptat(o.perioadaStart, o.perioadaEnd, p.azi);
      const critic = o.stare === "intarziat";
      rec.push({
        id: `risc-${o.id}`,
        prioritate: critic ? 1 : 2,
        titlu: critic ? `„${o.titlu}” e semnificativ în urma ritmului` : `„${o.titlu}” e în urma ritmului`,
        text: `Discută cu ${o.responsabilNume ?? "responsabilul"} ce ar ajuta: resurse, termene sau o țintă mai realistă.`,
        regula: `Progresul sub ${pct(PRAG_IN_GRAFIC)} din ritmul așteptat înseamnă „în risc”, iar sub ${pct(PRAG_IN_RISC)} „întârziat”.`,
        baza: `Progres ${o.progres === null ? "—" : pct(o.progres)} față de ${pct(asteptat)} așteptat azi; ${o.rkCuDate} din ${o.rkTotal} rezultate-cheie au date.`,
        obiectivId: o.id,
      });
    }

    const manualeVechi = o.rezultate.filter((r) => r.status === "activ" && r.sursa === "manual" && (r.actualitate === "intarziata" || r.actualitate === "veche"));
    if (manualeVechi.length > 0 && o.stare !== "anulat") {
      rec.push({
        id: `act-${o.id}`,
        prioritate: 2,
        titlu: `Cere o actualizare pentru „${o.titlu}”`,
        text: `Datele nu mai sunt la zi, deci starea obiectivului poate fi înșelătoare. O actualizare scurtă le pune la punct.`,
        regula: "Un rezultat introdus manual e întârziat când a trecut peste o frecvență de actualizare de la ultima valoare.",
        baza: `${manualeVechi.length} rezultate fără actualizare la timp: ${lista(manualeVechi.map((r) => r.titlu))}.`,
        obiectivId: o.id,
      });
    }

    if (o.rkTotal === 0 || (o.rkCuDate === 0 && o.rezultate.some((r) => r.status === "activ"))) {
      rec.push({
        id: `fara-${o.id}`,
        prioritate: 3,
        titlu: o.rkTotal === 0 ? `„${o.titlu}” nu are rezultate-cheie` : `„${o.titlu}” nu are încă nicio valoare`,
        text: o.rkTotal === 0 ? "Fără rezultate-cheie, progresul nu se poate măsura. Adaugă cel puțin unul." : "Introdu prima valoare sau verifică sursa automată, ca să apară progresul.",
        regula: "Un obiectiv activ are nevoie de cel puțin un rezultat-cheie cu date, altfel progresul rămâne necunoscut (nu zero).",
        baza: o.rkTotal === 0 ? "0 rezultate-cheie." : `${o.rkTotal} rezultate-cheie, niciunul cu valoare.`,
        obiectivId: o.id,
      });
    }

    const depasite = o.rezultate.filter((r) => r.status === "activ" && r.peste && r.progres !== null && r.progres >= 1.2);
    if (depasite.length > 0) {
      rec.push({
        id: `peste-${o.id}`,
        prioritate: 3,
        titlu: `Ținta e depășită la „${o.titlu}”`,
        text: "Merită verificat dacă ținta a fost prea modestă sau dacă a apărut ceva neașteptat de bun. Schimbarea unei ținte rămâne în istoric.",
        regula: "Un rezultat la peste 120% din țintă sugerează o recalibrare.",
        baza: depasite.map((r) => `${r.titlu}: ${pct(r.progres ?? 0)}`).join("; "),
        obiectivId: o.id,
      });
    }
  }

  if (p.blocaje.length > 0) {
    const intarziate = p.blocaje.filter((b) => b.intarziat);
    rec.push({
      id: "blocaje-decizie",
      prioritate: intarziate.length > 0 ? 1 : 2,
      titlu: `${p.blocaje.length} ${p.blocaje.length === 1 ? "blocaj așteaptă" : "blocaje așteaptă"} o decizie`,
      text: "Oamenii nu pot merge mai departe până nu se hotărăște. Un răspuns rapid deblochează munca.",
      regula: "Blocajele marcate „necesită decizie” rămân vizibile aici până se rezolvă.",
      baza: `${lista(p.blocaje.map((b) => b.contextTitlu ?? b.motiv.slice(0, 40)))}${intarziate.length ? `; ${intarziate.length} au depășit termenul de revenire` : ""}.`,
    });
  }

  const incarcati = p.munca.filter((m) => m.intarziate >= 3);
  if (incarcati.length > 0) {
    rec.push({
      id: "termene-multe",
      prioritate: 2,
      titlu: "Termene depășite la mai multe activități",
      text: "Poate că volumul sau prioritățile nu mai sunt realiste. Un moment scurt de reașezare a termenelor ajută mai mult decât o reamintire.",
      regula: "Trei sau mai multe activități deschise cu termen depășit la aceeași persoană.",
      baza: incarcati.map((m) => `${m.nume}: ${m.intarziate} activități`).join("; "),
    });
  }

  return rec.sort((a, b) => a.prioritate - b.prioritate).slice(0, 8);
}
