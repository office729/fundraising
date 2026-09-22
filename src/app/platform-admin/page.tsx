import { sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { db } from "@/lib/db";

// Limita reală a planului Free Supabase — nu un prag ales arbitrar. Peste ea,
// scrierile în baza de date pot începe să eșueze.
const LIMITA_BYTES = 500 * 1024 * 1024;
const PRAG_ATENTIE = 0.7;
const PRAG_PERICOL = 0.9;

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toLocaleString("ro-RO", { maximumFractionDigits: 1 });
}

// Doar pentru contul platformei (isPlatformAdmin) — nu apare nicăieri în
// navigarea vizibilă organizațiilor client, e o rută separată de [orgSlug],
// legată doar din antetul CRM, condiționat de același email allowlist.
export default async function PlatformAdminPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const [{ size }] = await db.execute<{ size: string }>(sql`select pg_database_size(current_database()) as size`);
  const bytesFolositi = Number(size);
  const procent = bytesFolositi / LIMITA_BYTES;

  const status =
    procent >= PRAG_PERICOL
      ? { eticheta: "Aproape de limită — acționează acum", clasa: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" }
      : procent >= PRAG_ATENTIE
        ? { eticheta: "Se apropie de limită", clasa: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" }
        : { eticheta: "OK", clasa: "bg-brand-green-soft text-brand-green" };

  const tabele = await db.execute<{ nume: string; bytes: string }>(sql`
    select c.relname as nume, pg_total_relation_size(c.oid) as bytes
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by bytes desc
    limit 10
  `);

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Spațiu bază de date</h1>
      <p className="mt-1 text-sm text-muted">Vizibil doar pentru contul platformei — nicio organizație client nu ajunge la această pagină.</p>

      <div className="mt-6 rounded-xl border border-line bg-panel p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-2xl font-bold text-ink">
            {formatMb(bytesFolositi)} MB <span className="text-base font-normal text-muted">/ {formatMb(LIMITA_BYTES)} MB</span>
          </p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.clasa}`}>{status.eticheta}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-panel-2">
          <div
            className={`h-full rounded-full ${procent >= PRAG_PERICOL ? "bg-red-500" : procent >= PRAG_ATENTIE ? "bg-amber-500" : "bg-brand-green"}`}
            style={{ width: `${Math.min(100, procent * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">{(procent * 100).toLocaleString("ro-RO", { maximumFractionDigits: 1 })}% din planul Free Supabase (500 MB)</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Cele mai mari tabele</h2>
      <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
        {tabele.map((t) => (
          <div key={t.nume} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-mono text-body">{t.nume}</span>
            <span className="text-muted">{formatMb(Number(t.bytes))} MB</span>
          </div>
        ))}
      </div>
    </main>
  );
}
