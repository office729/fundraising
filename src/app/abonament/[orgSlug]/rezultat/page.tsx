import Link from "next/link";
import { redirect } from "next/navigation";

import { citestePlata } from "./data";
import { AutoRefresh, PurchaseTracker } from "./tracking";

export const dynamic = "force-dynamic";

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
  if (!comanda) redirect(`/${orgSlug}/setari`);

  const plata = await citestePlata(orgSlug, comanda);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {!plata && (
        <>
          <h1 className="font-display text-2xl font-bold text-ink">Nu am găsit această plată</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">
            Comanda nu există sau nu aparține acestei organizații. Dacă ai plătit, scrie-ne și verificăm.
          </p>
        </>
      )}

      {plata?.status === "in_asteptare" && (
        <>
          <AutoRefresh />
          <div role="status" aria-live="polite" className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-green">
            <span className="sr-only">Verificăm plata…</span>
          </div>
          <h1 className="font-display mt-5 text-2xl font-bold text-ink">Verificăm plata…</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">
            Așteptăm confirmarea de la bancă. De obicei durează câteva secunde; pagina se actualizează singură. Dacă ai
            anulat plata sau ea a eșuat, poți încerca din nou din Setări.
          </p>
        </>
      )}

      {plata?.status === "reusita" && (
        <>
          <PurchaseTracker orderId={plata.orderId} value={plata.sumaLei} item={NUME_PACHET[plata.pachet] ?? plata.pachet} />
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-soft text-2xl">✓</span>
          <h1 className="font-display mt-5 text-2xl font-bold text-ink">Plata a fost confirmată</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">
            {NUME_PACHET[plata.pachet] ?? plata.pachet} — {plata.sumaLei.toLocaleString("ro-RO")} lei. Accesul e activ pentru o lună.
          </p>
        </>
      )}

      {(plata?.status === "esuata" || plata?.status === "anulata") && (
        <>
          <h1 className="font-display text-2xl font-bold text-ink">Plata nu a reușit</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">
            Nu s-a retras nicio sumă. Poți încerca din nou din Setări, cu același card sau cu altul.
          </p>
        </>
      )}

      {plata?.status === "rambursata" && (
        <>
          <h1 className="font-display text-2xl font-bold text-ink">Plata a fost rambursată</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">Suma a fost returnată, iar luna corespunzătoare nu mai e plătită.</p>
        </>
      )}

      <Link
        href={plata?.status === "reusita" ? `/${orgSlug}/crm` : `/${orgSlug}/setari`}
        className="mt-6 rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
      >
        {plata?.status === "reusita" ? "Mergi la platformă" : "Înapoi la Setări"}
      </Link>
    </main>
  );
}
