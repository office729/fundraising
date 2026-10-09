import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { interogareLista, parseFiltruPf } from "@/lib/donatori-pf";

import { contextPf, serializeazaRand } from "../../../(app)/[orgSlug]/crm/donatori/queries-pf";

// Export Excel al listei de donatori persoane fizice, pe vederea curentă (segmente + filtre), fără paginare.
// Canale: „email” păstrează doar donatorii care pot primi emailuri de campanie; „telefon” doar pe cei care au telefon și pot fi sunați.
// Respectă consimțământul și dezabonările chiar și când exportul e cerut manual (suppression pe server).
const MAX_RANDURI = 50_000;
type Ctx = { params: Promise<{ orgSlug: string }> };

const dataRo = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

const exporta = withOrgSession(async (ctx, url: string) => {
  const u = new URL(url);
  const f = parseFiltruPf(u.searchParams);
  const canal = u.searchParams.get("canal") === "email" ? "email" : u.searchParams.get("canal") === "telefon" ? "telefon" : "toate";
  const c = await contextPf(ctx);
  const brut = (await ctx.db.execute(interogareLista(ctx.orgId, { ...f, pagina: 1 }, c, { paginat: false }))) as unknown as Record<string, unknown>[];
  let randuri = brut.slice(0, MAX_RANDURI).map(serializeazaRand);
  if (canal === "email") randuri = randuri.filter((r) => r.email && r.consimtamant_email !== false && !r.dezabonat_email_la && !r.nu_contactat);
  if (canal === "telefon") randuri = randuri.filter((r) => (r.telefon ?? "").trim() !== "" && !r.nu_contactat);

  const XLSX = await import("xlsx");
  const antet = ["Email", "Nume", "Telefon", "Localitate", "Județ", "Total (lei)", "Nr. donații", "Ultima donație (lei)", "Data ultimei donații", "Prima donație", "Primul proiect", "Ultimul proiect", "An cohortă", "Lunar", "Sunat", "Mulțumit", "A răspuns", "Reapel până la", "Win-back", "Responsabil"];
  const date: (string | number)[][] = [
    antet,
    ...randuri.map((r) => [r.email, r.nume, r.telefon ?? "", r.localitate ?? "", r.judet ?? "", r.total, r.nr, r.ultima_suma ?? "", dataRo(r.ultima), dataRo(r.prima), r.primul_proiect ?? "", r.ultimul_proiect ?? "", r.an ?? "", r.lunar ? "Da" : "Nu", dataRo(r.sunat_la), dataRo(r.multumit_la), r.a_raspuns ? "Da" : "Nu", r.reapel_la ?? "", r.wb_stage ?? "", r.responsabil ?? ""]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(date);
  ws["!cols"] = antet.map((h, i) => ({ wch: i === 0 ? 32 : i === 1 ? 26 : Math.max(12, Math.min(28, h.length + 2)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Donatori");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const azi = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="donatori-${canal}-${azi}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return exporta(orgSlug, req.url);
}
