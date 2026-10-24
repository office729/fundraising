import { citestePreferinte, verificaLinkDezabonare } from "@/lib/dezabonare";

import { DezabonareForm } from "./form";

export const metadata = { title: "Cât de des vrei mesaje", robots: { index: false } };

// Pagină publică, deschisă din linkul semnat al e-mailurilor de la organizații. Alegerea (ca până acum / mai rar / deloc) se face DOAR la apăsarea butonului (POST), nu la
// simpla deschidere a linkului — scanerele de e-mail (antivirus, previzualizări) deschid automat linkurile și ar schimba alegerea fără știrea persoanei.
export default async function DezabonarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const o = sp.o ?? "";
  const e = sp.e ?? "";
  const t = sp.t ?? "";
  const email = verificaLinkDezabonare(o, e, t);
  const stare = email ? await citestePreferinte(o, email).catch(() => null) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-xl font-bold text-ink">Cât de des vrei să primești mesaje?</h1>
      {email && stare ? (
        stare.dezabonat ? (
          <p className="mt-2 text-sm text-body">
            Ești deja dezabonat de la mesajele organizației <strong>{stare.organizatie}</strong> și nu vei primi nimic. Dacă te răzgândești și vrei din nou mesaje, scrie organizației.
          </p>
        ) : (
          <>
            <p className="mt-2 mb-4 text-sm text-body">
              Alege ce ți se potrivește pentru mesajele de la <strong>{stare.organizatie}</strong> (mulțumiri, vești, invitații, reamintirea Formularului 230, mesaje către voluntari).
            </p>
            <DezabonareForm o={o} e={e} t={t} organizatie={stare.organizatie} frecventa={stare.frecventa} />
          </>
        )
      ) : (
        <p className="mt-2 text-sm text-body">Linkul e invalid sau incomplet.</p>
      )}
    </main>
  );
}
