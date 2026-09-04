import Link from "next/link";

// Stripe redirecționează aici imediat după plată — confirmarea REALĂ (marcarea
// donației ca "reusita" și actualizarea sumei strânse) o face webhook-ul
// asincron (/api/stripe/webhook), care poate ajunge la câteva secunde după
// acest redirect. De-asta pagina nu citește din DB — arată mereu același
// mesaj de mulțumire, indiferent dacă webhook-ul a apucat deja să ruleze.
export default async function MultumimPage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}) {
  const { orgSlug, pageSlug } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-soft text-2xl">🎉</span>
      <h1 className="font-display mt-5 text-2xl font-bold text-ink">Mulțumim pentru donație!</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
        Plata a fost trimisă cu succes. Dacă ai lăsat un email, primești confirmarea acolo.
      </p>
      <Link
        href={`/strangere-fonduri/${orgSlug}/${pageSlug}`}
        className="mt-6 rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
      >
        Înapoi la pagină
      </Link>
    </main>
  );
}
