import { requireOrgAccess } from "@/lib/auth/guard";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { IstoricDocumente } from "../_comun/istoric-documente";
import { listeazaCompaniiImpactAction } from "./impact-actions";
import { GalerieModele } from "./galerie-modele";

export const dynamic = "force-dynamic";

// Rapoarte de impact pentru companii: aici se alege doar șablonul. Datele firmei, logo-urile și exportul se fac în generator.
export default async function RaportCompaniiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const t = INSTRUMENTE_UI_DICT[await getLocale()].raportCompanii;
  const firme = await listeazaCompaniiImpactAction(orgSlug).catch(() => []);
  const totalFirme = firme.reduce((t, f) => t + f.total, 0);
  const top3 = [...firme].sort((a, b) => b.total - a.total).slice(0, 3);
  const procentTop3 = totalFirme > 0 ? Math.round((top3.reduce((t, f) => t + f.total, 0) / totalFirme) * 100) : 0;
  const logo = access.orgLogoUrl && /^https:\/\//i.test(access.orgLogoUrl) ? access.orgLogoUrl : "";
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
      </div>
      {firme.length >= 4 && (
        <p role="note" className={`rounded-[var(--ci-radius-btn)] border px-3 py-2 text-[12.5px] ${procentTop3 >= 60 ? "border-[var(--ci-red)] text-[var(--ci-red)]" : "border-[var(--ci-border)] text-[var(--ci-text-muted)]"}`}>
          {t.concentrare(procentTop3, firme.length, procentTop3 >= 60)}
        </p>
      )}
      <IstoricDocumente orgSlug={orgSlug} tip="rapoarte" hrefGenerator={`/${orgSlug}/crm/instrumente/raport-companii/impact`} />
      <GalerieModele orgSlug={orgSlug} organizatie={access.orgName} logoOng={logo} culoare={access.orgBrandColor} azi={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmRaportImpact");
}
