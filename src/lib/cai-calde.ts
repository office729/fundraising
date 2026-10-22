// „Căi calde”: pentru o firmă, verifică dacă vreo persoană de contact a ei este deja legată de organizație (donator, voluntar sau persoană de contact
// la ALTĂ firmă care a sponsorizat). O sponsorizare vine mult mai ușor când există deja o relație. Potrivirea pe e-mail sau telefon e sigură;
// pe nume e doar posibilă (nume la fel nu înseamnă aceeași persoană), deci se marchează clar și se verifică înainte. Modul pur, fără importuri:
// căutarea în baza de date e în crm/companii/cai-calde.ts. Portat din CRM-ul Asociației Salvează o Inimă.

export type PersoanaFirma = { nume: string; rol: string | null; email: string | null; telefon: string | null };
export type EntitateCunoscuta = { nume: string | null; email: string | null; telefon: string | null };

export type TipCale = "donator" | "voluntar" | "sponsor";
export type PrinCe = "email" | "telefon" | "nume";
export type Incredere = "sigur" | "posibil";

export type CaleCalda = {
  contactNume: string;
  contactRol: string | null;
  contactEmail: string | null;
  contactTelefon: string | null;
  tip: TipCale;
  prin: PrinCe;
  incredere: Incredere;
  detaliu: string;
  companyId?: string; // pentru „sponsor”: fișa firmei unde apare persoana
};

const emailMic = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

// Ultimele 9 cifre ale unui telefon (ignoră prefixul de țară, spațiile și semnele); sub 9 cifre nu e un număr de care să ne putem lega.
export function ultimele9(s: string | null | undefined): string {
  const cifre = (s ?? "").replace(/\D/g, "");
  return cifre.length >= 9 ? cifre.slice(-9) : "";
}

const TITLURI = new Set(["dl", "dna", "d-na", "domnul", "doamna", "dr", "ing", "prof", "conf", "av", "ec", "mr", "mrs", "ms"]);

// Numele aduse la o formă comparabilă: fără diacritice, fără punctuație și titluri, cuvintele în ordine alfabetică („Popescu Ion” = „Ion Popescu”).
// Un nume cu un singur cuvânt nu se compară (prea multe persoane se potrivesc).
export function numeNormalizat(s: string | null | undefined): string {
  const curat = (s ?? "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ");
  const cuvinte = curat
    .split(/[\s-]+/)
    .filter((c) => c.length > 1 && !TITLURI.has(c));
  if (cuvinte.length < 2) return "";
  return [...cuvinte].sort().join(" ");
}

export function potrivire(p: PersoanaFirma, e: EntitateCunoscuta, permiteNume = true): { prin: PrinCe; incredere: Incredere } | null {
  if (p.email && e.email && emailMic(p.email) === emailMic(e.email)) return { prin: "email", incredere: "sigur" };
  const t = ultimele9(p.telefon);
  if (t && t === ultimele9(e.telefon)) return { prin: "telefon", incredere: "sigur" };
  if (permiteNume) {
    const a = numeNormalizat(p.nume);
    if (a && a === numeNormalizat(e.nume)) return { prin: "nume", incredere: "posibil" };
  }
  return null;
}

// O persoană nu apare de două ori pentru aceeași legătură; potrivirea sigură o înlocuiește pe cea posibilă. Ordine: sigur înaintea posibil,
// apoi donator, sponsor, voluntar.
export function deduplicaSiOrdoneaza(cai: CaleCalda[]): CaleCalda[] {
  const unic = new Map<string, CaleCalda>();
  for (const c of cai) {
    const cheie = `${numeNormalizat(c.contactNume) || c.contactNume.toLowerCase()}|${c.tip}|${c.detaliu}`;
    const existent = unic.get(cheie);
    if (!existent || (existent.incredere === "posibil" && c.incredere === "sigur")) unic.set(cheie, c);
  }
  const ordineTip: Record<TipCale, number> = { donator: 0, sponsor: 1, voluntar: 2 };
  return [...unic.values()].sort((a, b) => {
    if (a.incredere !== b.incredere) return a.incredere === "sigur" ? -1 : 1;
    return ordineTip[a.tip] - ordineTip[b.tip];
  });
}

// Persoanele firmei, fără dubluri (după e-mail, telefon sau nume), ca aceeași persoană să nu fie căutată de mai multe ori.
export function persoaneUnice(persoane: PersoanaFirma[]): PersoanaFirma[] {
  const vazute = new Set<string>();
  const rezultat: PersoanaFirma[] = [];
  for (const p of persoane) {
    const cheie = emailMic(p.email) || ultimele9(p.telefon) || numeNormalizat(p.nume) || p.nume.trim().toLowerCase();
    if (!cheie || vazute.has(cheie)) continue;
    vazute.add(cheie);
    rezultat.push(p);
  }
  return rezultat;
}

// Construiește căile pentru o singură legătură (tip) dintre persoanele firmei și o listă de entități cunoscute.
export function potriveste(
  persoane: PersoanaFirma[],
  entitati: { e: EntitateCunoscuta; detaliu: string; companyId?: string }[],
  tip: TipCale,
  permiteNume = true,
): CaleCalda[] {
  const rezultat: CaleCalda[] = [];
  for (const { e, detaliu, companyId } of entitati) {
    for (const p of persoane) {
      const m = potrivire(p, e, permiteNume);
      if (!m) continue;
      rezultat.push({ contactNume: p.nume, contactRol: p.rol, contactEmail: p.email, contactTelefon: p.telefon, tip, prin: m.prin, incredere: m.incredere, detaliu, companyId });
    }
  }
  return rezultat;
}
