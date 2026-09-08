import { eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
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
  return ctx.db.select().from(fundraisingInvoices).where(eq(fundraisingInvoices.campaignPageId, ctx.campaignPageId)).orderBy(fundraisingInvoices.data);
});

export default async function FacturiPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Facturi și plăți</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Toate documentele financiare încărcate de echipă pentru campania ta — poți vizualiza și descărca, dar nu poți modifica.
        </p>
      </div>

      {invoices.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-3 font-semibold text-ink">Denumire</th>
                <th className="p-3 font-semibold text-ink">Categorie</th>
                <th className="p-3 font-semibold text-ink">Data</th>
                <th className="p-3 font-semibold text-ink">Status</th>
                <th className="p-3 text-right font-semibold text-ink">Sumă</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-line">
                  <td className="p-3 text-ink">{inv.denumire}</td>
                  <td className="p-3 text-muted">{CATEGORIE_LABEL[inv.categorie] ?? inv.categorie}</td>
                  <td className="p-3 text-muted">{new Date(inv.data).toLocaleDateString("ro-RO")}</td>
                  <td className="p-3">
                    <span className={inv.status === "achitata" ? "text-brand-green" : "text-brand-amber"}>
                      {inv.status === "achitata" ? "Achitată" : "În așteptare"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-ink">{formatLei(inv.suma)}</td>
                  <td className="p-3 text-right">
                    {inv.fisierUrl && (
                      <a href={inv.fisierUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-green hover:underline">
                        Descarcă
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-8 text-center">
          <p className="text-[13.5px] text-muted-2">Nu există încă documente financiare încărcate pentru această campanie.</p>
        </div>
      )}
    </div>
  );
}
