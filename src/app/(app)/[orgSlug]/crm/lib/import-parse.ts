// Parsare fișier → listă de rânduri plate (obiecte cheie/valoare, din antet).
// Suportă CSV/TSV, JSON (array de obiecte), Excel (.xlsx/.xls) și OpenDocument
// (.ods) — prima foaie — plus contacte de telefon (.vcf/vCard), convertite
// automat în rânduri Nume/Telefon/Email/Companie, ca la un export tabelar.

function parseVcf(text: string): Record<string, string>[] {
  const carduri = text.split(/BEGIN:VCARD/i).slice(1);
  return carduri
    .map((bloc) => {
      const linie = (regex: RegExp) => bloc.match(regex)?.[1]?.trim() ?? "";
      const fn = linie(/^FN:(.*)$/im);
      const n = linie(/^N:(.*)$/im);
      const nume =
        fn ||
        (n
          ? n
              .split(";")
              .slice(0, 2)
              .reverse()
              .filter(Boolean)
              .join(" ")
          : "");
      const row: Record<string, string> = {};
      if (nume) row["Nume"] = nume;
      const telefon = linie(/^TEL[^:]*:(.*)$/im);
      if (telefon) row["Telefon"] = telefon;
      const email = linie(/^EMAIL[^:]*:(.*)$/im);
      if (email) row["Email"] = email;
      return row;
    })
    .filter((r) => Object.keys(r).length > 0);
}

function parseCsv(text: string): Record<string, string>[] {
  // Parser minimal, suficient pentru export-uri obișnuite: virgulă sau
  // punct-virgulă ca separator (auto-detectat), câmpuri între ghilimele cu
  // virgule/ghilimele escapate ("").
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const candidati: [string, number][] = [
    ["\t", firstLine.match(/\t/g)?.length ?? 0],
    [";", firstLine.match(/;/g)?.length ?? 0],
    [",", firstLine.match(/,/g)?.length ?? 0],
  ];
  const sep = candidati.reduce((best, cand) => (cand[1] > best[1] ? cand : best))[0] || ",";

  function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

// `permiteVcf` e fals la importul de companii — o agendă de contacte
// (persoane) nu are sens convertită într-o listă de firme, deci acolo
// tratăm un .vcf ca format nesuportat (nu ghicim date greșite din el).
export async function parseImportFile(file: File, permiteVcf = true): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
    return rows.map((r: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)])),
    );
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)])));
  }

  if (permiteVcf && (name.endsWith(".vcf") || name.endsWith(".vcard"))) {
    const text = await file.text();
    return parseVcf(text);
  }

  // implicit: CSV (și .txt/.tsv tratate la fel — separatorul e auto-detectat)
  const text = await file.text();
  if (permiteVcf && /^\s*BEGIN:VCARD/i.test(text)) return parseVcf(text);
  return parseCsv(text);
}
