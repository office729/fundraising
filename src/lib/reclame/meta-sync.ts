import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { reclameCampanii, reclameConexiuni, reclameCosturi } from "@/lib/db/schema";
import { cursEurRon } from "@/lib/curs-valutar";
import { raporteazaEroare } from "@/lib/monitoring";
import { criptareConfigurata, cripteaza, decripteaza } from "@/lib/secret-box";

import { citesteCont, codDinNumeCampanie, descarcaInsights, EroareMeta, idCont, intervale, mapeazaInsights, perioadaSincronizare, type FetchLike } from "./meta-api";

// Sincronizarea costurilor din Meta (doar citire). Se rulează din butonul „Sincronizează acum”, din cronul zilnic și, în fundal, când pagina e deschisă
// și datele sunt mai vechi de o oră. Nu ține o conexiune la baza de date cât așteaptă Meta: pentru fiecare interval de 14 zile se face o cerere externă
// (fără tranzacție), apoi o tranzacție scurtă care înlocuiește costurile Meta din acele zile. Un interval eșuat nu strică intervalele deja scrise.

const PLATFORMA = "meta";
const BLOCAJ_MINUTE = 10;
const VERSIUNE = () => process.env.META_GRAPH_VERSION || undefined;

const aziBucuresti = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export type RezultatSync =
  | { ok: true; randuri: number; de: string; pana: string; ignorate: number; moneda: string; cursRon: number }
  | { ok: false; eroare: string; clasa: string };

const fetchReal: FetchLike = (url, init) => fetch(url, { headers: init.headers, signal: init.signal, cache: "no-store" });

// Rulează o tranzacție în contextul organizației (aceeași izolare RLS ca în restul aplicației).
async function inOrg<T>(orgId: string, f: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    return f(tx as unknown as typeof db);
  });
}

// Organizațiile cu o conexiune Meta activă (pentru cron). Citire în contextul de încredere app.public_lookup; scrierile se fac apoi pe fiecare organizație.
export async function organizatiiCuMeta(): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const r = await tx.select({ orgId: reclameConexiuni.orgId }).from(reclameConexiuni).where(and(eq(reclameConexiuni.platforma, PLATFORMA), eq(reclameConexiuni.stare, "activ")));
    return r.map((x) => x.orgId);
  });
}

async function noteazaEsec(orgId: string, e: unknown): Promise<{ eroare: string; clasa: string }> {
  const meta = e instanceof EroareMeta ? e : null;
  if (!meta) raporteazaEroare("reclame-meta-sync", e, { orgId });
  const mesaj = meta ? meta.message : "Sincronizarea nu a reușit. Încearcă din nou peste puțin timp.";
  const clasa = meta?.clasa ?? "alta";
  // Tokenul invalid, lipsa permisiunii sau contul greșit cer reconectare; limitarea și erorile trecătoare se reiau singure.
  const stare = clasa === "token" || clasa === "permisiuni" || clasa === "cont" ? "necesita-reconectare" : "activ";
  await inOrg(orgId, (tx) =>
    tx
      .update(reclameConexiuni)
      .set({ stare, ultimaEroare: mesaj, sincronizarePornitaLa: null })
      .where(and(eq(reclameConexiuni.orgId, orgId), eq(reclameConexiuni.platforma, PLATFORMA))),
  );
  return { eroare: mesaj, clasa };
}

