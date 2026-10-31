import { DEZABONARE_UI_DICT } from "@/lib/i18n/dictionaries/dezabonare-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { linkNotificareValid } from "@/lib/notificari-oprite";

import { DezabonareNotificareForm } from "./form";

export async function generateMetadata() {
  return { title: DEZABONARE_UI_DICT[await getLocale()].notificare.metaTitlu, robots: { index: false } };
}

// Pagină publică, deschisă din linkul semnat din e-mailurile pentru utilizatorii platformei. Dezabonarea se face DOAR la apăsarea butonului.
export default async function DezabonareNotificarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await getLocale();
  const d = DEZABONARE_UI_DICT[locale].notificare;
  const sp = await searchParams;
  const tip = sp.tip ?? "";
  const u = sp.u ?? "";
  const t = sp.t ?? "";
  const valid = linkNotificareValid(tip, u, t);
  const text = d.tipuri[tip];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-xl font-bold text-ink">{valid && text ? text.titlu : d.titluImplicit}</h1>
      {valid && text ? (
        <>
          <p className="mt-2 mb-4 text-sm text-body">{text.descriere}</p>
          <DezabonareNotificareForm tip={tip} u={u} t={t} locale={locale} />
        </>
      ) : (
        <p className="mt-2 text-sm text-body">{d.linkInvalid}</p>
      )}
    </main>
  );
}
