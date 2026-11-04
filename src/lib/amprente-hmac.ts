import { createHash, createHmac } from "node:crypto";

// Amprentele listelor „nu mai contacta / nu mai căuta” (GDPR). Un hash simplu (SHA-256) al unui nume sau al unui email se poate ghici prin încercări
// (dicționar de nume și adrese), deci aici se folosește HMAC-SHA256 cu ORG_SECRETS_KEY (aceeași cheie ca la `hashSuprimare` din dezabonare.ts), cu prefix de scop
// propriu pentru fiecare utilizare și cu organizația în intrare: o amprentă dintr-o organizație nu spune nimic despre alta, iar cheia nu iese din server.
//
// COMPATIBILITATE: datele din producție au amprente vechi (SHA-256 simplu) și, la „prospectare_suprimati”, valori în clar. Verificările recunosc ambele forme
// (funcțiile `*Veche` + `*Noua` / `SetSuprimate`), scrierile noi folosesc DOAR forma nouă (`hmac:<64 hex>`). Fără migrare de date. Fișier pur, fără alte importuri
// (testat în tests/amprente-hmac.test.mjs).

export const PREFIX_HMAC = "hmac:";

export type ScopAmprenta = "nu-mai-cauta" | "influenceri-excluderi" | "prospectare-suprimati";

function cheieSecreta(): string {
  const cheie = process.env.ORG_SECRETS_KEY;
  // Ca `hashSuprimare`: fără cheie nu inventăm o amprentă slabă.
  if (!cheie) throw new Error("ORG_SECRETS_KEY lipsește — nu se pot calcula amprentele listelor de excludere.");
  return cheie;
}

// Părțile dinaintea valorii libere (organizație, firmă, tip) au lungime fixă sau nu conțin „:”, deci concatenarea nu e ambiguă.
function hmac(scop: ScopAmprenta, parti: readonly string[]): string {
  return PREFIX_HMAC + createHmac("sha256", cheieSecreta()).update(`${scop}:${parti.join(":")}`).digest("hex");
}

export const esteAmprentaHmac = (v: string | null | undefined): boolean => typeof v === "string" && v.startsWith(PREFIX_HMAC);

// Forma veche: SHA-256 simplu, trunchiat la 32 de caractere. Rămâne doar pentru recunoașterea datelor existente.
function sha32(...parti: string[]): string {
  return createHash("sha256").update(parti.join("|")).digest("hex").slice(0, 32);
}

// ===== „Nu mai căuta” al firmei (companies.extra.nuMaiCauta) =====
// `numeNormalizat` = numele fără diacritice, minuscule, spații strânse; `slugLinkedin` = slugul din linkedin.com/in/<slug>, minuscule.

export function amprentePersoanaNoi(orgId: string, companyId: string, numeNormalizat: string, slugLinkedin: string | null): string[] {
  const out = [hmac("nu-mai-cauta", [orgId, companyId, "nume", numeNormalizat])];
  if (slugLinkedin) out.push(hmac("nu-mai-cauta", [orgId, companyId, "linkedin", slugLinkedin]));
  return out;
}

export function amprentePersoanaVechi(orgId: string, companyId: string, numeNormalizat: string, slugLinkedin: string | null): string[] {
  const out = [sha32(orgId, companyId, "nume", numeNormalizat)];
  if (slugLinkedin) out.push(sha32(orgId, companyId, "linkedin", slugLinkedin));
  return out;
}

// ===== Influenceri (influenceri_excluderi) =====
// `cheie` = cheia de excludere cu prefix de platformă („ig:ana.pop”, „em:ana@exemplu.ro”).

export const amprentaInfluencerNoua = (orgId: string, cheie: string): string => hmac("influenceri-excluderi", [orgId, cheie]);
export const amprentaInfluencerVeche = (orgId: string, cheie: string): string => sha32(orgId, "influenceri", cheie);

// ===== Lista de suprimare a prospectării (prospectare_suprimati) =====
// `tip`: „nume” | „email” | „linkedin”; `valoare`: forma normalizată (cheia numelui, email cu litere mici, linkedinNormalizat).

export type TipSuprimare = "nume" | "email" | "linkedin";

export const valoareSuprimare = (orgId: string, tip: TipSuprimare, valoare: string): string => hmac("prospectare-suprimati", [orgId, tip, valoare]);

// Set de valori stocate (în clar sau HMAC) care răspunde la `has(valoareNormalizata)` pentru ambele forme. Rândurile vechi, în clar, se potrivesc direct; cele noi,
// prin amprenta valorii căutate. Moștenește din Set, deci intră oriunde se așteaptă un `ReadonlySet<string>` (motorul de căutare, excluderile firmei).
export class SetSuprimate extends Set<string> {
  private readonly orgId: string;
  private readonly tip: TipSuprimare;

  constructor(orgId: string, tip: TipSuprimare, valoriStocate: Iterable<string> = []) {
    super(valoriStocate);
    this.orgId = orgId;
    this.tip = tip;
  }

  override has(valoare: string): boolean {
    if (super.has(valoare)) return true;
    // Fără cheie (nu se poate calcula amprenta) un set gol nu aruncă: nu are cu ce să se potrivească.
    return this.size > 0 && super.has(valoareSuprimare(this.orgId, this.tip, valoare));
  }
}
