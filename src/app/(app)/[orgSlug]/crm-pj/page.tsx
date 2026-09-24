import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { CRM_PJ_HTML } from "@/modules/crm/crm-pj/crm-pj-html";
import { SandboxedFrame } from "@/modules/crm/shared/sandboxed-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

// Ghilimelele/`<` dintr-un nume nu au voie să iasă din literalul JS în care îl
// inserăm (un nume ca `</script>` ar rupe scriptul din instrument).
function literalJs(v: string): string {
  // "<" și separatorii de linie Unicode nu au voie să apară literal într-un
  // <script>; îi înlocuim cu secvențe de escape, fără regex (evită și ambiguități).
  const BS = String.fromCharCode(92);
  return JSON.stringify(v)
    .split("<")
    .join(BS + "u003c")
    .split(String.fromCharCode(0x2028))
    .join(BS + "u2028")
    .split(String.fromCharCode(0x2029))
    .join(BS + "u2029");
}

export default async function CrmPjPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const userName = access.userName || access.userEmail;

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "crm-pj")) {
    return <ToolLocked orgSlug={orgSlug} toolName="CRM Companii & Sponsorizări" />;
  }

  // Înlocuirile se fac pe server: HTML-ul de 271 KB nu mai intră în bundle-ul
  // JavaScript al clientului (înainte îl importa un component "use client").
  // Numele logat era scris în localStorage și citit de instrument la pornire
  // (config.eu); în iframe-ul sandboxed localStorage vine dintr-un snapshot al
  // gazdei, deci îl injectăm direct în locul citirii.
  const html = CRM_PJ_HTML.replaceAll("__FA_ORG_SLUG__", orgSlug)
    .replaceAll("__FA_ORG_ROLE__", access.role)
    .replace('localStorage.getItem("soi-crm-loginname")', () => literalJs(userName));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link href={`/${orgSlug}`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumentele tale
        </Link>
        <span className="text-line">/</span>
        <span className="font-display text-sm font-semibold text-ink">CRM Persoane Juridice</span>
      </header>
      <div className="min-h-0 flex-1">
        <SandboxedFrame html={html} title="CRM Persoane Juridice" orgSlug={orgSlug} />
      </div>
    </div>
  );
}
