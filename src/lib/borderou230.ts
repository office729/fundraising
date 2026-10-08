// Borderou Formular 230 — centralizatorul pe care entitatea beneficiară îl depune la ANAF. Un borderou conține cel mult 50 de
// formulare; când se umple, următoarele formulare merg automat în borderoul următor. Borderourile sunt separate pe cont
// beneficiar (alt IBAN / CIF) și pe an fiscal. Structura XML urmează generatorul din formularul oficial ANAF (modul „borderou”).

export const MAX_PE_BORDEROU = 50;
export const PROCENT_IMPLICIT = "3.5";

export type RandAtribuire = { id: string; beneficiarId: string | null; an: number; borderouNr: number | null; createdAt: Date };

// Atribuie numere de borderou formularelor care nu au încă unul. Pe fiecare grup (beneficiar, an): se continuă borderoul cu
// numărul cel mai mare dacă mai are loc (< 50), altfel se deschide următorul. Formularele deja atribuite nu se mută niciodată.
export function atribuieBorderouri(randuri: RandAtribuire[], max = MAX_PE_BORDEROU): Map<string, number> {
  const noi = new Map<string, number>();
  const grupuri = new Map<string, RandAtribuire[]>();
  for (const r of randuri) {
    const cheie = `${r.beneficiarId ?? "-"}|${r.an}`;
    const lista = grupuri.get(cheie) ?? [];
    lista.push(r);
    grupuri.set(cheie, lista);
  }
  for (const lista of grupuri.values()) {
    const numaratori = new Map<number, number>();
    let ultim = 0;
    for (const r of lista) {
      if (r.borderouNr != null) {
        numaratori.set(r.borderouNr, (numaratori.get(r.borderouNr) ?? 0) + 1);
        ultim = Math.max(ultim, r.borderouNr);
      }
    }
    const deAtribuit = lista.filter((r) => r.borderouNr == null).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let curent = ultim === 0 ? 1 : ultim;
    for (const r of deAtribuit) {
      if ((numaratori.get(curent) ?? 0) >= max) curent += 1;
      numaratori.set(curent, (numaratori.get(curent) ?? 0) + 1);
      noi.set(r.id, curent);
    }
  }
  return noi;
}

export type DeclaratieBorderou = {
  nrPoz: number;
  nume: string;
  initiala: string;
  prenume: string;
  cnp: string;
  adresa: string;
  telefon: string;
  email: string;
  doiAni: boolean;
  acord: boolean;
  dataCompletarii: string; // dd.mm.yyyy
};

export type DateBorderou = {
  nr: number;
  an: number;
  dataBorderou: string; // dd.mm.yyyy
  luna: number;
  entitate: { den: string; cui: string; iban: string };
  declaratii: DeclaratieBorderou[];
};

// Adresa în același format ca în generatorul ANAF: „strada X nr. N bl. B sc. S et. E apt. A loc. L jud. J cod postal C”.
export function adresaAnaf(a: { strada?: string | null; numar?: string | null; bloc?: string | null; scara?: string | null; etaj?: string | null; apartament?: string | null; localitate?: string | null; judet?: string | null; codPostal?: string | null }): string {
  const p: string[] = [];
  if (a.strada) p.push(`strada ${a.strada}`);
  if (a.numar) p.push(`nr. ${a.numar}`);
  if (a.bloc) p.push(`bl. ${a.bloc}`);
  if (a.scara) p.push(`sc. ${a.scara}`);
  if (a.etaj) p.push(`et. ${a.etaj}`);
  if (a.apartament) p.push(`apt. ${a.apartament}`);
  if (a.localitate) p.push(`loc. ${a.localitate}`);
  if (a.judet) p.push(`jud. ${a.judet}`);
  if (a.codPostal) p.push(`cod postal ${a.codPostal}`);
  return p.join(" ");
}

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// XML în formatul borderoului oficial (borderou230 / declaratie230 / bursa_entit). Construit după generatorul din formularul
// ANAF; nu a fost verificat cu validatorul ANAF — se recomandă deschiderea în formularul oficial înainte de depunere.
export function xmlBorderou(d: DateBorderou): string {
  const a = (nume: string, v: string | number | null | undefined) => (v == null || v === "" ? "" : ` ${nume}="${xmlEsc(String(v))}"`);
  const randuri = d.declaratii
    .map(
      (x) =>
        `\n\t<declaratie230${a("nume_c", x.nume)}${a("initiala_c", x.initiala)}${a("prenume_c", x.prenume)}${a("adresa_c", x.adresa)}${a("telefon_c", x.telefon)}${a("email_c", x.email)}${a("cif_c", x.cnp)}${a("nr_poz", x.nrPoz)}>` +
        `\n\t<bursa_entit bifa_entitate="1"${a("den_entitate", d.entitate.den)}${a("cif_entitate", d.entitate.cui)}${a("cont_entitate", d.entitate.iban)}${a("procent", PROCENT_IMPLICIT)}${a("valabilitate_distribuire", x.doiAni ? "1" : "2")}${a("acord", x.acord ? "1" : "0")}/>` +
        `</declaratie230>`,
    )
    .join("");
  return (
    `<?xml version="1.0"?>\n<borderou230${a("nr_borderou", d.nr)}${a("data_borderou", d.dataBorderou)}${a("luna", d.luna)}${a("an", d.an)}${a("den", d.entitate.den)}${a("cui", d.entitate.cui)}` +
    ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="mfp:anaf:dgti:b230:declaratie:v1 B230.xsd" xmlns="mfp:anaf:dgti:b230:declaratie:v1">${randuri}</borderou230>`
  );
}
