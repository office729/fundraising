import { faraDiacritice } from "@/lib/cautare";
import { amprentePersoanaNoi, amprentePersoanaVechi } from "@/lib/amprente-hmac";

// GDPR: lista „nu mai căuta” păstrează DOAR amprente ale numelui / profilului, niciodată numele în clar.
// Amprenta e HMAC cu ORG_SECRETS_KEY (nu se poate ghici dintr-un dicționar de nume) și e legată de firmă (orgId + companyId în intrare),
// deci nu poate fi folosită pentru a căuta o persoană în alte firme sau organizații. Formele vechi (SHA-256 simplu) din producție rămân recunoscute la verificare.

function slugLinkedinPersoana(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /linkedin\.com\/in\/([^/?#]+)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

const numeNormalizat = (nume: string): string => faraDiacritice(nume).replace(/\s+/g, " ").trim();

// Pentru SCRIERE în lista „nu mai căuta”: doar forma nouă (HMAC).
export function amprentePersoana(orgId: string, companyId: string, nume: string, linkedin?: string | null): string[] {
  return amprentePersoanaNoi(orgId, companyId, numeNormalizat(nume), slugLinkedinPersoana(linkedin));
}

// Pentru VERIFICARE: forma nouă + forma veche, ca persoanele excluse înainte de trecerea la HMAC să rămână excluse.
export function amprentePersoanaDeVerificat(orgId: string, companyId: string, nume: string, linkedin?: string | null): string[] {
  const n = numeNormalizat(nume);
  const slug = slugLinkedinPersoana(linkedin);
  return [...amprentePersoanaNoi(orgId, companyId, n, slug), ...amprentePersoanaVechi(orgId, companyId, n, slug)];
}
