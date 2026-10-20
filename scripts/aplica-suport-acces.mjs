/* Aplică documentation/suport-acces.sql (rol migrator) + RLS-ul tabelelor noi (aceleași politici ca în restore-rls.mjs). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
const ORG = `org_id = nullif(current_setting('app.current_org_id', true), '')::uuid`;
const ADMIN_ORG = `org_id in (select org_id from memberships where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and role in ('owner', 'admin'))`;
const PLATFORMA = `nullif(current_setting('app.platform_admin', true), '') = 'true'`;
const POLITICI = [
  // Acordarea și retragerea accesului: doar owner/admin ai organizației; toți membrii pot vedea dacă există un acces activ.
  `create policy suport_acces_org_citire on suport_acces for select using (${ORG})`,
  `create policy suport_acces_org_acordare on suport_acces for insert with check (${ORG} and ${ADMIN_ORG})`,
  `create policy suport_acces_org_retragere on suport_acces for update using (${ORG} and ${ADMIN_ORG}) with check (${ORG} and ${ADMIN_ORG})`,
  // Echipa platformei verifică dacă există un acces activ (rutele care setează GUC-ul sunt gardate cu isPlatformAdmin).
  `create policy suport_acces_platforma_citire on suport_acces for select using (${PLATFORMA})`,
  // Erorile: orice membru poate genera o eroare (se scrie în contextul organizației); le citesc owner/admin ai organizației.
  `create policy erori_aplicatie_org_scriere on erori_aplicatie for insert with check (${ORG})`,
  `create policy erori_aplicatie_org_citire on erori_aplicatie for select using (${ORG} and ${ADMIN_ORG})`,
  `create policy erori_aplicatie_org_curatare on erori_aplicatie for delete using (${ORG})`,
  // Echipa platformei citește erorile DOAR cât timp organizația are un acces de suport activ (apărare în adâncime, pe lângă verificarea din aplicație).
  `create policy erori_aplicatie_platforma_citire on erori_aplicatie for select using (
     ${PLATFORMA} and exists (
       select 1 from suport_acces s where s.org_id = erori_aplicatie.org_id and s.retras_la is null and s.expira_la > now()
     )
   )`,
];
try {
  await sql.unsafe(readFileSync(new URL("../documentation/suport-acces.sql", import.meta.url), "utf8"));
  for (const t of ["suport_acces", "erori_aplicatie"]) {
    await sql.unsafe(`alter table ${t} enable row level security`);
    await sql.unsafe(`alter table ${t} force row level security`);
  }
  for (const p of POLITICI) {
    try {
      await sql.unsafe(p);
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname in ('suport_acces', 'erori_aplicatie') order by 1`;
  const pol = await sql`select tablename, policyname, cmd from pg_policies where tablename in ('suport_acces', 'erori_aplicatie') order by 1, 2`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:\n" + pol.map((p) => `  ${p.tablename}.${p.policyname} (${p.cmd})`).join("\n"));
} finally {
  await sql.end();
}
