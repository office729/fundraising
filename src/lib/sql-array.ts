import { sql, type SQL } from "drizzle-orm";

// Drizzle desface un array JS din `sql\`...\`` într-o listă de parametri „($1, $2)”, ceea ce NU e un array Postgres
// (`= any(($1, $2))` dă eroare). Aici construim explicit `array[$1, $2]::tip[]`; pentru listă goală, `'{}'::tip[]`.
export function sqlArray(valori: readonly string[], tip: "text" | "uuid" = "text"): SQL {
  const t = sql.raw(tip);
  if (valori.length === 0) return sql`'{}'::${t}[]`;
  return sql`array[${sql.join(
    valori.map((v) => sql`${v}`),
    sql`, `,
  )}]::${t}[]`;
}
