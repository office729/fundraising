import { genereazaIcs } from "@/lib/programari/sloturi";
import { programareDupaToken } from "@/lib/programari/server";

// „Adaugă în calendar”: fișier .ics pentru o programare confirmată. Accesul îl dă tokenul secret.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await programareDupaToken(token);
  if (!p || p.stare !== "confirmata") return new Response("Programare negăsită.", { status: 404 });
  const ics = genereazaIcs({
    uid: p.id,
    start: new Date(p.startLa),
    sfarsit: new Date(p.sfarsitLa),
    titlu: `${p.tipTitlu} — Alexandrit`,
    descriere: `Programare: ${p.tipTitlu}.\nPoți anula sau vedea detaliile la ${(process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "")}/programare/${p.token}`,
    locatie: p.locatie,
  });
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="programare-alexandrit.ics"', "Cache-Control": "no-store" },
  });
}
