import "server-only";

import dns from "node:dns";
import https from "node:https";

import { sql } from "drizzle-orm";

import { esteIpPublic, extrageBearer, MAX_INCERCARI, PRAG_DEZACTIVARE, rezultatLivrare, tipIp, urmatoareaIncercare, type Eveniment, type Scop } from "@/lib/api-publica";
import { hashCheieApi, semneazaWebhook } from "@/lib/api-publica-cripto";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { areModul } from "@/lib/billing/packages";
import { isAccessBlocked, pachetEfectiv } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { raporteazaAvertisment } from "@/lib/monitoring";
import { decripteaza } from "@/lib/secret-box";

// ===== Autentificarea cererilor API =====
// Cheia vine în „Authorization: Bearer alx_live_…”. Căutarea după hash trece prin GUC-ul app.api_cheie_hash (politica api_chei_cautare lasă să se vadă doar acel rând);
// de acolo știm organizația și lucrăm în contextul ei (app.current_org_id), ca la orice altă cerere.
export type CheieAutentificata = { id: string; orgId: string; scopuri: string[] };
export type EsecApi = { ok: false; status: number; cod: string; mesaj: string };

const RASPUNSURI: Record<string, { status: number; mesaj: string }> = {
  cheie_lipsa: { status: 401, mesaj: "Lipsește cheia API. Trimite antetul „Authorization: Bearer <cheia>”." },
  cheie_invalida: { status: 401, mesaj: "Cheia API e invalidă sau a fost revocată." },
  fara_permisiune: { status: 403, mesaj: "Cheia nu are permisiunea necesară pentru această cerere." },
  fara_acces: { status: 403, mesaj: "Organizația nu are acces la API (pachet sau abonament)." },
  prea_multe_cereri: { status: 429, mesaj: "Prea multe cereri. Încearcă din nou peste câteva minute." },
};
const esec = (cod: keyof typeof RASPUNSURI): EsecApi => ({ ok: false, ...RASPUNSURI[cod], cod });

export const LIMITA_CERERI_PE_ORA = 1000;

