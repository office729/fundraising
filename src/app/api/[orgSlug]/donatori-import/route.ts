import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { CAMPURI_IMPORT, type CampImport, type Mapare } from "@/lib/donatori-import";
import { citesteFisier, executaImport, MAX_BYTES_IMPORT, planifica } from "@/lib/donatori-import-server";
import { getTr } from "@/lib/i18n/tr-server";
import { getLocale } from "@/lib/i18n/get-locale";
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

const proceseaza = withOrgSession(async (ctx, date: { buf: Buffer; fisier: string; mod: string; mapare?: Mapare; nume: string; corecteaza: boolean }) => {
  const locale = await getLocale();
  const t = await getTr();
  if (ctx.role !== "owner" && ctx.role !== "admin") return NextResponse.json({ error: t("Doar un administrator poate importa donații.", "Only an administrator can import donations.") }, { status: 403 });
  // Citirea unui fișier mare costă; o organizație nu are nevoie de mai mult de câteva zeci de analize pe oră.
  if (!(await verificaLimitaRata("donatori-import", ctx.orgId, 40, 60))) return NextResponse.json({ error: t("Prea multe încercări de import într-o oră. Revino mai târziu.", "Too many import attempts in one hour. Come back later.") }, { status: 429 });
  let fisier;
  try {
    fisier = await citesteFisier(date.buf, date.fisier, locale);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : t("Nu am putut citi fișierul.", "We could not read the file.") }, { status: 400 });
  }
  const plan = await planifica(ctx, fisier, date.mapare, { corecteaza: date.corecteaza, locale });
  if (date.mod !== "importa") return NextResponse.json({ ok: true, previzualizare: plan.previzualizare });
  if (plan.previzualizare.lipsa.length > 0) return NextResponse.json({ error: t("Alege coloanele obligatorii (email, sumă, dată).", "Choose the required columns (email, amount, date).") }, { status: 400 });
  try {
    const r = await executaImport(ctx, plan, date.nume || date.fisier.replace(/\.[^.]+$/, ""), locale);
    return NextResponse.json({ ok: true, rezultat: r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : t("Importul a eșuat.", "The import failed.") }, { status: 400 });
  }
});

export async function POST(req: Request, { params }: Ctx) {
  const t = await getTr();
  if (!origineValida(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // Fără Content-Length (transfer în bucăți) nu putem ști cât citim: refuzăm, ca un corp uriaș să nu fie parsat înainte de autentificare.
  const lungime = req.headers.get("content-length");
  if (!lungime) return NextResponse.json({ error: t("Cerere invalidă.", "Invalid request.") }, { status: 411 });
  if (Number(lungime) > MAX_BYTES_IMPORT + 50_000) return NextResponse.json({ error: t("Fișierul e prea mare (maxim 4 MB).", "The file is too large (4 MB maximum).") }, { status: 413 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: t("Cerere invalidă.", "Invalid request.") }, { status: 400 });
  }
  const f = form.get("fisier");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ error: t("Alege un fișier CSV sau XLSX.", "Choose a CSV or XLSX file.") }, { status: 400 });
  if (f.size > MAX_BYTES_IMPORT) return NextResponse.json({ error: t("Fișierul e prea mare (maxim 4 MB).", "The file is too large (4 MB maximum).") }, { status: 413 });
  if (!/\.(csv|txt|xlsx|xls|xlsm)$/i.test(f.name)) return NextResponse.json({ error: t("Format neacceptat. Folosește CSV sau XLSX.", "Unsupported format. Use CSV or XLSX.") }, { status: 400 });
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
    // Corectarea adreselor de e-mail e activă implicit; se oprește doar cu „corecteaza=0”.
    corecteaza: form.get("corecteaza") !== "0",
  });
}
