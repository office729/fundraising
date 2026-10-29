"use server";

import { esteFlux } from "./clasificare";
import { inregistreazaEveniment } from "./server";

const text = (x: unknown, max: number): string | null => (typeof x === "string" && x.length > 0 && x.length <= max ? x : null);
const slug = (x: unknown): string | null => {
  const t = text(x, 120);
  return t && /^[a-z0-9][a-z0-9_-]*$/i.test(t) ? t : null;
};

// Punctul public prin care browserul raportează un eveniment (vizită, clic pe „Donează”, început de formular). Nu aruncă niciodată și nu întoarce nimic:
// măsurarea nu are voie să strice pagina. Tot ce vine din browser e validat din nou în ./server (flux, tip, ID-uri, semnale); organizația și pagina se
// stabilesc pe server din slug-uri.
export async function raporteazaEvenimentAtribuire(intrare: {
  flux: string;
  tip: string;
  orgSlug?: string | null;
  pageSlug?: string | null;
  beneficiarSlug?: string | null;
  ctx: string;
  cale: string;
}): Promise<void> {
  try {
    if (!intrare || !esteFlux(intrare.flux)) return;
    const tip = text(intrare.tip, 40);
    const ctx = text(intrare.ctx, 900);
    const cale = text(intrare.cale, 200);
    if (!tip || !ctx || !cale) return;
    await inregistreazaEveniment({
      flux: intrare.flux,
      tip,
      orgSlug: slug(intrare.orgSlug),
      pageSlug: slug(intrare.pageSlug),
      beneficiarSlug: slug(intrare.beneficiarSlug),
      ctx,
      cale,
    });
  } catch {
    // măsurarea nu aruncă niciodată
  }
}
