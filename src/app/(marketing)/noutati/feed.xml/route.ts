import { INOVATII } from "@/content/inovatii";
import { NOUTATI_DICT } from "@/lib/i18n/dictionaries/noutati";

export const dynamic = "force-static";

const BAZA = "https://alexandrit.ro";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Feed RSS 2.0 cu „Noutăți”: aceeași listă ca în pagina /noutati și în platformă (src/content/inovatii.ts), în română.
export function GET(): Response {
  const dict = NOUTATI_DICT.ro;
  const elemente = INOVATII.slice(0, 30)
    .map((n) => {
      const link = `${BAZA}/noutati#${n.id}`;
      const text = n.cumFolosesti ? `${n.descriere} ${dict.cumFolosesti}: ${n.cumFolosesti}` : n.descriere;
      return `    <item>
      <title>${esc(n.titlu)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(`${n.data}T09:00:00Z`).toUTCString()}</pubDate>
      <category>${esc(n.categorie)}</category>
      <description>${esc(text)}</description>
    </item>`;
    })
    .join("\n");
  const ultima = INOVATII[0] ? new Date(`${INOVATII[0].data}T09:00:00Z`).toUTCString() : new Date(0).toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(dict.feedTitlu)}</title>
    <link>${BAZA}/noutati</link>
    <description>${esc(dict.feedDesc)}</description>
    <language>ro</language>
    <lastBuildDate>${ultima}</lastBuildDate>
${elemente}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
