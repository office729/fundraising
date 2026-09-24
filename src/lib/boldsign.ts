import { createHmac, timingSafeEqual } from "node:crypto";

import { EroareUtilizator } from "@/lib/erori";

// Client minimal pentru API-ul BoldSign (semnătură electronică). Cheia se ia din
// variabila de mediu BOLDSIGN_API_KEY (adăugată de administrator în Vercel);
// dacă lipsește, integrarea apare ca „neconfigurată" și nu se trimite nimic.
// Implicit regiunea UE (date personale în SEE). Un cont creat pe regiunea SUA cere
// BOLDSIGN_API_URL=https://api.boldsign.com.
const API_URL = process.env.BOLDSIGN_API_URL || "https://api-eu.boldsign.com";

// Semnătură (HMAC) care leagă un documentId de organizația care l-a trimis: fără
// ea, un membru al altei organizații nu poate cere statusul unui document străin.
export function tokenDocument(orgSlug: string, documentId: string): string {
  return createHmac("sha256", process.env.BOLDSIGN_API_KEY ?? "").update(`${orgSlug}:${documentId}`).digest("hex");
}
export function tokenValid(orgSlug: string, documentId: string, token: string): boolean {
  const asteptat = Buffer.from(tokenDocument(orgSlug, documentId));
  const primit = Buffer.from(token);
  return asteptat.length === primit.length && timingSafeEqual(asteptat, primit);
}

export function boldsignConfigurat(): boolean {
  return Boolean(process.env.BOLDSIGN_API_KEY);
}

export type Semnatar = { nume: string; email: string };

export type StatusDocument = {
  documentId: string;
  titlu: string;
  status: string;
  semnatari: { nume: string; email: string; status: string }[];
};

// Nu întoarcem clientului mesajul brut al furnizorului (poate conține detalii interne).
async function mesajEroare(r: Response): Promise<string> {
  if (r.status === 401 || r.status === 403) return "Cheia BoldSign nu este validă sau nu are drepturi. Verifică setările integrării.";
  if (r.status === 429) return "Prea multe cereri către BoldSign. Încearcă din nou peste câteva minute.";
  if (r.status >= 500) return "BoldSign nu răspunde momentan. Încearcă din nou mai târziu.";
  return "BoldSign a refuzat documentul. Verifică fișierul PDF și adresele de email.";
}

// Trimite un PDF la semnat. Fiecare semnatar primește un câmp de semnătură plasat
// implicit în josul primei pagini, unul lângă altul pe verticală, ca documentul
// să fie valid fără configurare manuală în BoldSign.
export async function trimiteLaSemnat(opts: {
  fisier: File;
  titlu: string;
  mesaj: string;
  semnatari: Semnatar[];
}): Promise<{ documentId: string }> {
  const apiKey = process.env.BOLDSIGN_API_KEY;
  if (!apiKey) throw new EroareUtilizator("Semnătura digitală nu e configurată (lipsește BOLDSIGN_API_KEY).");

  const form = new FormData();
  form.append("Files", opts.fisier, opts.fisier.name);
  form.append("Title", opts.titlu);
  if (opts.mesaj) form.append("Message", opts.mesaj);
  opts.semnatari.forEach((s, i) => {
    form.append(
      "Signers",
      JSON.stringify({
        name: s.nume,
        emailAddress: s.email,
        signerType: "Signer",
        formFields: [
          {
            id: `semnatura-${i + 1}`,
            fieldType: "Signature",
            pageNumber: 1,
            bounds: { x: 40 + (i % 2) * 260, y: 640 - Math.floor(i / 2) * 70, width: 220, height: 50 },
            isRequired: true,
          },
        ],
      }),
    );
  });

  const r = await fetch(`${API_URL}/v1/document/send`, { method: "POST", headers: { "X-API-KEY": apiKey }, body: form });
  if (!r.ok) throw new EroareUtilizator(await mesajEroare(r));
  const j = (await r.json()) as { documentId?: string };
  if (!j.documentId) throw new EroareUtilizator("BoldSign nu a întors un identificator de document.");
  return { documentId: j.documentId };
}

export async function statusDocument(documentId: string): Promise<StatusDocument> {
  const apiKey = process.env.BOLDSIGN_API_KEY;
  if (!apiKey) throw new EroareUtilizator("Semnătura digitală nu e configurată (lipsește BOLDSIGN_API_KEY).");
  const r = await fetch(`${API_URL}/v1/document/properties?documentId=${encodeURIComponent(documentId)}`, {
    headers: { "X-API-KEY": apiKey },
    cache: "no-store",
  });
  if (!r.ok) throw new EroareUtilizator(await mesajEroare(r));
  const j = (await r.json()) as {
    documentId?: string;
    messageTitle?: string;
    status?: string;
    signerDetails?: { signerName?: string; signerEmail?: string; status?: string }[];
  };
  return {
    documentId,
    titlu: j.messageTitle ?? "",
    status: j.status ?? "necunoscut",
    semnatari: (j.signerDetails ?? []).map((s) => ({ nume: s.signerName ?? "", email: s.signerEmail ?? "", status: s.status ?? "" })),
  };
}