export async function autentificaApi(req: Request, scop: Scop): Promise<{ ok: true; cheie: CheieAutentificata } | EsecApi> {
  const bearer = extrageBearer(req.headers.get("authorization"));
  if (!bearer) return esec(req.headers.get("authorization") ? "cheie_invalida" : "cheie_lipsa");
  const hash = hashCheieApi(bearer);
  const gasit = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.api_cheie_hash', ${hash}, true)`);
    const [r] = (await tx.execute(sql`select id, org_id, scopuri, revocata_la, ultima_folosire_la from api_chei where hash = ${hash} limit 1`)) as unknown as { id: string; org_id: string; scopuri: string[]; revocata_la: Date | null; ultima_folosire_la: Date | null }[];
    if (!r || r.revocata_la) return null;
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [o] = (await tx.execute(sql`select package, created_at, subscription_status, current_period_end from organizations where id = ${r.org_id}`)) as unknown as { package: "trial" | "start" | "crestere" | "impact" | "custom"; created_at: Date; subscription_status: string; current_period_end: Date | null }[];
    return { r, o };
  });
  if (!gasit || !gasit.o) return esec("cheie_invalida");
  const { r, o } = gasit;
  const org = { package: o.package, createdAt: new Date(o.created_at), subscriptionStatus: o.subscription_status, currentPeriodEnd: o.current_period_end ? new Date(o.current_period_end) : null };
  if (isAccessBlocked(org) || !areModul(pachetEfectiv(org), "api-webhooks")) return esec("fara_acces");
  if (!r.scopuri.includes(scop)) return esec("fara_permisiune");
  if (!(await verificaLimitaRata("api-v1", r.id, LIMITA_CERERI_PE_ORA, 60))) return esec("prea_multe_cereri");
  // „Ultima folosire” se actualizează cel mult o dată pe minut, ca o cheie folosită intens să nu scrie în baza de date la fiecare cerere.
  if (!r.ultima_folosire_la || Date.now() - new Date(r.ultima_folosire_la).getTime() > 60_000) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${r.org_id}, true)`);
      await tx.execute(sql`update api_chei set ultima_folosire_la = now() where id = ${r.id} and org_id = ${r.org_id}`);
    }).catch(() => {});
  }
  return { ok: true, cheie: { id: r.id, orgId: r.org_id, scopuri: r.scopuri } };
}

export type TxApi = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Rulează o interogare în contextul organizației cheii (RLS pe org_id).
export async function inOrgApi<T>(orgId: string, f: (tx: TxApi) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    return f(tx);
  });
}

// ===== Evenimente și livrări =====
type Exec = Pick<typeof db, "execute">;

// Pune evenimentul în coada de livrare a fiecărui endpoint activ abonat la el. Se apelează în aceeași tranzacție cu fapta (donația, dezabonarea): fie se salvează amândouă, fie niciuna.
// Un eșec aici NU trebuie să strice fapta: apelantul îl rulează într-un savepoint și îl ignoră. Contextul organizației (app.current_org_id) trebuie să fie setat.
export async function emiteEveniment(exec: Exec, orgId: string, eveniment: Eveniment, date: unknown): Promise<number> {
  const rez = (await exec.execute(sql`
    insert into webhook_livrari (org_id, endpoint_id, eveniment, payload)
    select ${orgId}, e.id, ${eveniment}, jsonb_build_object('id', gen_random_uuid(), 'tip', ${eveniment}::text, 'creat_la', now(), 'date', ${JSON.stringify(date)}::text::jsonb)
    from webhook_endpointuri e where e.org_id = ${orgId} and e.activ and ${eveniment} = any(e.evenimente)
    returning id`)) as unknown as unknown[];
  return rez.length;
}

// POST către adresa organizației. Fără redirectări, cu timeout de 8 secunde, iar conexiunea se face DOAR către adrese IP publice (verificat în rezolvarea numelui: un nume care
// duce într-o rețea internă sau la metadatele serverului nu primește nimic). Răspunsul nu se citește.
export function trimitePost(url: string, corp: string, antete: Record<string, string>, timeoutMs = 8000): Promise<{ cod: number | null; eroare?: string }> {
  return new Promise((resolve) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      resolve({ cod: null, eroare: "adresa_invalida" });
      return;
    }
    // Adresele IP (în loc de nume) nu trec: conexiunea la ele nu ar mai trece prin rezolvarea numelui, unde se verifică adresa. Se refuză și la creare, aici e plasa de siguranță.
    if (tipIp(u.hostname) !== 0) {
      resolve({ cod: null, eroare: "adresa_interna" });
      return;
    }
    const cerere = https.request(
      {
        protocol: "https:",
        hostname: u.hostname,
        port: 443,
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers: { ...antete, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(corp) },
        timeout: timeoutMs,
        lookup: ((gazda: string, optiuni: dns.LookupOptions, callback: (...args: unknown[]) => void) => {
          dns.lookup(gazda, { ...optiuni, all: true }, (err, adrese) => {
            if (err) return callback(err);
            const lista = (Array.isArray(adrese) ? adrese : [{ address: adrese as unknown as string, family: 4 }]) as dns.LookupAddress[];
            if (lista.length === 0 || lista.some((a) => !esteIpPublic(a.address))) return callback(new Error("adresa_interna"));
            if (optiuni.all) return callback(null, lista);
            callback(null, lista[0].address, lista[0].family);
          });
        }) as never,
      },
      (raspuns) => {
        raspuns.resume();
        resolve({ cod: raspuns.statusCode ?? null });
      },
    );
    cerere.on("timeout", () => cerere.destroy(new Error("timeout")));
    cerere.on("error", (e) => resolve({ cod: null, eroare: String(e.message).slice(0, 120) }));
    cerere.write(corp);
    cerere.end();
  });
}

type LivrareDeTrimis = { id: string; endpoint_id: string; eveniment: string; payload: unknown; incercari: number; url: string; secret_enc: string; esecuri_consecutive: number };

// Trimite livrările scadente ale unei organizații (cel mult `limita`). Fiecare livrare se revendică înainte de trimitere (urmatoarea_incercare_la mutat cu 5 minute),
// deci două rulări simultane nu o trimit de două ori. Rezultatul se scrie după: reușită, reîncercare cu pauză mai mare sau eșuată definitiv după MAX_INCERCARI.
export async function proceseazaLivrari(orgId: string, limita = 25): Promise<{ trimise: number; esuate: number }> {
  const revendicate = await inOrgApi(orgId, async (tx) => {
    return (await tx.execute(sql`
      with scadente as (
        select l.id from webhook_livrari l join webhook_endpointuri e on e.id = l.endpoint_id
        where l.org_id = ${orgId} and l.stare = 'in_asteptare' and l.urmatoarea_incercare_la <= now() and e.activ
        order by l.created_at limit ${limita} for update of l skip locked
      )
      update webhook_livrari l set urmatoarea_incercare_la = now() + interval '5 minutes'
      from scadente s, webhook_endpointuri e
      where l.id = s.id and e.id = l.endpoint_id
      returning l.id, l.endpoint_id, l.eveniment, l.payload, l.incercari, e.url, e.secret_enc, e.esecuri_consecutive`)) as unknown as LivrareDeTrimis[];
  });
  let trimise = 0;
  let esuate = 0;
  for (const l of revendicate) {
    const corp = JSON.stringify(l.payload);
    let rez: { cod: number | null; eroare?: string };
    try {
      const secret = decripteaza(l.secret_enc);
      rez = await trimitePost(l.url, corp, { "X-Alexandrit-Semnatura": semneazaWebhook(secret, corp), "X-Alexandrit-Eveniment": l.eveniment, "X-Alexandrit-Livrare": l.id, "User-Agent": "Alexandrit-Webhooks/1.0" });
    } catch {
      rez = { cod: null, eroare: "secret_nedecriptabil" };
    }
    const fel = rezultatLivrare(rez.cod);
    const incercari = l.incercari + 1;
    const urmatoarea = fel === "esuat" ? urmatoareaIncercare(incercari, new Date()) : null;
    await inOrgApi(orgId, async (tx) => {
      if (fel === "trimis") {
        await tx.execute(sql`update webhook_livrari set stare = 'trimis', incercari = ${incercari}, ultimul_cod = ${rez.cod}, ultima_eroare = null, trimis_la = now() where id = ${l.id} and org_id = ${orgId}`);
        await tx.execute(sql`update webhook_endpointuri set esecuri_consecutive = 0 where id = ${l.endpoint_id} and org_id = ${orgId}`);
        return;
      }
      const definitiv = fel === "dezactiveaza" || urmatoarea === null;
      await tx.execute(sql`
        update webhook_livrari set stare = ${definitiv ? "esuat" : "in_asteptare"}, incercari = ${incercari}, ultimul_cod = ${rez.cod}, ultima_eroare = ${rez.eroare ?? null},
          urmatoarea_incercare_la = ${(urmatoarea ?? new Date()).toISOString()}::timestamptz where id = ${l.id} and org_id = ${orgId}`);
      const esecuri = l.esecuri_consecutive + 1;
      const dezactivare = fel === "dezactiveaza" ? "Destinatarul a răspuns 410 (nu mai vrea evenimente)" : esecuri >= PRAG_DEZACTIVARE ? `Dezactivat automat după ${PRAG_DEZACTIVARE} livrări eșuate la rând` : null;
      await tx.execute(sql`update webhook_endpointuri set esecuri_consecutive = ${esecuri}, activ = ${dezactivare === null}, dezactivat_motiv = ${dezactivare} where id = ${l.endpoint_id} and org_id = ${orgId}`);
    });
    if (fel === "trimis") trimise++;
    else {
      esuate++;
      if (incercari >= MAX_INCERCARI || fel === "dezactiveaza") raporteazaAvertisment("webhook-livrari", `livrare eșuată definitiv (${l.eveniment})`, { cod: String(rez.cod ?? "") });
    }
  }
  return { trimise, esuate };
}
