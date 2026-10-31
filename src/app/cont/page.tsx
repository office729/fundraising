import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";
import { CONT_UI_DICT } from "@/lib/i18n/dictionaries/cont-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { estePrimitaOprita, idUtilizatorDupaEmail } from "@/lib/notificari-oprite";

import { StergeContForm } from "./form";
import { NotificariForm } from "./notificari-form";

export async function generateMetadata() {
  return { title: CONT_UI_DICT[await getLocale()].metaTitlu, robots: { index: false } };
}

export default async function ContPage() {
  const locale = await getLocale();
  const t = CONT_UI_DICT[locale];
  const user = await getAuthUser();
  if (!user?.email) redirect("/login");
  // Pagina nu face parte din layout-ul organizației: fără acest link, utilizatorul n-ar avea cum să se întoarcă în aplicație.
  const orgSlug = await getMyOrgSlug();
  // Dacă baza nu răspunde, secțiunea de notificări se arată cu valoarea implicită (activă), fără să strice pagina.
  const userId = await idUtilizatorDupaEmail(user.email).catch(() => null);
  const rezumatOprit = userId ? await estePrimitaOprita(userId, "rezumat-calendar").catch(() => false) : false;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link prefetch={false} href={orgSlug ? `/${orgSlug}/crm` : "/"} className="mb-6 inline-block text-[13px] text-muted transition hover:text-ink">
        ← {orgSlug ? t.inapoiApp : t.inapoiSite}
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink">{t.titlu}</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      {userId && (
        <section className="mt-8 rounded-xl border border-line bg-panel p-5">
          <h2 className="font-medium text-ink">{t.emailuri}</h2>
          <NotificariForm optiuni={[{ tip: "rezumat-calendar", titlu: t.rezumat.titlu, descriere: t.rezumat.descriere, primita: !rezumatOprit }]} />
        </section>
      )}

      <section className="mt-8 rounded-xl border border-red-200 bg-panel p-5 dark:border-red-900">
        <h2 className="font-medium text-ink">{t.sterge.titlu}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-body">
          {t.sterge.puncte.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <StergeContForm email={user.email} locale={locale} />
      </section>
    </main>
  );
}
