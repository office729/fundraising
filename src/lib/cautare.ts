import { sql, type SQL } from "drizzle-orm";

// Căutare insensibilă la diacritice și majuscule, inclusiv ș/ş și ț/ţ (virgulă și sedilă).
// Partea din JS aduce textul căutat la forma „fără diacritice, minuscule”; partea din SQL face
// același lucru pe coloană (translate acoperă și majusculele, ca să nu depindă de locale-ul bazei).

export function faraDiacritice(s: string): string {
  return s
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function sqlFaraDiacritice(coloana: SQL | { getSQL(): SQL }): SQL {
  return sql`lower(translate(${coloana}, 'ăâîșțşţĂÂÎȘȚŞŢ', 'aaiststAAISTST'))`;
}

export function patternLike(q: string): string {
  return "%" + faraDiacritice(q.trim()).replace(/[\\%_]/g, (c) => "\\" + c) + "%";
}

// „RO 12.345.678”, „12345678”, „ro12345678” → "12345678". Orice alt text → null.
export function cifreCui(q: string): string | null {
  if (!/^\s*(?:ro)?[\s.\-\d]*$/i.test(q)) return null;
  const cifre = q.replace(/\D/g, "");
  return cifre.length > 0 ? cifre : null;
}
