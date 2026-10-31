import { citestePreferinte, verificaLinkDezabonare } from "@/lib/dezabonare";
import { DEZABONARE_UI_DICT } from "@/lib/i18n/dictionaries/dezabonare-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { DezabonareForm } from "./form";

export async function generateMetadata() {
  return { title: DEZABONARE_UI_DICT[await getLocale()].donator.metaTitlu, robots: { index: false } };
}

// Pagină publică, deschisă din linkul semnat al e-mailurilor de la organizații. Alegerea (ca până acum / mai rar / deloc) se face DOAR la apăsarea butonului (POST), nu la
// simpla deschidere a linkului — scanerele de e-mail (antivirus, previzualizări) deschid automat linkurile și ar schimba alegerea fără știrea persoanei.
export default async function DezabonarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await getLocale();
  const d = DEZABONARE_UI_DICT[locale].donator;
  const sp = await searchParams;
  const o = sp.o ?? "";
  const e = sp.e ?? "";
  const t = sp.t ?? "";
  const email = verificaLinkDezabonare(o, e, t);
  const stare = email ? await citestePreferinte(o, email).catch(() => null) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-xl font-bold text-ink">{d.titlu}</h1>
      {email && stare ? (
        stare.dezabonat ? (
          <p className="mt-2 text-sm text-body">
            {d.dejaDezabonat1}<strong>{stare.organizatie}</strong>{d.dejaDezabonat2}
          </p>
        ) : (
          <>
            <p className="mt-2 mb-4 text-sm text-body">
              {d.alege1}<strong>{stare.organizatie}</strong>{d.alege2}
            </p>
            <DezabonareForm o={o} e={e} t={t} organizatie={stare.organizatie} frecventa={stare.frecventa} locale={locale} />
          </>
        )
      ) : (
        <p className="mt-2 text-sm text-body">{d.linkInvalid}</p>
      )}
    </main>
  );
}
