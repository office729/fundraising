import { notFound } from "next/navigation";

import { analizeazaDonator, type NivelRisc } from "@/lib/analiza-donator";
import { etichetaProvenienta } from "@/lib/atribuire/clasificare";
import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
import { pachetPentruModule } from "@/lib/billing/trial";

import { AnalizaDonatorCard } from "../../../components/analiza-donator-card";
import { ModulBlocatInline } from "../../../components/modul-blocat-inline";
import { Avatar } from "../../../components/ui/avatar";
import { Badge, type StatusTone } from "../../../components/ui/badge";
import { Breadcrumb } from "../../../components/ui/breadcrumb";
import { Card } from "../../../components/ui/card";
import { getLocale } from "@/lib/i18n/get-locale";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";
import { DONATORI_UI2_DICT } from "@/lib/i18n/dictionaries/donatori-ui-2";
import { titluAbsolut } from "@/lib/page-titles";

import { formatariPf } from "../../pf-format";
import { getDonatorRealDetaliu } from "../../queries";
import { DonatorTabs } from "./donator-tabs";
import { GdprPanelDonator } from "./gdpr-panel";
import { esteStareAdresa } from "@/lib/igiena-email";

import { CampuriPersonalizateCard } from "../../../components/campuri-personalizate-card";
import { valoriDinJson } from "@/lib/campuri-personalizate";

import { AdresaEmailPanel } from "./adresa-panel";
import { CronologiePanel } from "./cronologie-panel";
import { NotitePanelDonatorReal } from "./notite-panel";

const STATUS_TONE: Record<string, StatusTone> = { in_asteptare: "amber", reusita: "green", esuata: "red", rambursata: "orange" };
const TON_RISC: Record<NivelRisc, StatusTone> = { scazut: "green", mediu: "amber", ridicat: "red", necunoscut: "neutral" };

