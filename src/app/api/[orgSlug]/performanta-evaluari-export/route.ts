import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { exportaEvaluari } from "@/lib/performanta-rapoarte-evaluari";

// Export Excel al evaluărilor: foaia „Acoperire” (cine a avut ce discuții în perioadă) și foaia „Intrări” (conținutul intrărilor).
// Conține doar ce are voie să vadă cel care exportă (administrator: toți; manager: el și echipa lui; ceilalți: doar propriile intrări); un review nepartajat
// apare doar la autor și la administratori. Fiecare export se înregistrează în auditul modulului. Documentul e confidențial.
type Ctx = { params: Promise<{ orgSlug: string }> };
const dataRo = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

const exporta = withOrgSession(async (ctx, url: string) => {
  const u = new URL(url);
  const d = await exportaEvaluari(ctx, u.searchParams.get("perioada"));
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const nota = [`CONFIDENȚIAL: conține evaluări ale unor persoane. Perioada ${d.perioada.eticheta}. Exportat de ${ctx.orgName}. Nu se distribuie în afara celor care au dreptul să le vadă.`];

  const acoperire = XLSX.utils.aoa_to_sheet([
    nota,
    [],
    ["Persoană", "Actualizări săptămânale", "Săptămâni scurse", "Discuții 1:1", "Ultima 1:1", "Review", "Autoevaluare", "Feedback primit", "Feedback dat", "Obiective de dezvoltare", "Atinse", "În curs"],
    ...d.persoane.map((p) => [p.nume, p.checkinuri, d.perioada.saptamaniScurse, p.nr1la1, dataRo(p.ultima1la1), p.review === "niciunul" ? "niciunul vizibil" : p.review === "partajat" ? "partajat" : "privat", p.autoevaluare ? "da" : "nu", p.feedbackPrimit, p.feedbackDat, p.dezvoltareTotal, p.dezvoltareAtinse, p.dezvoltareInCurs]),
  ]);
  acoperire["!cols"] = [26, 14, 12, 12, 14, 16, 12, 12, 12, 14, 10, 10].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, acoperire, "Acoperire");

  const intrari = XLSX.utils.aoa_to_sheet([nota, [], ["Persoană", "Tip", "Data", "Perioadă", "Autor", "Conținut"], ...d.intrari.map((i) => [i.persoana, i.tip, dataRo(i.data), i.perioada.replace("-T", " T"), i.autor, i.continut])]);
  intrari["!cols"] = [26, 24, 12, 12, 24, 100].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, intrari, "Intrări");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="evaluari-${d.perioada.cod}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return exporta(orgSlug, req.url);
}
