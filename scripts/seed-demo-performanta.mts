/* Încarcă (sau șterge) date FICTIVE pentru Echipă & Performanță într-o organizație DEMONSTRATIVĂ.
 *
 *   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/seed-demo-performanta.mts --org calm-impact-demo
 *   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/seed-demo-performanta.mts --org calm-impact-demo --fara-donatori
 *   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/seed-demo-performanta.mts --org calm-impact-demo --nume "Numele tău"   (numele profilului creat pentru contul tău)
 *   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/seed-demo-performanta.mts --org calm-impact-demo --sterge
 *
 * Siguranță: refuză organizațiile al căror slug nu conține „demo”, dacă nu adaugi explicit --forteaza. Nu atinge alte organizații și nu modifică ce
 * există deja în cea aleasă: tot ce se creează e urmărit într-un marcaj și se șterge integral cu --sterge. Donatorii fictivi se adaugă doar dacă
 * organizația nu are deja donatori sau donații. Folosește MIGRATOR_DATABASE_URL din .env.local. */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { incarcaDemo, stareDemo, stergeDemo } from "../src/lib/performanta-demo";

process.loadEnvFile(".env.local");
const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? (process.argv[i + 1] ?? "") : null;
};
const slug = arg("--org");
if (!slug) {
  console.error("Lipsește --org <slug>.");
  process.exit(2);
}
if (!slug.includes("demo") && !process.argv.includes("--forteaza")) {
  console.error(`Organizația „${slug}” nu pare demonstrativă (slug-ul nu conține „demo”). Refuz. Adaugă --forteaza doar dacă ești sigur.`);
  process.exit(2);
}

const client = postgres(process.env.MIGRATOR_DATABASE_URL!, { max: 1 });
let cod = 0;
try {
  await client`begin`;
  await client`select set_config('app.public_lookup', 'true', true)`;
  const [org] = await client`select * from organizations where slug = ${slug}`;
  if (!org) throw new Error(`Organizația „${slug}” nu există.`);
  await client`select set_config('app.current_org_id', ${org.id}, true)`;
  const [m] = await client`select user_id, role from memberships where org_id = ${org.id} and role in ('owner', 'admin') order by role limit 1`;
  if (!m) throw new Error("Organizația nu are un administrator.");
  await client`select set_config('app.current_user_id', ${m.user_id}, true)`;
  const db = drizzle(client);
  const ctx = { db, orgId: org.id, orgSlug: org.slug, orgName: org.name, orgPackage: org.package, orgCustomPlanConfig: org.custom_plan_config, userId: m.user_id, role: m.role } as never;
  console.log(`Organizație: ${org.name} (${org.slug})`);
  if (process.argv.includes("--sterge")) {
    const r = await stergeDemo(ctx);
    console.log(r.ok ? r.rezumat : r.eroare);
    if (!r.ok) cod = 1;
  } else {
    const r = await incarcaDemo(ctx, { donatori: !process.argv.includes("--fara-donatori"), numeAdmin: arg("--nume") ?? undefined });
    console.log(r.ok ? `Încărcat: ${r.rezumat}` : `Nu s-a încărcat: ${r.eroare}`);
    if (!r.ok) cod = 1;
  }
  console.log("Stare:", JSON.stringify(await stareDemo(ctx)));
  if (cod === 0) await client`commit`;
  else await client`rollback`;
} catch (e) {
  console.error("EROARE:", e instanceof Error ? e.message : e);
  await client`rollback`.catch(() => {});
  cod = 1;
} finally {
  await client.end();
}
process.exit(cod);
