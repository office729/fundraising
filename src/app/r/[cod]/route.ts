import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { esteCanal, esteSlugLink, parametriUtm } from "@/lib/influenceri/reguli";
import { caleCampanie } from "@/lib/link-campanie";
import { raporteazaEroare } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

// Linkul unic al unui influencer: /r/<campanie>-i<cod aleator>. Nu conține numele persoanei. Ruta numără clicul (doar numărul, pe zi, fără IP sau alt identificator)
// și duce la pagina campaniei, cu parametrii care fac ca o donație să poarte exact slugul linkului în utm_campaign (vezi lib/reclame/atribuire.ts).
// Previzualizările făcute de rețele sociale și roboții nu se numără.

type Tinta = { id: string; platforma: string; orgSlug: string; pageSlug: string };

// Parametrii de provenință pe care îi pun singure rețelele; trec mai departe ca să nu se piardă. utm_* sunt ale noastre și nu se iau din cerere.
const PARAMETRI_PASTRATI = ["fbclid", "ttclid", "gclid", "gbraid", "wbraid", "msclkid", "li_fat_id"];

const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|facebot|meta-external|whatsapp|telegram|skype|slack|discord|embedly|curl|wget|python-requests|headless|lighthouse|pingdom|uptime/i;

async function gasesteTinta(cod: string): Promise<Tinta | null> {
  return db.transaction(async (tx) => {
    // Contextul de încredere al rutelor publice (fără sesiune); interogarea are predicat explicit pe cod.
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const r = (await tx.execute(sql`
      select l.id::text as id, l.platforma, o.slug as "orgSlug", p.slug as "pageSlug"
      from influenceri_linkuri l
      join organizations o on o.id = l.org_id
      join fundraising_pages p on p.id = l.caz_id and p.org_id = l.org_id
      where l.slug = ${cod}
      limit 1`)) as unknown as Tinta[];
    return r[0] ?? null;
  });
}

async function numaraClic(tinta: Tinta): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx.execute(sql`
      insert into influenceri_clicuri (link_id, org_id, ziua, nr)
      select l.id, l.org_id, (now() at time zone 'Europe/Bucharest')::date, 1 from influenceri_linkuri l where l.id = ${tinta.id}::uuid
      on conflict (link_id, ziua) do update set nr = influenceri_clicuri.nr + 1`);
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ cod: string }> }) {
  const { cod: brut } = await params;
  const cod = brut.toLowerCase();
  const antete = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
  if (!esteSlugLink(cod)) return new NextResponse("Not found", { status: 404, headers: antete });

  let tinta: Tinta | null = null;
  try {
    tinta = await gasesteTinta(cod);
  } catch (e) {
    raporteazaEroare("influenceri-link", e);
    return new NextResponse("Service unavailable", { status: 503, headers: antete });
  }
  if (!tinta) return new NextResponse("Not found", { status: 404, headers: antete });

  // Numărăm doar o deschidere reală: cerere GET (nu HEAD sau prefetch), fără roboți și previzualizări; cel mult 120 de clicuri / 10 minute pe adresă.
  const ua = request.headers.get("user-agent") ?? "";
  const prefetch = request.headers.get("purpose") === "prefetch" || request.headers.get("sec-purpose")?.includes("prefetch");
  if (request.method === "GET" && !prefetch && ua && !ROBOT.test(ua)) {
    try {
      if (await verificaLimitaRata("influenceri-click", await obtineIpClient(), 120, 10)) await numaraClic(tinta);
    } catch (e) {
      // Numărătoarea nu are voie să strice redirecționarea.
      raporteazaEroare("influenceri-click", e);
    }
  }

  const canal = esteCanal(tinta.platforma) ? tinta.platforma : "instagram";
  const url = new URL(caleCampanie(tinta.orgSlug, tinta.pageSlug), request.url);
  for (const [k, v] of Object.entries(parametriUtm(canal, cod))) url.searchParams.set(k, v);
  for (const k of PARAMETRI_PASTRATI) {
    const v = request.nextUrl.searchParams.get(k);
    if (v && v.length <= 200) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url, { status: 307, headers: antete });
}
