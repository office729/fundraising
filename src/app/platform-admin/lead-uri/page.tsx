import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";

import { listeazaLeaduriAction } from "./actions";
import { LeaduriClient } from "./leaduri-client";

export const dynamic = "force-dynamic";

// Doar pentru contul platformei: ONG-urile care au completat formularul „Descoperă Alexandrit” (pop-up și /descopera).
export default async function LeaduriPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const leaduri = await listeazaLeaduriAction();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">Cereri de la ONG-uri</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        ONG-urile care au completat formularul „Descoperă Alexandrit” din pop-up sau de pe pagina /descopera. Primești și un e-mail la fiecare completare; aici le ții în ordine: stare, notițe, export. Vizibil doar contului platformei.
      </p>
      <LeaduriClient initial={leaduri} />
    </main>
  );
}
