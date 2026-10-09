import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { incarcaRapoarte } from "@/lib/performanta-rapoarte";

// Export Excel al rapoartelor Echipă & Performanță: „obiective” (rezultate-cheie cu valori, ținte, surse și atribuire) sau „munca” (pe săptămâni și pe persoană).
// Exportă doar ce vede utilizatorul (aceleași încărcări ca paginile). Evaluările nu se exportă.
type Ctx = { params: Promise<{ orgSlug: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dataRo = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

const exporta = withOrgSession(async (ctx, url: string) => {
  const u = new URL(url);
  const tip = u.searchParams.get("tip") === "munca" ? "munca" : "obiective";
  const dep = u.searchParams.get("dep") ?? "";
  const d = await incarcaRapoarte(ctx, u.searchParams.get("perioada"), UUID.test(dep) ? dep : null);
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const adauga = (nume: string, antet: string[], randuri: (string | number)[][], latimi: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet([antet, ...randuri]);
    ws["!cols"] = latimi.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, nume);
  };
  if (tip === "obiective") {
    adauga(
      "Rezultate-cheie",
      ["Obiectiv", "Nivel", "Responsabil", "Departament", "Progres obiectiv", "Stare obiectiv", "Rezultat-cheie", "Metodă", "Țintă", "Valoare", "Progres rezultat", "Stare rezultat", "Sursă", "Ultima actualizare", "Încredere", "Formula", "Atribuire"],
      d.randuri.map((r) => [r.obiectiv, r.nivel, r.responsabil, r.departament, r.progresObiectiv === null ? "fără date" : Math.round(r.progresObiectiv * 100) / 100, r.stareObiectiv, r.rezultat, r.metoda, r.tinta, r.valoare, r.progres === null ? "fără date" : Math.round(r.progres * 100) / 100, r.stare, r.sursa, dataRo(r.ultimaActualizare), r.incredere, r.formula, r.atribuire]),
      [34, 12, 20, 20, 12, 14, 32, 12, 18, 16, 12, 14, 34, 14, 12, 50, 50],
    );
  } else {
    adauga("Pe săptămâni", ["Săptămâna de la", "Activități planificate", "Finalizate", "Finalizate la termen"], d.saptamani.map((s) => [dataRo(s.luni), s.planificate, s.finalizate, s.laTermen]), [18, 22, 12, 20]);
    adauga("Pe persoană", ["Persoană", "Planificate", "Finalizate", "La termen", "Restante", "Cu blocaj deschis"], d.persoane.map((p) => [p.nume, p.planificate, p.finalizate, p.laTermen, p.restante, p.blocajeDeschise]), [26, 12, 12, 12, 12, 18]);
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="performanta-${tip}-${d.perioada.cod}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return exporta(orgSlug, req.url);
}
