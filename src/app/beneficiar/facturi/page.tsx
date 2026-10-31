import { urlsSemnate } from "@/lib/fisiere-private";
import { eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingInvoices } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

const getInvoices = withBeneficiarSession(async (ctx) => {
  return ctx.db.select().from(fundraisingInvoices).where(eq(fundraisingInvoices.campaignPageId, ctx.campaignPageId)).orderBy(fundraisingInvoices.data);
});

export default async function FacturiPage() {
  const invoices = await urlsSemnate(await getInvoices());
  const t = BENEFICIAR_PORTAL_UI_DICT[await getLocale()];
  const f = t.facturi;
  const formatLei = (n: number) => `${n.toLocaleString(t.numere)} lei`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{f.titlu}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{f.desc}</p>
      </div>

      {invoices.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-3 font-semibold text-ink">{f.denumire}</th>
                <th className="p-3 font-semibold text-ink">{f.categorie}</th>
                <th className="p-3 font-semibold text-ink">{f.data}</th>
                <th className="p-3 font-semibold text-ink">{f.status}</th>
                <th className="p-3 text-right font-semibold text-ink">{f.suma}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-line">
                  <td className="p-3 text-ink">{inv.denumire}</td>
                  <td className="p-3 text-muted">{t.categorii[inv.categorie] ?? inv.categorie}</td>
                  <td className="p-3 text-muted">{new Date(inv.data).toLocaleDateString(t.numere)}</td>
                  <td className="p-3">
                    <span className={inv.status === "achitata" ? "text-brand-green" : "text-brand-amber"}>
                      {inv.status === "achitata" ? t.statusFactura.achitata : t.statusFactura.asteptare}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-ink">{formatLei(inv.suma)}</td>
                  <td className="p-3 text-right">
                    {inv.fisierUrl && (
                      <a href={inv.fisierUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-green hover:underline">
                        {t.descarca}
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
          <p className="text-[13.5px] text-muted-2">{f.gol}</p>
        </div>
      )}
    </div>
  );
}
