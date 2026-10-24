// Câmpuri personalizate: fiecare organizație își adaugă la donatori (și la firme) câmpurile ei: text, număr, dată, alegere dintr-o listă sau da/nu. Definițiile stau într-un tabel,
// valorile într-o coloană jsonb a donatorului sau firmei. Fără importuri, ca să se poată testa direct.

export const ENTITATI_CAMP = ["donator", "companie"] as const;
export type EntitateCamp = (typeof ENTITATI_CAMP)[number];
export const TIPURI_CAMP = ["text", "numar", "data", "alegere", "da_nu"] as const;
export type TipCamp = (typeof TIPURI_CAMP)[number];
export const ETICHETE_TIP_CAMP: Record<TipCamp, string> = { text: "Text", numar: "Număr", data: "Dată", alegere: "Alegere din listă", da_nu: "Da / Nu" };

export const LIMITE_CAMP = { maxCampuriPeEntitate: 20, maxEticheta: 60, maxText: 500, maxOptiuni: 20, maxOptiune: 60, maxNumar: 1e12 } as const;

export type DefinitieCamp = {
  id?: string;
  entitate: EntitateCamp;
  cheie: string;
  eticheta: string;
  tip: TipCamp;
  optiuni: string[]; // doar la „alegere”
  ordine?: number;
  activ?: boolean;
};

export type ValoareCamp = string | number | boolean;
export type ValoriCamp = Record<string, ValoareCamp>;

export const esteEntitateCamp = (x: unknown): x is EntitateCamp => typeof x === "string" && (ENTITATI_CAMP as readonly string[]).includes(x);
export const esteTipCamp = (x: unknown): x is TipCamp => typeof x === "string" && (TIPURI_CAMP as readonly string[]).includes(x);

