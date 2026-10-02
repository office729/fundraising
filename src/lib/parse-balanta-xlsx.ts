import "server-only";

// Parsare determinist a unui XLSX de Balanță — NU citește cifrele direct
// (formatul variază mult între softuri contabile), doar transformă foaia în
// text tabelar compact, trimis apoi lui extrageDateFinanciareAI (vezi ai.ts)
// pentru citire — mai fiabil decât un mapping fix de coloane/rânduri.
// Reutilizează pattern-ul din src/app/(app)/[orgSlug]/crm/lib/import-parse.ts
// (dynamic import("xlsx"), XLSX.read pe arrayBuffer).
export async function parseazaXlsxCaTextTabelar(buf: ArrayBuffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const linii: string[] = [];
  for (const numeFoaie of wb.SheetNames) {
    const sheet = wb.Sheets[numeFoaie];
    const randuri = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (!randuri.length) continue;
    linii.push(`--- Foaie: ${numeFoaie} ---`);
    for (const rand of randuri) {
      const celule = (rand as unknown[]).map((c) => String(c ?? "").trim()).filter(Boolean);
      if (celule.length) linii.push(celule.join(" | "));
    }
  }
  return linii.join("\n");
}
