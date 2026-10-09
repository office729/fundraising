import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { citesteDatePanou } from "@/lib/voluntari-panou-echipa";
import { origineValida } from "@/lib/verifica-origine";

import { scoateCampaniaSaptamaniiAction, seteazaCampaniaSaptamaniiAction } from "../../../(app)/[orgSlug]/crm/voluntari-panou/actions";

// Datele panoului voluntarilor pentru unealta CRM Voluntari (rulează într-un iframe și vorbește cu platforma prin API):
//  - ?ce=activitate: pe fiecare fișă legată (distribuiri, ultima activitate) + cifrele pentru raportul săptămânal;
//  - ?ce=campanii: campaniile active, linkul panoului și programul „campania săptămânii”.
// POST: setează sau scoate campania săptămânii.
type Ctx = { params: Promise<{ orgSlug: string }> };

const citeste = withOrgSession(async (ctx, ce: string) => {
  const d = await citesteDatePanou(ctx);
  if (ce === "campanii") {
    return NextResponse.json({
      link: d.link ? { url: d.link.url, activ: d.link.activ } : null,
      saptamani: d.saptamani,
      campanii: d.campanii
        .filter((c) => c.status === "activa")
        .map((c) => ({ id: c.id, slug: c.slug, titlu: c.titlu, ascunsa: c.ascunsa, distribuiri: c.distribuiri, distribuiri7: c.distribuiri7 })),
    });
  }
  const fise: Record<string, { distribuiri: number; ultimaActivitateLa: string }> = {};
  for (const v of d.voluntari) {
    if (!v.voluntarId) continue;
    const cur = fise[v.voluntarId];
    fise[v.voluntarId] = { distribuiri: (cur?.distribuiri ?? 0) + v.distribuiri, ultimaActivitateLa: cur && cur.ultimaActivitateLa > v.ultimaActivitateLa ? cur.ultimaActivitateLa : v.ultimaActivitateLa };
  }
  const celeMaiActive = [...d.voluntari].filter((v) => v.distribuiri7 > 0).sort((a, b) => b.distribuiri7 - a.distribuiri7 || a.prenume.localeCompare(b.prenume, "ro")).slice(0, 5);
  return NextResponse.json({
    link: d.link ? { url: d.link.url, activ: d.link.activ } : null,
    fise,
    raport: {
      voluntari: d.cifre.voluntari,
      activi7: d.cifre.activi7,
      distribuiri: d.cifre.distribuiri,
      distribuiri7: d.cifre.distribuiri7,
      celeMaiActive: celeMaiActive.map((v) => ({ prenume: v.prenume, nr: v.distribuiri7 })),
      pecampanii: d.campanii.filter((c) => c.distribuiri > 0).sort((a, b) => b.distribuiri7 - a.distribuiri7 || b.distribuiri - a.distribuiri).slice(0, 10).map((c) => ({ titlu: c.titlu, distribuiri: c.distribuiri, distribuiri7: c.distribuiri7 })),
    },
  });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  const ce = new URL(req.url).searchParams.get("ce") === "campanii" ? "campanii" : "activitate";
  return citeste(orgSlug, ce);
}

export async function POST(req: Request, { params }: Ctx) {
  if (!origineValida(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { actiune?: unknown; luni?: unknown; campaignId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { orgSlug } = await params;
  const luni = String(body.luni ?? "");
  const r = body.actiune === "scoate" ? await scoateCampaniaSaptamaniiAction(orgSlug, luni) : body.actiune === "seteaza" ? await seteazaCampaniaSaptamaniiAction(orgSlug, luni, String(body.campaignId ?? "")) : ({ ok: false, eroare: "Acțiune necunoscută." } as const);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
