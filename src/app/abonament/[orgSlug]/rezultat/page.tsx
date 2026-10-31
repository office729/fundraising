import Link from "next/link";
import { redirect } from "next/navigation";

import { ABONAMENT_REZULTAT_UI_DICT } from "@/lib/i18n/dictionaries/abonament-rezultat-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { citestePlata } from "./data";
import { AutoRefresh, PurchaseTracker } from "./tracking";

export const dynamic = "force-dynamic";

// Numele pachetelor pentru evenimentul de analiză (rămân în română, ca în rapoartele existente); textul afișat vine din dicționar.
const NUME_PACHET: Record<string, string> = {
  start: "Pachet START",
  crestere: "Pachet CREȘTERE",
  impact: "Pachet IMPACT",
  custom: "Plan personalizat",
};

// Netopia întoarce clientul aici după pagina de plată (și la succes, și la
// eșec). Pagina NU acordă nimic: doar arată starea comenzii, așa cum a fixat-o
// IPN-ul verificat (api/netopia/ipn/route.ts). Stă în afara layout-ului
// [orgSlug] intenționat — acela înlocuiește tot cu ecranul de plată când
// accesul e blocat, iar aici clientul tocmai a plătit și trebuie să vadă rezultatul.
export default async function RezultatPlataPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ comanda?: string }>;
}) {
  const { orgSlug } = await params;
  const { comanda } = await searchParams;
  if (!comanda) redirect(`/${orgSlug}/crm/setari`);

  const plata = await citestePlata(orgSlug, comanda);
  const t = ABONAMENT_REZULTAT_UI_DICT[await getLocale()];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {!plata && (
        <>
          <h1 className="font-display text-2xl font-bold text-ink">{t.negasita}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{t.negasitaDesc}</p>
        </>
      )}

      {plata?.status === "in_asteptare" && (
        <>
          <AutoRefresh />
          <div role="status" aria-live="polite" className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-green">
            <span className="sr-only">{t.verificam}</span>
          </div>
          <h1 className="font-display mt-5 text-2xl font-bold text-ink">{t.verificam}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{t.verificamDesc}</p>
        </>
      )}

      {plata?.status === "reusita" && (
        <>
          <PurchaseTracker orderId={plata.orderId} value={plata.sumaLei} item={NUME_PACHET[plata.pachet] ?? plata.pachet} />
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-soft text-2xl">✓</span>
          <h1 className="font-display mt-5 text-2xl font-bold text-ink">{t.confirmata}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{t.confirmataDesc(t.pachete[plata.pachet] ?? plata.pachet, plata.sumaLei.toLocaleString(t.numere))}</p>
          {plata.facturaLink ? (
            <a href={plata.facturaLink} target="_blank" rel="noopener noreferrer" className="mt-2 text-[13.5px] font-medium text-brand-blue hover:underline">
              {t.descarcaFactura(plata.facturaNumar)}
            </a>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted">{t.facturaSeEmite}</p>
          )}
        </>
      )}

      {(plata?.status === "esuata" || plata?.status === "anulata") && (
        <>
          <h1 className="font-display text-2xl font-bold text-ink">{t.esuata}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{t.esuataDesc}</p>
        </>
      )}

      {plata?.status === "rambursata" && (
        <>
          <h1 className="font-display text-2xl font-bold text-ink">{t.rambursata}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{t.rambursataDesc}</p>
        </>
      )}

      <Link
        href={plata?.status === "reusita" ? `/${orgSlug}/crm` : `/${orgSlug}/crm/setari`}
        className="mt-6 rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
      >
        {plata?.status === "reusita" ? t.laPlatforma : t.inapoiSetari}
      </Link>
    </main>
  );
}
