import { serializeazaJsonLd } from "@/lib/seo-schema";

// Date structurate pentru motoarele de căutare. Conținutul vine din cod propriu (lib/seo-schema.ts), nu din input extern.
export function JsonLd({ date }: { date: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeazaJsonLd(date) }} />;
}