export async function sincronizeazaMeta(orgId: string, opt: { zile: number; fetchImpl?: FetchLike; deadlineMs?: number; doarActiva?: boolean }): Promise<RezultatSync> {
  // 1. Conexiunea și blocajul (tranzacție scurtă).
  const conexiune = await inOrg(orgId, async (tx) => {
    const [c] = await tx.select().from(reclameConexiuni).where(and(eq(reclameConexiuni.orgId, orgId), eq(reclameConexiuni.platforma, PLATFORMA))).limit(1);
    if (!c) return { eroare: "Meta nu e conectat." } as const;
    if (c.stare !== "activ" && (opt.doarActiva || c.stare === "necesita-reconectare")) return { eroare: "Conexiunea cere reconectare: generează un token nou și reconectează contul." } as const;
    const luat = await tx
      .update(reclameConexiuni)
      .set({ sincronizarePornitaLa: sql`now()`, ultimaSincronizare: sql`now()` })
      .where(and(eq(reclameConexiuni.id, c.id), sql`(${reclameConexiuni.sincronizarePornitaLa} is null or ${reclameConexiuni.sincronizarePornitaLa} < now() - make_interval(mins => ${BLOCAJ_MINUTE}))`))
      .returning({ id: reclameConexiuni.id });
    if (!luat.length) return { eroare: "O sincronizare e deja în curs." } as const;
    return c;
  });
  if ("eroare" in conexiune) return { ok: false, eroare: conexiune.eroare, clasa: "stare" };

  try {
    // 2. Moneda și cursul, înainte de orice cerere.
    const moneda = (conexiune.moneda ?? "RON").toUpperCase();
    let curs = 1;
    if (moneda !== "RON") {
      const manual = conexiune.cursManual ? Number(conexiune.cursManual) : null;
      const curent = moneda === "EUR" && !manual ? await cursEurRon() : manual;
      if (!curent || !Number.isFinite(curent) || curent <= 0) throw new EroareMeta("alta", `Contul folosește moneda ${moneda}: setează cursul de conversie în lei la reconectare.`, 0, null, null);
      curs = curent;
    }
    const token = decripteaza(conexiune.tokenEnc);
    const { de, pana } = perioadaSincronizare(aziBucuresti(), opt.zile);
    const deadline = opt.deadlineMs ?? Date.now() + 100_000;
    let randuri = 0;
    let ignorate = 0;

    // 3. Pe intervale de 14 zile: cerere (fără tranzacție), apoi înlocuirea costurilor Meta din acele zile (tranzacție scurtă).
    for (const iv of intervale(de, pana, 14)) {
      if (Date.now() > deadline) throw new EroareMeta("tranzitorie", "Sincronizarea a depășit timpul alocat; intervalul rămas se reia la următoarea rulare.", 0, null, null);
      const { randuri: brute } = await descarcaInsights({ fetchImpl: opt.fetchImpl ?? fetchReal, token, versiune: VERSIUNE(), contId: conexiune.contId, de: iv.de, pana: iv.pana });
      const m = mapeazaInsights(brute, conexiune.contId);
      if (m.moneda && m.moneda !== moneda) throw new EroareMeta("alta", `Moneda contului s-a schimbat (${m.moneda} față de ${moneda}). Reconectează contul.`, 0, null, null);
      ignorate += m.ignorate;
      randuri += m.randuri.length;
      await inOrg(orgId, async (tx) => {
        await tx.delete(reclameCosturi).where(and(eq(reclameCosturi.orgId, orgId), eq(reclameCosturi.platforma, PLATFORMA), sql`${reclameCosturi.ziua} between ${iv.de}::date and ${iv.pana}::date`));
        const valori = m.randuri.map((r) => ({
          orgId,
          platforma: PLATFORMA,
          ziua: r.ziua,
          cont: r.cont,
          campanieCheie: r.campanieCheie,
          campanieNume: r.campanieNume,
          setCheie: r.setCheie,
          setNume: r.setNume,
          reclamaCheie: r.reclamaCheie,
          reclamaNume: r.reclamaNume,
          plasament: r.plasament,
          moneda,
          cheltuialaMinor: r.cheltuialaMinor,
          cursRon: String(curs),
          cheltuialaRonMinor: Math.round(r.cheltuialaMinor * curs),
          afisari: r.afisari,
          clicuriLink: r.clicuri,
          sursa: "api",
        }));
        for (let i = 0; i < valori.length; i += 500) await tx.insert(reclameCosturi).values(valori.slice(i, i + 500));
        // Campaniile noi apar în lista de legături; dacă numele conține un cod cmp_NNN, legătura se face singură (una existentă nu se schimbă).
        const campanii = new Map<string, string>();
        for (const r of m.randuri) if (r.campanieCheie) campanii.set(r.campanieCheie, r.campanieNume);
        for (const [cheie, nume] of campanii) {
          await tx
            .insert(reclameCampanii)
            .values({ orgId, platforma: PLATFORMA, campanieCheie: cheie, campanieNume: nume, utmCampanie: codDinNumeCampanie(nume) })
            .onConflictDoUpdate({
              target: [reclameCampanii.orgId, reclameCampanii.platforma, reclameCampanii.campanieCheie],
              set: { campanieNume: sql`excluded.campanie_nume`, utmCampanie: sql`coalesce(reclame_campanii.utm_campanie, excluded.utm_campanie)` },
            });
        }
      });
    }

    await inOrg(orgId, (tx) =>
      tx
        .update(reclameConexiuni)
        .set({ stare: "activ", ultimaEroare: null, ultimaReusita: sql`now()`, randuriUltima: randuri, deLa: de, panaLa: pana, sincronizarePornitaLa: null })
        .where(eq(reclameConexiuni.id, conexiune.id)),
    );
    return { ok: true, randuri, de, pana, ignorate, moneda, cursRon: curs };
  } catch (e) {
    const n = await noteazaEsec(orgId, e);
    return { ok: false, eroare: n.eroare, clasa: n.clasa };
  }
}

