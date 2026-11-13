import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { listeazaUtilizatori } from "@/lib/suport/utilizatori-admin";

import { UtilizatoriClient } from "./utilizatori-client";

export const dynamic = "force-dynamic";

// Doar pentru contul platformei: cine a intrat prima și ultima dată pe platformă, cine a lucrat în CRM și dacă e activ.
export default async function UtilizatoriPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const utilizatori = await listeazaUtilizatori();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">Utilizatori și activitate</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Pentru fiecare cont: prima și ultima autentificare, ultima pagină deschisă în CRM și ultima acțiune făcută acolo (salvare, import, căutare). „Activ” înseamnă un semn de viață în ultimele 14 zile.
        Vizibil doar contului platformei.
      </p>
      <UtilizatoriClient initial={utilizatori} />
    </main>
  );
}