const faraDiacritice = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Cheia stabilă dintr-o etichetă: litere mici fără diacritice, „_” între cuvinte, fără început de cifră. „Data nașterii” → „data_nasterii”. Cheia nu se schimbă după creare.
export function cheieDinEticheta(eticheta: string): string {
  const baza = faraDiacritice(String(eticheta ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  if (!baza) return "";
  return /^[0-9]/.test(baza) ? `c_${baza}` : baza;
}

export const RE_CHEIE_CAMP = /^[a-z][a-z0-9_]{0,39}$/;

export type EroareDefinitie = { camp: "eticheta" | "tip" | "optiuni" | "entitate"; mesaj: string };

export function valideazaDefinitie(brut: { entitate?: unknown; eticheta?: unknown; tip?: unknown; optiuni?: unknown }): { ok: true; def: DefinitieCamp } | { ok: false; erori: EroareDefinitie[] } {
  const erori: EroareDefinitie[] = [];
  const entitate = brut.entitate;
  if (!esteEntitateCamp(entitate)) erori.push({ camp: "entitate", mesaj: "Alege unde apare câmpul (donatori sau firme)." });
  const eticheta = typeof brut.eticheta === "string" ? brut.eticheta.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "";
  if (!eticheta) erori.push({ camp: "eticheta", mesaj: "Scrie numele câmpului." });
  else if (eticheta.length > LIMITE_CAMP.maxEticheta) erori.push({ camp: "eticheta", mesaj: `Numele e prea lung (maximum ${LIMITE_CAMP.maxEticheta} de caractere).` });
  else if (!cheieDinEticheta(eticheta)) erori.push({ camp: "eticheta", mesaj: "Numele trebuie să conțină litere sau cifre." });
  const tip = brut.tip;
  if (!esteTipCamp(tip)) erori.push({ camp: "tip", mesaj: "Alege tipul câmpului." });
  let optiuni: string[] = [];
  if (tip === "alegere") {
    const lista = Array.isArray(brut.optiuni) ? brut.optiuni : typeof brut.optiuni === "string" ? brut.optiuni.split(/\r?\n|;/) : [];
    const curate = [...new Set(lista.map((o) => String(o ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean))];
    if (curate.length < 2) erori.push({ camp: "optiuni", mesaj: "Pune cel puțin două variante de alegere." });
    else if (curate.length > LIMITE_CAMP.maxOptiuni) erori.push({ camp: "optiuni", mesaj: `Cel mult ${LIMITE_CAMP.maxOptiuni} de variante.` });
    else if (curate.some((o) => o.length > LIMITE_CAMP.maxOptiune)) erori.push({ camp: "optiuni", mesaj: `O variantă e prea lungă (maximum ${LIMITE_CAMP.maxOptiune} de caractere).` });
    else optiuni = curate;
  }
  if (erori.length > 0 || !esteEntitateCamp(entitate) || !esteTipCamp(tip)) return { ok: false, erori };
  return { ok: true, def: { entitate, cheie: cheieDinEticheta(eticheta), eticheta, tip, optiuni } };
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
function dataValida(t: string): boolean {
  if (!RE_DATA.test(t)) return false;
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

// Valoarea unui câmp, adusă la tipul lui; null = valoare goală (se șterge) sau nevalidă (cu mesaj de eroare).
export function curataValoare(def: DefinitieCamp, brut: unknown): { ok: true; valoare: ValoareCamp | null } | { ok: false; mesaj: string } {
  if (brut === null || brut === undefined || (typeof brut === "string" && brut.trim() === "")) return { ok: true, valoare: null };
  switch (def.tip) {
    case "text": {
      const t = String(brut).replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
      if (t.length > LIMITE_CAMP.maxText) return { ok: false, mesaj: `Textul e prea lung (maximum ${LIMITE_CAMP.maxText} de caractere).` };
      return { ok: true, valoare: t === "" ? null : t };
    }
    case "numar": {
      const n = typeof brut === "number" ? brut : Number(String(brut).trim().replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n) || Math.abs(n) > LIMITE_CAMP.maxNumar) return { ok: false, mesaj: "Scrie un număr valid." };
      return { ok: true, valoare: n };
    }
    case "data": {
      const t = String(brut).trim();
      return dataValida(t) ? { ok: true, valoare: t } : { ok: false, mesaj: "Scrie data în forma an-lună-zi (ex. 2026-10-26)." };
    }
    case "alegere": {
      const t = String(brut).trim();
      return def.optiuni.includes(t) ? { ok: true, valoare: t } : { ok: false, mesaj: "Alege una dintre variantele din listă." };
    }
    case "da_nu": {
      if (brut === true || brut === "da" || brut === "true" || brut === 1) return { ok: true, valoare: true };
      if (brut === false || brut === "nu" || brut === "false" || brut === 0) return { ok: true, valoare: false };
      return { ok: false, mesaj: "Alege Da sau Nu." };
    }
  }
}

// Valorile trimise de utilizator (formular sau API) față de definițiile ACTIVE: cheile necunoscute sunt ignorate, valorile se aduc la tip, cele goale se șterg.
// Întoarce valorile de pus (cheie → valoare), cheile de șters și erorile pe câmp. Nu atinge câmpurile arhivate sau trimise ca să rămână cum sunt.
export function curataValori(defs: readonly DefinitieCamp[], brut: Record<string, unknown>): { de_pus: ValoriCamp; de_sters: string[]; erori: Record<string, string>; necunoscute: string[] } {
  const dePus: ValoriCamp = {};
  const deSters: string[] = [];
  const erori: Record<string, string> = {};
  const active = new Map(defs.filter((d) => d.activ !== false).map((d) => [d.cheie, d]));
  const necunoscute = Object.keys(brut ?? {}).filter((k) => !active.has(k));
  for (const [cheie, def] of active) {
    if (!(brut && Object.prototype.hasOwnProperty.call(brut, cheie))) continue;
    const r = curataValoare(def, brut[cheie]);
    if (!r.ok) erori[cheie] = r.mesaj;
    else if (r.valoare === null) deSters.push(cheie);
    else dePus[cheie] = r.valoare;
  }
  return { de_pus: dePus, de_sters: deSters, erori, necunoscute };
}

// Valorile salvate, aduse în siguranță din jsonb (orice altceva decât obiect simplu → gol; valori de alt tip → ignorate).
export function valoriDinJson(x: unknown): ValoriCamp {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const rez: ValoriCamp = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") rez[k] = v;
  }
  return rez;
}

// Textul de afișat (listă, export): „Da/Nu”, data în română, numărul cu separator.
export function formateazaValoare(def: Pick<DefinitieCamp, "tip">, v: ValoareCamp | undefined): string {
  if (v === undefined || v === null || v === "") return "";
  if (def.tip === "da_nu") return v === true ? "Da" : v === false ? "Nu" : String(v);
  if (def.tip === "data" && typeof v === "string" && RE_DATA.test(v)) {
    const [a, l, z] = v.split("-");
    return `${z}.${l}.${a}`;
  }
  if (def.tip === "numar" && typeof v === "number") return v.toLocaleString("ro-RO");
  return String(v);
}

// Poate organizația să mai adauge un câmp pe această entitate? (Numără și câmpurile arhivate: cheia rămâne rezervată.)
export function maiPoateAdauga(deja: number): boolean {
  return deja < LIMITE_CAMP.maxCampuriPeEntitate;
}