// La deschiderea paginii: dacă datele sunt mai vechi de o oră, se reîmprospătează ultimele 7 zile în fundal (după trimiterea răspunsului).
// Nu reia la fiecare deschidere de pagină: sare dacă ultima încercare (chiar eșuată) e de mai puțin de 10 minute.
export async function sincronizeazaDacaVeche(orgId: string, ultimaReusitaIso: string | null, ultimaIncercareIso: string | null, pragMin: number): Promise<void> {
  const acum = Date.now();
  if (ultimaIncercareIso && acum - Date.parse(ultimaIncercareIso) < 10 * 60_000) return;
  if (ultimaReusitaIso && acum - Date.parse(ultimaReusitaIso) < pragMin * 60_000) return;
  try {
    await sincronizeazaMeta(orgId, { zile: 7, doarActiva: true });
  } catch (e) {
    raporteazaEroare("reclame-meta-sync-fundal", e, { orgId });
  }
}

// ───────────── conectare / deconectare ─────────────

const TOKEN_RE = /^[A-Za-z0-9_\-.|]{20,700}$/;

export type RezultatConectare = { ok: true; nume: string | null; moneda: string; fusOrar: string | null } | { ok: false; eroare: string };

// Verifică tokenul pe contul publicitar (citire), apoi îl păstrează criptat. Tokenul nu se întoarce niciodată către browser și nu intră în jurnale.
export async function conecteazaMeta(orgId: string, userId: string, input: { contId: string; token: string; cursManual?: number | null; fetchImpl?: FetchLike }): Promise<RezultatConectare> {
  const contId = idCont(String(input.contId ?? ""));
  if (!contId) return { ok: false, eroare: "ID-ul contului publicitar nu e valid. Îl găsești în Ads Manager (cifre, cu sau fără act_)." };
  const token = String(input.token ?? "").trim();
  if (!TOKEN_RE.test(token)) return { ok: false, eroare: "Tokenul nu pare valid. Lipește tokenul de acces generat pentru utilizatorul de sistem, fără spații." };
  if (!criptareConfigurata()) return { ok: false, eroare: "Serverul nu poate păstra secrete în siguranță (lipsește ORG_SECRETS_KEY). Contactează echipa Alexandrit." };
  try {
    const cont = await citesteCont({ fetchImpl: input.fetchImpl ?? fetchReal, token, versiune: VERSIUNE(), contId });
    const moneda = cont.moneda ?? "RON";
    const manual = input.cursManual && Number.isFinite(input.cursManual) && input.cursManual > 0 && input.cursManual < 1000 ? input.cursManual : null;
    if (moneda !== "RON" && moneda !== "EUR" && !manual) return { ok: false, eroare: `Contul folosește moneda ${moneda}. Introdu cursul de conversie în lei (de exemplu 4,60).` };
    await inOrg(orgId, async (tx) => {
      const valori = {
        orgId,
        platforma: PLATFORMA,
        contId,
        contNume: cont.nume,
        moneda,
        fusOrar: cont.fusOrar,
        tokenEnc: cripteaza(token),
        cursManual: manual ? String(manual) : null,
        stare: "activ",
        ultimaEroare: null,
        ultimaReusita: null,
        randuriUltima: null,
        sincronizarePornitaLa: null,
        creatDe: userId,
      };
      await tx
        .insert(reclameConexiuni)
        .values(valori)
        .onConflictDoUpdate({ target: [reclameConexiuni.orgId, reclameConexiuni.platforma], set: { ...valori, creatLa: sql`now()` } });
    });
    return { ok: true, nume: cont.nume, moneda, fusOrar: cont.fusOrar };
  } catch (e) {
    if (e instanceof EroareMeta) return { ok: false, eroare: e.message };
    raporteazaEroare("reclame-meta-conectare", e, { orgId });
    return { ok: false, eroare: "Nu am putut verifica contul acum. Încearcă din nou peste puțin timp." };
  }
}

// Șterge tokenul și conexiunea. Costurile deja aduse rămân (se pot șterge din „Import costuri”).
export async function deconecteazaMeta(orgId: string): Promise<void> {
  await inOrg(orgId, (tx) => tx.delete(reclameConexiuni).where(and(eq(reclameConexiuni.orgId, orgId), eq(reclameConexiuni.platforma, PLATFORMA))));
}
