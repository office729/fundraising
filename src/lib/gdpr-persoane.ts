import { createHash } from "node:crypto";

import { faraDiacritice } from "@/lib/cautare";

// GDPR: lista „nu mai căuta” păstrează DOAR amprente (hash) ale numelui / profilului, niciodată numele în clar.
// Amprenta e legată de firmă (orgId + companyId în intrare), deci nu poate fi folosită pentru a căuta o persoană în alte firme.

function hash(...parti: string[]): string {
  return createHash("sha256").update(parti.join("|")).digest("hex").slice(0, 32);
}

function slugLinkedinPersoana(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /linkedin\.com\/in\/([^/?#]+)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

export function amprentePersoana(orgId: string, companyId: string, nume: string, linkedin?: string | null): string[] {
  const out = [hash(orgId, companyId, "nume", faraDiacritice(nume).replace(/\s+/g, " ").trim())];
  const slug = slugLinkedinPersoana(linkedin);
  if (slug) out.push(hash(orgId, companyId, "linkedin", slug));
  return out;
}
