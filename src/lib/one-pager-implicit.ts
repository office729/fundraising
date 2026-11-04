// One Pager editabil direct pe document: curățarea textelor editate și valorile implicite ale organizației.
//
// De ce aici și nu în instrument: instrumentul (src/modules/crm/one-pager-generator/*.base.html) rulează în iframe sandbox și are propria copie a
// funcției `curataTextEditabil` (aceleași reguli, între marcajele FA-ED-START / FA-ED-END). Serverul NU are încredere în browser: valorile implicite
// salvate pe organizație trec și pe aici înainte de a ajunge în baza de date. Testul `one-pager-editabil.test.mjs` verifică ambele copii pe aceleași
// exemple, ca regulile să nu se îndepărteze una de alta.
//
// Textele nu se „escapează” aici: ele rămân text simplu (nu HTML) și sunt escapate la inserarea în document (`esc()` din instrument). Aici scoatem
// doar ce nu are ce căuta într-un câmp de contact: caractere de control, marcaje de direcție (bidi, folosite la spoofing), liniile multiple și
// lungimile exagerate.

export const LIMITE_ONE_PAGER = {
  CONTACT_NUME: 80,
  CONTACT_FUNCTIE: 80,
  CONTACT_TEL: 40,
  CONTACT_EMAIL: 120,
  CONTACT_WEB: 120,
  CONTACT_ADRESA: 160,
  IMPLICA_TEXT: 300,
  IMPLICA_CTA: 60,
} as const;

export type CampOnePager = keyof typeof LIMITE_ONE_PAGER;
export type ImplicitOnePager = Partial<Record<CampOnePager, string>>;

export const CAMPURI_ONE_PAGER = Object.keys(LIMITE_ONE_PAGER) as CampOnePager[];

export function esteCampOnePager(x: unknown): x is CampOnePager {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(LIMITE_ONE_PAGER, x);
}

// Controale C0/C1, spații de lățime zero, marcaje bidi, separatoare de linie/paragraf, BOM.
const CARACTERE_INTERZISE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]/g;
// Pictograma din fața valorii (👤 📞 ✉️ 🌐 📍), rămasă din copiere/lipire.
const ICON_INCEPUT = /^\s*(?:👤|📞|✉️?|🌐|📍)\s*/;

export function curataTextOnePager(camp: CampOnePager, brut: unknown): string {
  if (typeof brut !== "string") return "";
  let t = brut.replace(CARACTERE_INTERZISE, " ").replace(/\s+/g, " ").trim();
  t = t.replace(ICON_INCEPUT, "").trim();
  // Un text rămas „[Telefon]” e marcajul de loc gol din document, nu o valoare.
  if (/^\[[^\]]*\]$/.test(t)) return "";
  const max = LIMITE_ONE_PAGER[camp];
  if (t.length > max) {
    t = t.slice(0, max);
    // nu lăsăm jumătate dintr-o pereche surogat (emoji tăiat)
    const ultim = t.charCodeAt(t.length - 1);
    if (ultim >= 0xd800 && ultim <= 0xdbff) t = t.slice(0, -1);
    t = t.trim();
  }
  return t;
}

// Documentul salvat ca implicit pe organizație: doar câmpurile cunoscute, doar șiruri, curățate. Orice altceva se ignoră.
export function curataImplicitOnePager(date: unknown): ImplicitOnePager {
  const out: ImplicitOnePager = {};
  if (!date || typeof date !== "object" || Array.isArray(date)) return out;
  const sursa = date as Record<string, unknown>;
  for (const camp of CAMPURI_ONE_PAGER) {
    if (!Object.prototype.hasOwnProperty.call(sursa, camp)) continue;
    const v = sursa[camp];
    if (typeof v !== "string") continue;
    out[camp] = curataTextOnePager(camp, v);
  }
  return out;
}
