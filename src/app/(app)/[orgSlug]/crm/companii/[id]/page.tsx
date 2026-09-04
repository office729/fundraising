import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge, type StatusTone } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card } from "../../components/ui/card";
import { formatData, formatDataRelativa } from "../../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { getCompanieDetaliu } from "../queries";
import { CompanyTabs } from "./company-tabs";
import { TagPills } from "./tag-pills";

const CONTRACT_TONE: Record<string, StatusTone> = { trimis: "blue", asteptare: "amber", semnat: "green", anulat: "red" };

export default async function CompanieProfilPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const data = await getCompanieDetaliu(orgSlug, id);
  if (!data) notFound();
  const locale = await getLocale();
  const dict = COMPANII_DICT[locale].detail;

  const { companie: c, sponsorizari, notite, contacte, responsabili } = data;

  const activitate = [
    ...sponsorizari.map((s) => ({
      la: new Date(`${s.data}T12:00:00Z`),
      text: dict.activitateText.sponsorizare(s.suma.toLocaleString("ro-RO"), s.proiect),
    })),
    ...notite.map((n) => ({ la: n.createdAt, text: dict.activitateText.notita(n.text.length > 80 ? n.text.slice(0, 80) + "…" : n.text) })),
    ...contacte.map((ct) => ({ la: ct.createdAt, text: dict.activitateText.contactAdaugat(ct.nume) })),
  ]
    .sort((a, b) => b.la.getTime() - a.la.getTime())
    .map((a) => ({ la: a.la.toISOString(), text: a.text }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Breadcrumb items={[{ label: dict.breadcrumbCompanii, href: `/${orgSlug}/crm/companii` }, { label: c.nume }]} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{c.nume}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={c.status === "won" ? "green" : c.status === "lost" ? "red" : c.status === "parked" ? "neutral" : "blue"}>{c.status}</Badge>
                {c.industrie && <Badge tone="neutral">{c.industrie}</Badge>}
                {c.contractStatus && <Badge tone={CONTRACT_TONE[c.contractStatus]} icon={false}>{dict.contractPrefix} {dict.contractLabel[c.contractStatus as keyof typeof dict.contractLabel]}</Badge>}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ci-text-muted)]">
                {[c.localitate, c.judet].filter(Boolean).join(", ")}
                {c.site && ` · ${c.site}`}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ci-text-muted)]">
                {c.cui && <span className="ci-tabular font-medium text-[var(--ci-text)]">{c.cui}</span>}
                {c.caen && <span>{dict.caen} {c.caen}</span>}
                {c.nrAngajati != null && <span>· {dict.angajati(c.nrAngajati)}</span>}
                {c.numarContract && (
                  <span className="ci-tabular">· {dict.contractNr(c.numarContract, c.dataSemnare ? formatData(c.dataSemnare) : "")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-4">
          <Stat label={dict.stats.totalSponsorizat} value={`${(c.sumaSponsorizata ?? 0).toLocaleString("ro-RO")} RON`} />
          <Stat label={dict.stats.soldDisponibil} value={c.sumaDisponibila != null ? `${c.sumaDisponibila.toLocaleString("ro-RO")} RON` : "—"} />
          <Stat label={dict.stats.sponsorizari} value={String(sponsorizari.length)} />
          <Stat label={dict.stats.ultimaActivitate} value={activitate[0] ? formatDataRelativa(activitate[0].la) : "—"} />
        </div>
      </Card>

      <TagPills
        companyId={c.id}
        initial={{ temperatura: c.temperatura, recurent: c.recurent, d177: c.d177, mec20: c.mec20, decembrie: c.decembrie }}
        responsabili={responsabili}
        ownerIdInitial={c.ownerId}
      />

      <CompanyTabs
        firma={{
          id: c.id, nume: c.nume, status: c.status, industrie: c.industrie, contractStatus: c.contractStatus,
          cui: c.cui, nrRegCom: c.nrRegCom, judet: c.judet, localitate: c.localitate, adresa: c.adresa,
          caen: c.caen, anInfiintare: c.anInfiintare, site: c.site, linkedin: c.linkedin, facebook: c.facebook,
          administrator: c.administrator, ca: c.ca, profit: c.profit, impozit: c.impozit, regimFiscal: c.regimFiscal,
          anBilant: c.anBilant, nrAngajati: c.nrAngajati, sumaDisponibila: c.sumaDisponibila, sumaPropusa: c.sumaPropusa,
          sumaSponsorizata: c.sumaSponsorizata, numarContract: c.numarContract, dataSemnare: c.dataSemnare, nota: c.nota,
        }}
        sponsorizari={sponsorizari}
        notite={notite}
        contacte={contacte}
        activitate={activitate}
      />
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
