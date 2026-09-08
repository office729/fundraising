import { eq } from "drizzle-orm";

import { requireBeneficiarAccess, withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingInvoices } from "@/lib/db/schema";

function formatLei(n: number): string {
  return `${n.toLocaleString("ro-RO")} lei`;
}

const CATEGORIE_LABEL: Record<string, string> = {
  factura: "Factură",
  plata: "Plată",
  chitanta: "Chitanță",
  proforma: "Proformă",
};

const getInvoices = withBeneficiarSession(async (ctx) => {
  return ctx.db
    .select()
    .from(fundraisingInvoices)
    .where(eq(fundraisingInvoices.campaignPageId, ctx.campaignPageId))
    .orderBy(fundraisingInvoices.data);
});

export default async function SituatieFinanciaraPage() {
  const [access, invoices] = await Promise.all([requireBeneficiarAccess(), getInvoices()]);

  const sumaStransa = access.campaignSumaStransa ?? 0;
  const sumaTinta = access.campaignSumaTinta;
  const contributieOperationala = Math.round(sumaStransa * 0.1);
  const sumaNeta = sumaStransa - contributieOperationala;
  const facturiAchitate = invoices.filter((i) => i.status === "achitata").reduce((s, i) => s + i.suma, 0);
  const soldNet = sumaNeta - facturiAchitate;
  const ramasDeStrans = sumaTinta ? Math.max(0, sumaTinta - sumaStransa) : null;

  const randuri = [
    { label: "Sumă brută strânsă", valoare: sumaStransa, semn: "" },
    { label: "Contribuție operațională (10%)", valoare: contributieOperationala, semn: "−" },
    { label: "Sumă netă disponibilă", valoare: sumaNeta, semn: "=" },
    { label: "Total facturi achitate", valoare: facturiAchitate, semn: "−" },
    { label: "Sold net disponibil", valoare: soldNet, semn: "=" },
  ];
  if (sumaTinta != null && ramasDeStrans != null) {
    randuri.push({ label: "Sumă rămasă de strâns (din țintă)", valoare: ramasDeStrans, semn: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Situație financiară</h1>
        <p className="mt-1 text-[13.5px] text-muted">Calculul complet, actualizat automat cu fiecare donație și fiecare document încărcat de echipă.</p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex flex-col divide-y divide-line">
          {randuri.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5 text-[14px]">
              <span className={r.semn === "=" ? "font-semibold text-ink" : "text-muted"}>{r.label}</span>
              <span className={r.semn === "=" ? "font-bold text-brand-green" : "font-medium text-ink"}>
                {r.semn === "−" ? "− " : ""}
                {formatLei(r.valoare)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">Documente financiare</h2>
        {invoices.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{inv.denumire}</p>
                  <p className="text-[12px] text-muted-2">
                    {CATEGORIE_LABEL[inv.categorie] ?? inv.categorie} · {new Date(inv.data).toLocaleDateString("ro-RO")} ·{" "}
                    {inv.status === "achitata" ? "Achitată" : "În așteptare"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-ink">{formatLei(inv.suma)}</span>
                  {inv.fisierUrl && (
                    <a href={inv.fisierUrl} target="_blank" rel="noreferrer" className="text-brand-green hover:underline">
                      Descarcă
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted-2">Nu există încă documente financiare încărcate pentru această campanie.</p>
        )}
      </div>
    </div>
  );
}
