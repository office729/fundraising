import Link from "next/link";

import { cerePlatformAdminPagina } from "@/lib/auth/platform-admin";
import { VARIANTE_PAGINI, rezumatPersonalizare, variantaPagina, type PaginaCuVarianta } from "@/lib/personalizare-org";
import { listeazaPersonalizari } from "@/lib/suport/personalizare-admin";

export const metadata = { title: "Ce diferă la fiecare organizație", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function data(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

// Registrul „ce diferă la fiecare”: pentru echipa platformei, într-un singur loc. Aspectul se generează din configurarea salvată (deci e mereu la zi), iar notița internă o scriem
// noi, din editorul de aspect. Nu citește nicio dată a organizațiilor.
export default async function PersonalizariPage() {
  await cerePlatformAdminPagina();
  const toate = await listeazaPersonalizari();
  const randuri = toate.map((r) => ({ ...r, linii: rezumatPersonalizare(r.config) }));
  const diferite = randuri.filter((r) => r.linii.length > 0 || r.nota);
  const standard = randuri.length - diferite.length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/platform-admin" className="text-xs font-medium text-brand-blue hover:underline">
        ← Panou platformă
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">Ce diferă la fiecare organizație</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Personalizările active și notițele noastre, pe organizații. Lista de modificări se generează din configurarea salvată, deci reflectă mereu ce vede clientul. Restul organizațiilor
        ({standard}) au aspectul standard.
      </p>

      <section className="mt-6 space-y-3" aria-label="Organizații cu diferențe">
        {diferite.length === 0 && <p className="rounded-xl border border-line bg-panel p-4 text-sm text-muted">Nicio organizație nu diferă încă de aspectul standard.</p>}
        {diferite.map((r) => (
          <article key={r.orgId} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{r.nume}</h2>
                <p className="text-xs text-muted">
                  {r.slug} · aspect actualizat {data(r.actualizatLa)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link prefetch={false} href={`/platform-admin/personalizare/${r.slug}`} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-panel-2">
                  Editor
                </Link>
                <Link prefetch={false} href={`/platform-admin/previzualizare/${r.slug}`} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-panel-2">
                  Previzualizare
                </Link>
              </div>
            </div>
            {r.linii.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
                {r.linii.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Aspect standard (doar notiță).</p>
            )}
            {r.nota && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-panel-2 px-3 py-2 text-sm text-ink">
                <span className="mb-1 block text-[11px] font-semibold tracking-wide text-muted uppercase">Notiță internă</span>
                {r.nota}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="mt-10" aria-label="Variante disponibile">
        <h2 className="text-base font-semibold text-ink">Variante de pagini disponibile în cod</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">Fiecare variantă e scrisă și testată în aplicație; aici vezi cine o folosește. O variantă nouă se adaugă întâi în cod.</p>
        <ul className="mt-3 space-y-3">
          {(Object.keys(VARIANTE_PAGINI) as PaginaCuVarianta[]).flatMap((pagina) =>
            Object.entries(VARIANTE_PAGINI[pagina].optiuni).map(([cheie, eticheta]) => {
              const folosesc = randuri.filter((r) => variantaPagina(r.config, pagina) === cheie);
              return (
                <li key={`${pagina}-${cheie}`} className="rounded-xl border border-line bg-panel p-4 text-sm">
                  <p className="font-medium text-ink">
                    {VARIANTE_PAGINI[pagina].eticheta}: {eticheta}
                  </p>
                  <p className="mt-1 text-muted">
                    {folosesc.length ? `Folosită de ${folosesc.length}: ${folosesc.map((f) => f.nume).join(", ")}` : "Nicio organizație nu o folosește încă."}
                  </p>
                </li>
              );
            }),
          )}
        </ul>
      </section>
    </main>
  );
}
