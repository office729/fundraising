// Validarea asistentului de creare a campaniei — logică pură (fără React, fără baza de date), ca să poată fi testată.
// Regulile sunt cele ale acțiunii de pe server (creeazaPaginaAdminAction), plus câteva praguri de calitate afișate ca avertismente.

export type CampanieForm = {
  titlu: string;
  template: string;
  sumaTinta: string;
  judet: string;
  localitate: string;
  poveste: string;
  numeCreator: string;
  emailCreator: string;
};

export const CAMPANIE_GOALA: CampanieForm = { titlu: "", template: "", sumaTinta: "", judet: "", localitate: "", poveste: "", numeCreator: "", emailCreator: "" };

export const LIMITE = { titluMin: 5, titluMax: 120, povesteMin: 40, povesteRecomandat: 300, povesteMax: 8000, sumaMax: 10_000_000 } as const;

export const PASI = ["Detalii", "Poveste", "Poză", "Donații", "Verificare"] as const;
export type EroriCampanie = Partial<Record<keyof CampanieForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Suma țintă: gol = fără țintă; altfel un număr întreg pozitiv (acceptă „10.000”, „10 000”, „10000”).
export function parseazaSuma(brut: string): { valoare: number | null; eroare: string | null } {
  const curat = brut.replace(/[\s.]/g, "").replace(",", ".");
  if (!curat) return { valoare: null, eroare: null };
  const n = Number(curat);
  if (!Number.isFinite(n) || n <= 0) return { valoare: null, eroare: "Introdu o sumă pozitivă, de exemplu 10.000." };
  if (n > LIMITE.sumaMax) return { valoare: null, eroare: "Suma pare prea mare. Verifică dacă ai scris-o corect." };
  return { valoare: Math.round(n), eroare: null };
}

export function valideazaPas(pas: number, f: CampanieForm): EroriCampanie {
  const e: EroriCampanie = {};
  if (pas === 0) {
    const titlu = f.titlu.trim();
    if (!titlu) e.titlu = "Dă campaniei un titlu.";
    else if (titlu.length < LIMITE.titluMin) e.titlu = "Titlul e prea scurt. Spune pe scurt ce vrei să schimbi.";
    else if (titlu.length > LIMITE.titluMax) e.titlu = `Titlul poate avea cel mult ${LIMITE.titluMax} de caractere.`;
    if (!f.template) e.template = "Alege domeniul campaniei.";
    const suma = parseazaSuma(f.sumaTinta);
    if (suma.eroare) e.sumaTinta = suma.eroare;
    if (!f.numeCreator.trim()) e.numeCreator = "Spune cine coordonează campania.";
    const email = f.emailCreator.trim();
    if (!email) e.emailCreator = "Adaugă un email de contact.";
    else if (!EMAIL.test(email)) e.emailCreator = "Adresa de email nu pare completă.";
  }
  if (pas === 1) {
    const poveste = f.poveste.trim();
    if (!poveste) e.poveste = "Povestea campaniei este obligatorie.";
    else if (poveste.length < LIMITE.povesteMin) e.poveste = "Scrie măcar câteva fraze: cine are nevoie de ajutor și de ce.";
    else if (poveste.length > LIMITE.povesteMax) e.poveste = `Povestea poate avea cel mult ${LIMITE.povesteMax.toLocaleString("ro-RO")} de caractere.`;
  }
  return e;
}

// Toate erorile care blochează publicarea, cu primul pas care trebuie corectat.
export function valideazaTot(f: CampanieForm): { erori: EroriCampanie; primulPas: number | null } {
  const e0 = valideazaPas(0, f);
  const e1 = valideazaPas(1, f);
  const erori = { ...e0, ...e1 };
  const primulPas = Object.keys(e0).length ? 0 : Object.keys(e1).length ? 1 : null;
  return { erori, primulPas };
}

export type Avertisment = { cheie: string; text: string; pas: number };

// Lucruri care nu blochează publicarea, dar fac campania mai slabă. Afișate la verificare.
export function avertismente(f: CampanieForm, areImagine: boolean): Avertisment[] {
  const a: Avertisment[] = [];
  const poveste = f.poveste.trim().length;
  if (poveste > 0 && poveste < LIMITE.povesteRecomandat) {
    a.push({ cheie: "poveste", pas: 1, text: "Povestea e scurtă. Câteva paragrafe despre cine ajută, de ce și ce se face cu banii inspiră mai multă încredere." });
  }
  if (!areImagine) a.push({ cheie: "poza", pas: 2, text: "Campania nu are poză. O fotografie reală face pagina mai credibilă și mai ușor de recunoscut pe rețele." });
  if (!parseazaSuma(f.sumaTinta).valoare) a.push({ cheie: "tinta", pas: 0, text: "Nu ai o sumă țintă. Pagina va arăta doar suma strânsă, fără bara de progres." });
  if (!f.judet.trim()) a.push({ cheie: "judet", pas: 0, text: "Județul lipsește. Ajută la recomandarea presei și a grupurilor locale." });
  return a;
}

export const arataGol = (f: CampanieForm) => !(f.titlu.trim() || f.poveste.trim() || f.sumaTinta.trim() || f.judet.trim() || f.localitate.trim());
