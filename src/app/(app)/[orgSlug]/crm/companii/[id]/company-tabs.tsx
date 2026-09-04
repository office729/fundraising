"use client";

import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { Tabs } from "../../components/ui/tabs";
import { formatDataOra } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { ContactePanel } from "./contacte-panel";
import { ContractPanel } from "./contract-panel";
import { EditarePanel } from "./editare-panel";
import { NotitePanel } from "./notite-panel";
import { SponsorizariPanel } from "./sponsorizari-panel";

// Randare-prop (children ca funcție) pe <Tabs> — funcțiile nu pot traversa
// granița Server → Client Component în React Server Components, de-aici
// nevoia acestei componente client separate: page.tsx (Server Component)
// aduce datele reale și le pasează ca props simple, serializabile; compunerea
// tab-urilor (care are nevoie de funcția children) se face DOAR aici, client-side.
type Firma = {
  id: string; nume: string; status: string; industrie: string | null; contractStatus: string | null;
  cui: string | null; nrRegCom: string | null; judet: string | null; localitate: string | null; adresa: string | null;
  caen: string | null; anInfiintare: number | null; site: string | null; linkedin: string | null; facebook: string | null;
  administrator: string | null; ca: number | null; profit: number | null; impozit: number | null; regimFiscal: string | null;
  anBilant: number | null; nrAngajati: number | null; sumaDisponibila: number | null; sumaPropusa: number | null;
  sumaSponsorizata: number | null; numarContract: string | null; dataSemnare: string | null; nota: string | null;
};

export function CompanyTabs({
  firma: c,
  sponsorizari,
  notite,
  contacte,
  activitate,
}: {
  firma: Firma;
  sponsorizari: Parameters<typeof SponsorizariPanel>[0]["sponsorizari"];
  notite: Parameters<typeof NotitePanel>[0]["notite"];
  contacte: Parameters<typeof ContactePanel>[0]["contacte"];
  activitate: { la: string; text: string }[];
}) {
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail;
  return (
    <Tabs
      accent="primary"
      tabs={[
        { key: "prezentare", label: dict.tabs.prezentare },
        { key: "financiar", label: dict.tabs.financiar },
        { key: "sponsorizari", label: dict.tabs.sponsorizari(sponsorizari.length) },
        { key: "contract", label: dict.tabs.contract },
        { key: "notite", label: dict.tabs.notite },
        { key: "activitate", label: dict.tabs.activitate },
        { key: "documente", label: dict.tabs.documente },
        { key: "contacte", label: dict.tabs.contacte(contacte.length) },
        { key: "editare", label: dict.tabs.editare },
      ]}
    >
      {(active) => {
        if (active === "prezentare")
          return (
            <Card>
              <InfoRow label={dict.info.cui} value={c.cui} />
              <InfoRow label={dict.info.nrRegCom} value={c.nrRegCom} />
              <InfoRow label={dict.info.judet} value={c.judet} />
              <InfoRow label={dict.info.localitate} value={c.localitate} />
              <InfoRow label={dict.info.adresa} value={c.adresa} />
              <InfoRow label={dict.info.caen} value={c.caen} />
              <InfoRow label={dict.info.industrie} value={c.industrie} />
              <InfoRow label={dict.info.anInfiintare} value={c.anInfiintare != null ? String(c.anInfiintare) : null} />
              <InfoRow label={dict.info.website} value={c.site} />
              <InfoRow label={dict.info.linkedin} value={c.linkedin} />
              <InfoRow label={dict.info.facebook} value={c.facebook} />
              <InfoRow label={dict.info.administrator} value={c.administrator} />
            </Card>
          );
        if (active === "financiar")
          return (
            <Card>
              <InfoRow label={dict.info.ca} value={c.ca != null ? `${c.ca.toLocaleString("ro-RO")} RON` : null} />
              <InfoRow label={dict.info.profit} value={c.profit != null ? `${c.profit.toLocaleString("ro-RO")} RON` : null} />
              <InfoRow label={dict.info.impozit} value={c.impozit != null ? `${c.impozit.toLocaleString("ro-RO")} RON` : null} />
              <InfoRow label={dict.info.regimFiscal} value={c.regimFiscal} />
              <InfoRow label={dict.info.anBilant} value={c.anBilant != null ? String(c.anBilant) : null} />
              <InfoRow label={dict.info.nrAngajati} value={c.nrAngajati != null ? String(c.nrAngajati) : null} />
              <InfoRow label={dict.info.sumaDisponibila} value={c.sumaDisponibila != null ? `${c.sumaDisponibila.toLocaleString("ro-RO")} RON` : null} />
              <InfoRow label={dict.info.sumaPropusa} value={c.sumaPropusa != null ? `${c.sumaPropusa.toLocaleString("ro-RO")} RON` : null} />
              <InfoRow label={dict.info.sumaSponsorizataTotal} value={`${(c.sumaSponsorizata ?? 0).toLocaleString("ro-RO")} RON`} />
            </Card>
          );
        if (active === "sponsorizari") return <SponsorizariPanel companyId={c.id} sponsorizari={sponsorizari} />;
        if (active === "contract")
          return (
            <ContractPanel
              companyId={c.id}
              numarContract={c.numarContract}
              dataSemnare={c.dataSemnare}
              contractStatus={c.contractStatus as "trimis" | "asteptare" | "semnat" | "anulat" | null}
            />
          );
        if (active === "notite") return <NotitePanel companyId={c.id} notite={notite} />;
        if (active === "activitate")
          return activitate.length === 0 ? (
            <EmptyState title={dict.activitateEmpty.title} description={dict.activitateEmpty.description} />
          ) : (
            <div className="space-y-2">
              {activitate.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                  <span className="text-[13px] text-[var(--ci-text)]">{a.text}</span>
                  <span className="shrink-0 text-[12px] text-[var(--ci-text-muted)]">{formatDataOra(a.la)}</span>
                </div>
              ))}
            </div>
          );
        if (active === "documente")
          return (
            <EmptyState
              title={dict.documenteEmpty.title}
              description={dict.documenteEmpty.description}
            />
          );
        if (active === "contacte") return <ContactePanel companyId={c.id} contacte={contacte} />;
        return (
          <EditarePanel
            companyId={c.id}
            firma={{
              nume: c.nume, cui: c.cui, judet: c.judet, localitate: c.localitate, adresa: c.adresa,
              caen: c.caen, industrie: c.industrie, site: c.site, linkedin: c.linkedin, facebook: c.facebook,
              administrator: c.administrator, ca: c.ca, profit: c.profit, nrAngajati: c.nrAngajati, nota: c.nota,
            }}
          />
        );
      }}
    </Tabs>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ci-border)] py-2 last:border-0">
      <span className="text-[13px] text-[var(--ci-text-muted)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--ci-text)]">{value || "—"}</span>
    </div>
  );
}
