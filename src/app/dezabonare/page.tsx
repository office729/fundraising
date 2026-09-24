import { verificaLinkDezabonare } from "@/lib/dezabonare";

import { DezabonareForm } from "./form";

export const metadata = { title: "Dezabonare emailuri", robots: { index: false } };

// Pagină publică, deschisă din linkul semnat al emailurilor de campanie.
// Dezabonarea se face DOAR la apăsarea butonului (POST), nu la simpla deschidere
// a linkului — scanerele de email (antivirus, previzualizări) deschid automat
// linkurile și ar dezabona oameni fără știrea lor.
export default async function DezabonarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const o = sp.o ?? "";
  const e = sp.e ?? "";
  const t = sp.t ?? "";
  const valid = verificaLinkDezabonare(o, e, t) !== null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-xl font-bold text-ink">Dezabonare de la emailuri</h1>
      {valid ? (
        <>
          <p className="mb-4 mt-2 text-sm text-body">Confirmă că nu mai vrei să primești emailuri de campanie (ex. reamintirea Formularului 230).</p>
          <DezabonareForm o={o} e={e} t={t} />
        </>
      ) : (
        <p className="mt-2 text-sm text-body">Linkul de dezabonare e invalid sau incomplet.</p>
      )}
    </main>
  );
}
