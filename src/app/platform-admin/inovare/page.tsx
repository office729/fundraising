import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { indicatoriInovare } from "@/lib/inovare/model";

import { listeazaIdeiAction } from "./actions";
import { IdeiClient } from "./idei-client";

export const dynamic = "force-dynamic";

// Doar pentru contul platformei: ideile propuse de ONG-uri în Centrul de inovare. Aici le răspunzi, le planifici, le ascunzi sau le unești cu duplicatele.
async function incarca() {
  const idei = await listeazaIdeiAction();
  return { idei, indicatori: indicatoriInovare(idei, new Date()) };
}

export default async function InovarePlatformaPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();
  const { idei, indicatori } = await incarca();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">Centrul de inovare: ideile ONG-urilor</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Ce propun organizațiile, în ordinea scorului de prioritate. Schimbi starea (propusă, văzută, în planificare, în dezvoltare, finalizată, nu acum), scrii un răspuns care se vede în platformă, iar autorul primește un email la fiecare schimbare; organizațiile care au votat sunt anunțate când ideea intră în lucru sau e gata. Triaj săptămânal de 30 de minute: răspuns la ideile noi, efort, dubluri. Lista „Ce am inovat” se completează din cod, la fiecare lot publicat (fișierul <code>src/content/inovatii.ts</code>; leagă o noutate de idee cu <code>ideeId</code>).
      </p>
      <IdeiClient initiale={idei} indicatori={indicatori} />
    </main>
  );
}
