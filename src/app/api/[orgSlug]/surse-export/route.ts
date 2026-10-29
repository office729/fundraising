import { NextResponse } from "next/server";

import { withOrgAdmin } from "@/lib/auth/guard";
import { construiesteCsvRaport, filtreDinParametri, incarcaRaport } from "@/lib/atribuire/rapoarte";

// Export CSV al raportului „Statistici și surse”, pe filtrele din pagină. Doar proprietar/administrator (aceleași permisiuni ca în interfață);
// datele sunt ale organizației din sesiune (izolare RLS), indiferent de ce scrie în adresă.
type Ctx = { params: Promise<{ orgSlug: string }> };

const exporta = withOrgAdmin(async (ctx, url: string) => {
  const sp = Object.fromEntries(new URL(url).searchParams.entries());
  const f = filtreDinParametri(sp);
  const raport = await incarcaRaport(ctx.db, ctx.orgId, f, false);
  const csv = construiesteCsvRaport(raport, ctx.orgName);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statistici-surse-${f.de}-${f.pana}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return exporta(orgSlug, req.url);
}
