import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { CAMPURI_IMPORT, type CampImport, type Mapare } from "@/lib/donatori-import";
import { citesteFisier, executaImport, MAX_BYTES_IMPORT, planifica } from "@/lib/donatori-import-server";
import { origineValida } from "@/lib/verifica-origine";

// Importul de donații în CRM Persoane fizice. Două pași cu aceeași cerere (multipart): „previzualizare” întoarce planul fără să scrie nimic,
// „importa” îl execută într-o singură tranzacție. Doar admin/owner: sunt date personale ale donatorilor.
type Ctx = { params: Promise<{ orgSlug: string }> };

function curataMapare(brut: unknown): Mapare | undefined {
  if (!brut || typeof brut !== "object") return undefined;
  const m: Mapare = {};
  for (const c of CAMPURI_IMPORT) {
    const v = (brut as Record<string, unknown>)[c];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 500) m[c as CampImport] = v;
  }
  return m;
}

const proceseaza = withOrgSession(async (ctx, date: { buf: Buffer; fisier: string; mod: string; mapare?: Mapare; nume: string }) => {
  if (ctx.role !== "owner" && ctx.role !== "admin") return NextResponse.json({ error: "Doar un administrator poate importa donații." }, { status: 403 });
  let fisier;
  try {
    fisier = await citesteFisier(date.buf, date.fisier);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Nu am putut citi fișierul." }, { status: 400 });
  }
  const plan = await planifica(ctx, fisier, date.mapare);
  if (date.mod !== "importa") return NextResponse.json({ ok: true, previzualizare: plan.previzualizare });
  if (plan.previzualizare.lipsa.length > 0) return NextResponse.json({ error: "Alege coloanele obligatorii (email, sumă, dată)." }, { status: 400 });
  try {
    const r = await executaImport(ctx, plan, date.nume || date.fisier.replace(/\.[^.]+$/, ""));
    return NextResponse.json({ ok: true, rezultat: r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Importul a eșuat." }, { status: 400 });
  }
});

export async function POST(req: Request, { params }: Ctx) {
  if (!origineValida(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES_IMPORT + 50_000) return NextResponse.json({ error: "Fișierul e prea mare (maxim 4 MB)." }, { status: 413 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const f = form.get("fisier");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ error: "Alege un fișier CSV sau XLSX." }, { status: 400 });
  if (f.size > MAX_BYTES_IMPORT) return NextResponse.json({ error: "Fișierul e prea mare (maxim 4 MB)." }, { status: 413 });
  if (!/\.(csv|txt|xlsx|xls|xlsm)$/i.test(f.name)) return NextResponse.json({ error: "Format neacceptat. Folosește CSV sau XLSX." }, { status: 400 });
  let mapare: Mapare | undefined;
  try {
    const brut = form.get("mapare");
    mapare = typeof brut === "string" && brut ? curataMapare(JSON.parse(brut)) : undefined;
  } catch {
    mapare = undefined;
  }
  const { orgSlug } = await params;
  return proceseaza(orgSlug, {
    buf: Buffer.from(await f.arrayBuffer()),
    fisier: f.name.slice(0, 200),
    mod: form.get("mod") === "importa" ? "importa" : "previzualizare",
    mapare,
    nume: String(form.get("nume") ?? "").trim().slice(0, 200),
  });
}
