import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnuleazaProgramare } from "@/components/programari/rezervare";
import { programareDupaToken } from "@/lib/programari/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Programarea ta — Alexandrit", robots: { index: false, follow: false } };

const dataOra = (iso: string) => new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(iso));

// Pagina personală a unei programări (linkul din emailul de confirmare): detalii, adăugare în calendar, anulare. Accesul îl dă tokenul secret din adresă.
export default async function ProgramarePersonalaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await programareDupaToken(token);
  if (!p) notFound();
  const trecuta = p.trecuta;
  return (
    <main className="bg-panel-2 px-[6%] py-14 sm:py-20">
      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 sm:p-8">
        <p className="text-sm font-bold tracking-wide text-brand-green uppercase">{p.stare === "anulata" ? "Programare anulată" : p.stare === "efectuata" ? "Întâlnire încheiată" : "Programarea ta"}</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-ink">{p.tipTitlu}</h1>
        <p className="mt-2 text-[16px] text-ink first-letter:uppercase">{dataOra(p.startLa)}</p>
        <p className="text-sm text-muted">Ora României · {p.durataMin} de minute{p.locatie ? ` · ${p.locatie}` : ""}</p>
        <p className="mt-4 text-[15px] text-body">Bună, {p.nume}!</p>
        {p.stare === "confirmata" && !trecuta && (
          <>
            <p className="mt-1 text-[15px] text-body">{p.mesajConfirmare}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`/programare/${p.token}/ics`} className="inline-flex min-h-11 items-center rounded-lg bg-brand-green px-5 text-sm font-bold text-white hover:bg-brand-green-hover">
                Adaugă în calendar
              </a>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-[14px] text-muted">Ca să muți programarea, anuleaz-o și alege altă oră.</p>
              <AnuleazaProgramare token={p.token} />
            </div>
          </>
        )}
        {(p.stare === "anulata" || trecuta) && (
          <Link href="/programare" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-green px-5 text-sm font-bold text-white hover:bg-brand-green-hover">
            Programează o întâlnire nouă
          </Link>
        )}
      </div>
    </main>
  );
}