export default async function DonatorRealProfilPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const data = await getDonatorRealDetaliu(orgSlug, id);
  if (!data) notFound();
  const { donator, donatii, notite, cronologie, campuriDefs, poateAdministra } = data;
  const access = await requireOrgAccess(orgSlug);
  const areAnaliza = areModul(pachetPentruModule(access.orgPackage, access.userEmail), "analiza-donator");
  const areCampuri = areModul(pachetPentruModule(access.orgPackage, access.userEmail), "campuri-personalizate");
  const locale = await getLocale();
  const analiza = areAnaliza ? analizeazaDonator({ primaAt: donator.primaDonatieLa, ultimaAt: donator.ultimaDonatieLa, nr: donator.numarDonatii, total: donator.totalDonat }, new Date(), locale) : null;
  const dict = DONATORI_REALI_DICT[locale].detail;
  const statusLabel = dict.donatii.statusLabel;
  const t = DONATORI_UI2_DICT[locale].fisa;
  const fmt = formatariPf(locale);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dict.breadcrumb, href: `/${orgSlug}/crm/donatori` }, { label: donator.nume }]} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={donator.nume} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{donator.nume}</h1>
                <Badge tone="blue" icon={false}>
                  {dict.dateReale}
                </Badge>
                {donator.consimtamantWhatsapp && (
                  <Badge tone="green" icon={false}>
                    WhatsApp
                  </Badge>
                )}
                {analiza && analiza.risc !== "necunoscut" && (
                  <Badge tone={TON_RISC[analiza.risc]} icon={false}>
                    {t.riscEticheta[analiza.risc]}
                  </Badge>
                )}
                {donator.emailStare !== "ok" && (
                  <Badge tone="amber" icon={false}>
                    {donator.emailStare === "reclamat" ? t.spam : t.adresaRespinsa}
                  </Badge>
                )}
                {donator.dezabonatEmailLa && (
                  <Badge tone="amber" icon={false}>
                    {t.dezabonat}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-[13px] text-[var(--ci-text-muted)]">
                {donator.email} · {donator.telefon || dict.client.faraTelefon}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ci-text-faint)]">
                {dict.client.sursa}: {donator.sursa} · {dict.client.metodaPlata}: {donator.metodaPlata}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-4">
          <Stat label={dict.stats.totalDonat} value={fmt.lei(donator.totalDonat)} />
          <Stat label={dict.stats.numarDonatii} value={String(donator.numarDonatii)} />
          <Stat label={dict.stats.primaDonatie} value={fmt.dataScurta(donator.primaDonatieLa.toISOString())} />
          <Stat label={dict.stats.ultimaDonatie} value={fmt.relativa(donator.ultimaDonatieLa.toISOString())} />
        </div>
      </Card>

      {analiza ? (
        <AnalizaDonatorCard analiza={analiza} />
      ) : (
        <ModulBlocatInline
          orgSlug={orgSlug}
          modul="analiza-donator"
          descriere={t.modulBlocat}
          poateSchimba={access.role === "owner" || access.role === "admin"}
        />
      )}

      <Card className={donator.consimtamantWhatsapp ? "border-[var(--ci-green-soft)] bg-[var(--ci-green-soft)]" : ""}>
        <p className="text-[13px] font-medium text-[var(--ci-text)]">
          {donator.consimtamantWhatsapp ? dict.whatsapp.daText : dict.whatsapp.nuText}
        </p>
      </Card>

      <AdresaEmailPanel
        donatorId={donator.id}
        email={donator.email}
        stare={esteStareAdresa(donator.emailStare) ? donator.emailStare : "ok"}
        motiv={donator.emailStareMotiv}
        acord={donator.consimtamantEmail}
        acordSursa={donator.consimtamantEmailSursa}
        dezabonat={donator.dezabonatEmailLa !== null}
        frecventa={donator.frecventaEmail === "rara" ? "rara" : "normala"}
        poateAdministra={poateAdministra}
      />

      {areCampuri && <CampuriPersonalizateCard entitate="donator" idEntitate={donator.id} defs={campuriDefs} valori={valoriDinJson(donator.campuri)} />}

      {poateAdministra && <GdprPanelDonator donatorId={donator.id} nume={donator.nume} />}

      {/* Panourile se randează pe server și se trimit ca noduri gata făcute — Tabs (client) nu poate
          primi o funcție ca `children` dintr-o componentă server (eroare 500 în Next). */}
      <DonatorTabs
        tabs={[
          { key: "cronologie", label: t.tabCronologie(cronologie.length) },
          { key: "donatii", label: dict.tabs.donatii(donatii.length) },
          { key: "notite", label: t.tabNotite(notite.length) },
        ]}
        panels={{
          cronologie: <CronologiePanel evenimente={cronologie} />,
          donatii: (
            donatii.length ? (
              <Card padded={false}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.data}</th>
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.suma}</th>
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.status}</th>
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.sursa}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donatii.map((d) => (
                      <tr key={d.id} className="border-b border-[var(--ci-border)] last:border-0">
                        <td className="px-4 py-2.5 text-[var(--ci-text-muted)]">{fmt.dataOraScurta(d.createdAt.toISOString())}</td>
                        <td className="ci-tabular px-4 py-2.5 font-medium text-[var(--ci-text)]">
                          {fmt.lei(d.suma)}{d.recurenta ? ` · ${dict.donatii.recurenta}` : ""}
                          {d.proiect && <span className="block text-[12px] font-normal text-[var(--ci-text-muted)]">{d.proiect}</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={STATUS_TONE[d.status]} icon={false}>
                            {statusLabel[d.status] ?? d.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-[12.5px] text-[var(--ci-text-muted)]">{etichetaProvenienta({ sursa: d.provSursa, canal: d.provCanal, tip: d.provTip, campanie: d.provCampanie }, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.donatii.empty}</p>
            )
          ),
          notite: <NotitePanelDonatorReal donatorId={donator.id} notite={notite} />,
        }}
      />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatorProfil");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
      <p className="ci-tabular mt-0.5 truncate text-[15px] font-semibold text-[var(--ci-text)]">{value}</p>
    </div>
  );
}
