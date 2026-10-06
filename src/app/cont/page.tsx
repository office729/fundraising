import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";

import { StergeContForm } from "./form";

export const metadata = { title: "Contul meu", robots: { index: false } };

export default async function ContPage() {
  const user = await getAuthUser();
  if (!user?.email) redirect("/login");
  // Pagina nu face parte din layout-ul organizației: fără acest link, utilizatorul n-ar avea cum să se întoarcă în aplicație.
  const orgSlug = await getMyOrgSlug();

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link prefetch={false} href={orgSlug ? `/${orgSlug}/crm` : "/"} className="mb-6 inline-block text-[13px] text-muted transition hover:text-ink">
        ← {orgSlug ? "Înapoi în aplicație" : "Înapoi la site"}
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink">Contul meu</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <section className="mt-8 rounded-xl border border-red-200 bg-panel p-5 dark:border-red-900">
        <h2 className="font-medium text-ink">Șterge-mi contul</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-body">
          <li>Numele și adresa ta de email sunt eliminate din platformă, iar contul de autentificare se șterge definitiv.</li>
          <li>Ieși din toate organizațiile din care faceai parte; datele organizațiilor (donatori, companii, campanii) rămân la ele.</li>
          <li>Dacă ești singurul owner al unei organizații, trebuie întâi să predai rolul sau să ștergi organizația.</li>
          <li>Istoricul acțiunilor (de exemplu cine a creat o înregistrare) rămâne, dar fără numele sau emailul tău.</li>
          <li>Nu se poate anula.</li>
        </ul>
        <StergeContForm email={user.email} />
      </section>
    </main>
  );
}
