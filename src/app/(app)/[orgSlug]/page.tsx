import Link from "next/link";
import { redirect } from "next/navigation";

import { CATEGORY_LABELS, TOOLS, type ToolCategory, type ToolDefinition } from "@/lib/registry";

const CATEGORY_ORDER: ToolCategory[] = ["crm", "documente", "rapoarte", "comunicare", "organizare"];

function ToolCard({ tool, orgSlug }: { tool: ToolDefinition; orgSlug: string }) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue-soft text-xl">
          {tool.icon}
        </span>
        {!tool.live && (
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            În curând
          </span>
        )}
      </div>
      <p className="mt-3 font-medium text-ink">{tool.nume}</p>
      <p className="mt-1 text-sm text-muted">{tool.descriere}</p>
    </>
  );

  if (!tool.live) {
    return <div className="rounded-xl border border-line bg-panel p-5 opacity-60">{inner}</div>;
  }

  return (
    <Link
      href={`/${orgSlug}/${tool.href}`}
      className="rounded-xl border border-line bg-panel p-5 transition hover:border-brand-green hover:shadow-sm"
    >
      {inner}
    </Link>
  );
}

export default async function ControlTowerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // Singurul instrument "live" azi e CRM-ul (vezi TOOLS mai jos) — pagina
  // principală a organizației E direct dashboard-ul CRM, nu acest grid de
  // tool-uri (majoritatea marcate "În curând" oricum).
  redirect(`/${orgSlug}/crm`);
  // Faza 0: fără billing încă — toate organizațiile sunt „trial", cu acces
  // la toate instrumentele (cotele diferă pe pachet, vezi lib/billing/packages.ts).
  // Afișarea cotei rămase per instrument vine o dată cu billing-ul (Faza 1).

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Instrumentele tale</h1>
          <p className="mt-1 text-muted">Acces complet pe durata perioadei de probă.</p>
        </div>
        <span className="rounded-full bg-brand-green-soft px-3 py-1.5 text-sm font-medium text-brand-green-hover">
          Perioadă de probă · 14 zile
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {CATEGORY_ORDER.map((categorie) => {
          const items = TOOLS.filter((t) => t.categorie === categorie);
          if (!items.length) return null;
          return (
            <section key={categorie}>
              <h2 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
                {CATEGORY_LABELS[categorie]}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {items.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} orgSlug={orgSlug} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
