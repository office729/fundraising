import { notFound } from "next/navigation";

import { Avatar } from "../../../components/ui/avatar";
import { Badge, type StatusTone } from "../../../components/ui/badge";
import { Breadcrumb } from "../../../components/ui/breadcrumb";
import { Card } from "../../../components/ui/card";
import { Tabs } from "../../../components/ui/tabs";
import { formatData, formatDataOra, formatDataRelativa } from "../../../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";

import { getDonatorRealDetaliu } from "../../queries";
import { NotitePanelDonatorReal } from "./notite-panel";

const STATUS_TONE: Record<string, StatusTone> = { in_asteptare: "amber", reusita: "green", esuata: "red", rambursata: "orange" };

export default async function DonatorRealProfilPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const data = await getDonatorRealDetaliu(orgSlug, id);
  if (!data) notFound();
  const { donator, donatii, notite } = data;
  const locale = await getLocale();
  const dict = DONATORI_REALI_DICT[locale].detail;
  const statusLabel = dict.donatii.statusLabel;

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
          <Stat label={dict.stats.totalDonat} value={`${donator.totalDonat.toLocaleString("ro-RO")} lei`} />
          <Stat label={dict.stats.numarDonatii} value={String(donator.numarDonatii)} />
          <Stat label={dict.stats.primaDonatie} value={formatData(donator.primaDonatieLa.toISOString())} />
          <Stat label={dict.stats.ultimaDonatie} value={formatDataRelativa(donator.ultimaDonatieLa.toISOString())} />
        </div>
      </Card>

      <Card className={donator.consimtamantWhatsapp ? "border-[var(--ci-green-soft)] bg-[var(--ci-green-soft)]" : ""}>
        <p className="text-[13px] font-medium text-[var(--ci-text)]">
          {donator.consimtamantWhatsapp ? dict.whatsapp.daText : dict.whatsapp.nuText}
        </p>
      </Card>

      <Tabs
        tabs={[
          { key: "donatii", label: dict.tabs.donatii(donatii.length) },
          { key: "notite", label: dict.tabs.notite(notite.length) },
        ]}
      >
        {(active) => {
          if (active === "donatii")
            return donatii.length ? (
              <Card padded={false}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.data}</th>
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.suma}</th>
                      <th className="px-4 py-2 font-semibold">{dict.donatii.columns.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donatii.map((d) => (
                      <tr key={d.id} className="border-b border-[var(--ci-border)] last:border-0">
                        <td className="px-4 py-2.5 text-[var(--ci-text-muted)]">{formatDataOra(d.createdAt.toISOString())}</td>
                        <td className="ci-tabular px-4 py-2.5 font-medium text-[var(--ci-text)]">
                          {d.suma.toLocaleString("ro-RO")} lei{d.recurenta ? ` · ${dict.donatii.recurenta}` : ""}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={STATUS_TONE[d.status]} icon={false}>
                            {statusLabel[d.status] ?? d.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.donatii.empty}</p>
            );
          return <NotitePanelDonatorReal donatorId={donator.id} notite={notite} />;
        }}
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
      <p className="ci-tabular mt-0.5 truncate text-[15px] font-semibold text-[var(--ci-text)]">{value}</p>
    </div>
  );
}
