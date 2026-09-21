// Adrese lizibile și scurte pentru firme: denumirea + primele 8 caractere din UUID.
// Ex.: /crm/companii/agro-development-sa-c2607e5a în loc de
//      /crm/companii/c2607e5a-3c67-4640-85d5-95edf713f6de.
// Adresele vechi (UUID complet sau cele de 12 caractere) rămân valabile și sunt redirecționate.
export const LUNGIME_SUFIX = 8;
const UUID_COMPLET = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// „Agro Development SA” → „agro-development-sa”
export function slugFirma(nume: string): string {
  const s = nume
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "firma";
}

export function hexFaraCratime(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

// Segmentul de adresă pentru o firmă cunoscută: „agro-development-sa-c2607e5a”.
export function segmentFirma(nume: string, id: string): string {
  return `${slugFirma(nume)}-${hexFaraCratime(id).slice(0, LUNGIME_SUFIX)}`;
}

// Când doar ID-ul e cunoscut (ex. imediat după adăugarea unei firme): doar sufixul; pagina redirecționează la adresa cu nume.
export function idScurt(id: string): string {
  return hexFaraCratime(id).slice(0, LUNGIME_SUFIX);
}

export type SegmentAdresa = { tip: "uuid"; id: string } | { tip: "prefix"; prefix: string; slug: string | null };

// Interpretează segmentul din adresă: UUID complet, „slug-hex” sau doar hex (8–12 caractere).
export function citesteSegment(segment: string): SegmentAdresa | null {
  if (UUID_COMPLET.test(segment)) return { tip: "uuid", id: segment.toLowerCase() };
  const m = segment.match(/^(?:(.*)-)?([0-9a-f]{8,12})$/i);
  if (!m) return null;
  return { tip: "prefix", prefix: m[2].toLowerCase(), slug: m[1] ?? null };
}
