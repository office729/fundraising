import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { variantaPagina } from "@/lib/personalizare-org";

import { personalizareEfectiva } from "../personalizare-efectiva";
import { coadaAzi, deAprobat, firmeDeCautat, getStatisticaDecidenti, urmarireLinkedin } from "./actions";
import { UrmarireLinkedin } from "./linkedin-urmarire";
import { CautareMasa, CoadaAzi, DeAprobatGlobal } from "./decidenti-client";
import { GraficDecidenti } from "./grafic-decidenti";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Decidenți: ce ai de făcut cu persoanele găsite prin prospectare — de contactat azi, de aprobat, căutare în masă.
export default async function DecidentiPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const tab = unu(sp.tab) === "aprobare" ? "aprobare" : unu(sp.tab) === "masa" ? "masa" : unu(sp.tab) === "linkedin" ? "linkedin" : "azi";
  const toate = unu(sp.al) === "toate";
  const benzi = unu(sp.benzi) === "A" ? "A" : "AB";

  // Varianta „grafic”, activată doar pentru organizațiile cărora le-a fost aleasă în editorul de aspect (vezi VARIANTE_PAGINI).
  const arataGrafic = variantaPagina(await personalizareEfectiva(orgSlug, access.userEmail), "decidenti") === "grafic";
  const [coada, aprobare, masa, etape, linkedin] = await Promise.all([
    coadaAzi(orgSlug, toate),
    deAprobat(orgSlug),
    tab === "masa" ? firmeDeCautat(orgSlug, benzi) : Promise.resolve(null),
    arataGrafic ? getStatisticaDecidenti(orgSlug).catch(() => null) : Promise.resolve(null),
    tab === "linkedin" ? urmarireLinkedin(orgSlug) : Promise.resolve(null),
  ]);
  const scadente = coada ? coada.rows.filter((r) => !r.urmatorPasLa || r.urmatorPasLa <= coada.azi).length : 0;

  const tabs = [
    { k: "azi", eticheta: "De contactat azi", n: coada ? scadente : null, href: `/${orgSlug}/crm/decidenti` },
    { k: "aprobare", eticheta: "De aprobat", n: aprobare ? aprobare.rows.length : null, href: `/${orgSlug}/crm/decidenti?tab=aprobare` },
    { k: "masa", eticheta: "Căutare în masă", n: null, href: `/${orgSlug}/crm/decidenti?tab=masa` },
    { k: "linkedin", eticheta: "LinkedIn", n: null, href: `/${orgSlug}/crm/decidenti?tab=linkedin` },
  ] as const;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Decidenți</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Persoanele care decid sponsorizările în firmele tale: de la găsire, la aprobare, la primul contact și urmărire. Căutarea individuală se face de pe fișa fiecărei firme.
        </p>
      </div>
      <nav aria-label="Secțiuni" className="flex flex-wrap gap-1.5 border-b border-[var(--ci-border)] pb-2">
        {tabs.map((t) => (
          <Link
            key={t.k}
            href={t.href}
            aria-current={tab === t.k ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-[13px] font-medium ${tab === t.k ? "bg-[var(--ci-primary-soft)] text-[var(--ci-primary-hover)]" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}
          >
            {t.eticheta}
            {t.n !== null && <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-xs tabular-nums text-[var(--ci-text)]">{t.n}</span>}
          </Link>
        ))}
      </nav>

      {tab === "azi" &&
        (coada ? (
          <CoadaAzi orgSlug={orgSlug} date={coada} toate={toate} />
        ) : (
          <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            Nu am putut încărca lista. Reîncarcă pagina.
          </p>
        ))}
      {tab === "aprobare" &&
        (aprobare ? (
          <DeAprobatGlobal orgSlug={orgSlug} date={aprobare} />
        ) : (
          <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            Nu am putut încărca lista. Reîncarcă pagina.
          </p>
        ))}
      {tab === "linkedin" &&
        (linkedin ? (
          <UrmarireLinkedin orgSlug={orgSlug} palnie={linkedin.palnie} liste={linkedin.liste} />
        ) : (
          <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            Nu am putut încărca datele. Reîncarcă pagina.
          </p>
        ))}
      {tab === "masa" &&
        (masa ? (
          <CautareMasa key={benzi} orgSlug={orgSlug} date={masa} benzi={benzi} />
        ) : (
          <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            Nu am putut încărca firmele. Reîncarcă pagina.
          </p>
        ))}
      {etape && <GraficDecidenti etape={etape} />}
    </div>
  );
}
