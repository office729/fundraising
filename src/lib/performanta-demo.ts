import { and, eq, inArray, like, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { activitati, angajati, angajatiAbsente, appUsers, blocaje, crmKv, departments, kpiCategorii, kpiDefinitii, kpiInteractiuni, kpiSabloane, obiective, performantaNotificari, rezultateActualizari, rezultateCheie, roluri } from "@/lib/db/schema";
import { executaImport, planifica, stergeImport } from "@/lib/donatori-import-server";
import { aziRo, luniSaptamanii, ritmAsteptat } from "@/lib/performanta-masurare";
import { salveazaObiectiv } from "@/lib/performanta-obiective";
import { rezolvaPerioada } from "@/lib/performanta-perioada";
import { SABLON_PE_ID } from "@/lib/performanta-sabloane";
import { aplicaSablon } from "@/lib/performanta-sabloane-server";
import { valoareCrm } from "@/lib/performanta-surse";

// Încarcă date FICTIVE într-o organizație DEMONSTRATIVĂ (persoane, obiective, activități, discuții și, opțional, donatori), cu marcaj pentru ștergere.
// NU se pornește din interfață și nu se aplică organizațiilor reale: se rulează doar din scripts/seed-demo-performanta.mts, pe o organizație aleasă explicit.
// Nu se modifică și nu se șterge nimic din ce există deja în organizație; ce se creează e urmărit în marcajul `performanta/demo` și se poate șterge integral.

type Rez<T extends object = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const CALE = "performanta/demo";
const DOMENIU = "demo.invalid"; // domeniu rezervat (RFC 2606): niciun mesaj nu poate ajunge la o adresă reală

type Marcaj = {
  la: string;
  departamente: string[];
  roluri: string[];
  angajati: string[];
  profilulMeuCreat: boolean;
  obiective: string[];
  activitati: string[];
  blocaje: string[];
  interactiuni: string[];
  absente: string[];
  importId: string | null;
  donatori: number;
  // Rămase de la versiuni anterioare (KPI Library și KPI echipă vechi, șterse din aplicație): „--sterge” le curăță, iar cheile din crm_kv
  // revin la conținutul de dinainte.
  categoriiKpi?: string[];
  definitiiKpi?: string[];
  sabloaneKpi?: string[];
  kvAnterior?: Record<string, { existat: boolean; anterior: unknown }>;
};

export type StareDemo = { incarcat: boolean; la: string | null; persoane: number; obiective: number; activitati: number; donatori: number; areDateDonatori: boolean };

const sqlCount = (orgId: string) => sql`select (
  (select count(*) from donatori_reali where org_id = ${orgId}) + (select count(*) from donatii_importate where org_id = ${orgId}) + (select count(*) from fundraising_donations where org_id = ${orgId})
)::int as n`;

export async function stareDemo(ctx: Pick<OrgContext, "db" | "orgId">): Promise<StareDemo> {
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CALE))).limit(1);
  const m = r?.data as Marcaj | undefined;
  const [{ n }] = (await ctx.db.execute(sqlCount(ctx.orgId))) as unknown as { n: number }[];
  return { incarcat: !!m, la: m?.la ?? null, persoane: m?.angajati.length ?? 0, obiective: m?.obiective.length ?? 0, activitati: m?.activitati.length ?? 0, donatori: m?.donatori ?? 0, areDateDonatori: Number(n) > 0 && !m?.importId };
}

const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);
const la = (iso: string, ora = 9) => new Date(`${iso}T${String(ora).padStart(2, "0")}:00:00+03:00`);

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ───────── Donatori fictivi (prin importul obișnuit, deci reversibil) ─────────
const PRENUME = ["Maria", "Ion", "Elena", "Andrei", "Ioana", "Mihai", "Ana", "Vasile", "Cristina", "Alexandru", "Daniela", "George", "Monica", "Florin", "Raluca", "Bogdan", "Simona", "Cătălin", "Laura", "Sorin", "Carmen", "Dan", "Roxana", "Marius", "Diana"];
const NUME = ["Popescu", "Ionescu", "Dumitru", "Stan", "Gheorghe", "Rusu", "Munteanu", "Constantin", "Marin", "Tudor", "Dobre", "Barbu", "Neagu", "Preda", "Lungu", "Moldovan", "Stoica", "Radu", "Zamfir", "Ene"];
const LOCALITATI: [string, string][] = [["București", "București"], ["Cluj-Napoca", "Cluj"], ["Iași", "Iași"], ["Timișoara", "Timiș"], ["Brașov", "Brașov"], ["Constanța", "Constanța"], ["Sibiu", "Sibiu"], ["Oradea", "Bihor"], ["Craiova", "Dolj"], ["Pitești", "Argeș"]];
const PROIECTE = ["Campania de iarnă", "Ghiozdanul fiecărui copil", "Fondul pentru tratamente", "Dăruiește-ți ziua"];
const faraDiacritice = (s: string) => s.toLowerCase().replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i").replace(/ș/g, "s").replace(/ț/g, "t");

function randuriDonatori(azi: string): unknown[][] {
  const r = prng(20261009);
  const out: unknown[][] = [];
  const ziAzi = Date.parse(`${azi}T12:00:00Z`);
  const d = (zileInUrma: number) => new Date(ziAzi - zileInUrma * 86400000).toISOString().slice(0, 10);
  for (let i = 0; i < 90; i++) {
    const prenume = PRENUME[i % PRENUME.length];
    const nume = NUME[(Math.floor(i / PRENUME.length) + (i % 7)) % NUME.length];
    const email = faraDiacritice(`${prenume}.${nume}${i}@${DOMENIU}`);
    const [loc, jud] = LOCALITATI[Math.floor(r() * LOCALITATI.length)];
    const telefon = r() < 0.55 ? `0700 ${String(100 + Math.floor(r() * 899))} ${String(100 + Math.floor(r() * 899))}` : "";
    const proiect = PROIECTE[Math.floor(r() * PROIECTE.length)];
    const tip = i % 9;
    const donatie = (zile: number, suma: number, p = proiect) => out.push([email, `${prenume} ${nume}`, suma, d(zile), p, loc, jud, telefon]);
    const sumaBaza = [20, 30, 50, 50, 100, 100, 150, 250, 500][Math.floor(r() * 9)];
    if (tip <= 2) for (let k = 0; k < 10 + Math.floor(r() * 8); k++) donatie(k * 30 + Math.floor(r() * 8), sumaBaza);
    else if (tip === 3 || tip === 4) {
      donatie(400 + Math.floor(r() * 300), sumaBaza);
      donatie(Math.floor(r() * 25), sumaBaza * 2, PROIECTE[(i + 1) % 4]);
    } else if (tip === 5) {
      donatie(380 + Math.floor(r() * 200), sumaBaza);
      donatie(200 + Math.floor(r() * 120), sumaBaza);
    } else if (tip === 6) donatie(Math.floor(r() * 20), sumaBaza);
    else if (tip === 7) {
      donatie(60 + Math.floor(r() * 90), sumaBaza);
      donatie(Math.floor(r() * 45), sumaBaza);
    } else donatie(90 + Math.floor(r() * 500), sumaBaza);
  }
  return out;
}

// ───────── Oameni și ritm ─────────
type Pers = { cheie: string; nume: string; rol: string; sablon: string; dep: "F" | "C"; manager: string; norma: number };
const ECHIPA: Pers[] = [
  { cheie: "irina", nume: "Irina Voicu", rol: "Fundraising și PR", sablon: "fundraising_pr", dep: "F", manager: "eu", norma: 100 },
  { cheie: "radu", nume: "Radu Matei", rol: "Companii și voluntari", sablon: "companii_voluntari", dep: "F", manager: "eu", norma: 100 },
  { cheie: "elena", nume: "Elena Costin", rol: "Donatori persoane fizice", sablon: "donatori_pf", dep: "F", manager: "irina", norma: 100 },
  { cheie: "tudor", nume: "Tudor Barbu", rol: "Video și live", sablon: "video_live", dep: "C", manager: "eu", norma: 100 },
  { cheie: "ioana", nume: "Ioana Pavel", rol: "Statistici, rapoarte și LinkedIn", sablon: "date_rapoarte", dep: "C", manager: "irina", norma: 80 },
];
const RITM: Record<string, (number | null)[]> = { eu: [1.0, 1.1, 0.95, 1.0], irina: [1.15, 1.0, 1.05, 0.95], radu: [0.7, 0.45, 0.9, 0.8], elena: [1.0, 0.85, 1.1, 1.0], tudor: [1.0, 1.05, 0.95, 1.2], ioana: [0.95, null, 0.6, 1.0] };
const COMENTARII = ["Am încheiat prima rundă; urmează confirmările.", "Un partener a amânat decizia cu două săptămâni.", "Pe drumul bun, fără probleme majore.", "Așteptăm datele de la contabilitate ca să închidem.", "Rezultat verificat cu raportul din platformă."];
const NUME_ADMIN = "Alexandra Popa";

export async function incarcaDemo(ctx: OrgContext, optiuni: { donatori: boolean; numeAdmin?: string }): Promise<Rez<{ rezumat: string }>> {
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, eroare: "Datele demo le încarcă un administrator." };
  const existent = await stareDemo(ctx);
  if (existent.incarcat) return { ok: false, eroare: "Datele demo sunt deja încărcate. Șterge-le întâi, dacă vrei să le reîncarci." };
  const azi = aziRo();
  const numeAdmin = (optiuni.numeAdmin ?? NUME_ADMIN).trim() || NUME_ADMIN;
  const luni = luniSaptamanii(azi);
  const trim = rezolvaPerioada(null, azi);
  const an = azi.slice(0, 4);
  const m: Marcaj = { la: new Date().toISOString(), departamente: [], roluri: [], angajati: [], profilulMeuCreat: false, obiective: [], activitati: [], blocaje: [], interactiuni: [], absente: [], importId: null, donatori: 0 };
  const salveazaMarcaj = () => ctx.db.insert(crmKv).values({ orgId: ctx.orgId, path: CALE, data: m, updatedAt: new Date() }).onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: m, updatedAt: new Date() } });

  // 1. Departamente, roluri, oameni
  const dep = await ctx.db.insert(departments).values([{ orgId: ctx.orgId, nume: "Fundraising" }, { orgId: ctx.orgId, nume: "Comunicare și date" }]).returning({ id: departments.id });
  m.departamente = dep.map((x) => x.id);
  const rolNume = ["Conducere și parteneriate", ...ECHIPA.map((p) => p.rol)];
  const rol = await ctx.db.insert(roluri).values(rolNume.map((nume) => ({ orgId: ctx.orgId, nume, descriere: "Rol demonstrativ." }))).returning({ id: roluri.id, nume: roluri.nume });
  m.roluri = rol.map((x) => x.id);
  const rolId = new Map(rol.map((x) => [x.nume, x.id]));

  let [eu] = await ctx.db.select({ id: angajati.id, nume: angajati.nume }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId))).limit(1);
  if (!eu) {
    const [u] = await ctx.db.select({ email: appUsers.email }).from(appUsers).where(eq(appUsers.id, ctx.userId)).limit(1);
    [eu] = await ctx.db.insert(angajati).values({ orgId: ctx.orgId, appUserId: ctx.userId, nume: numeAdmin, email: u?.email ?? null, roleId: rolId.get("Conducere și parteneriate"), departmentId: dep[0].id, status: "activ", nivelAcces: "manager", dataInceperii: `${Number(an) - 3}-01-15` }).returning({ id: angajati.id, nume: angajati.nume });
    m.angajati.push(eu.id);
    m.profilulMeuCreat = true;
  }
  const id: Record<string, string> = { eu: eu.id };
  for (const p of ECHIPA) {
    const [a] = await ctx.db
      .insert(angajati)
      .values({ orgId: ctx.orgId, nume: p.nume, email: `${p.cheie}@${DOMENIU}`, roleId: rolId.get(p.rol), departmentId: p.dep === "F" ? dep[0].id : dep[1].id, managerId: id[p.manager], status: "activ", normaProcent: p.norma, nivelAcces: p.cheie === "irina" ? "manager" : "membru", dataInceperii: `${Number(an) - 2}-03-01` })
      .returning({ id: angajati.id });
    id[p.cheie] = a.id;
    m.angajati.push(a.id);
  }
  await salveazaMarcaj();

  // 2. Donatori fictivi
  let areCrm = false;
  if (optiuni.donatori) {
    if (existent.areDateDonatori) return stergeSiEroare(ctx, m, "Organizația are deja donatori sau donații, deci nu adaug donatori fictivi ca să nu amestec cifrele.");
    const plan = await planifica(ctx, { antet: ["Email", "Nume", "Suma", "Data", "Proiect", "Localitate", "Județ", "Telefon"], randuri: randuriDonatori(azi) });
    if (plan.deImportat.length === 0) return stergeSiEroare(ctx, m, "Importul de donatori demo nu a găsit rânduri valide.");
    try {
      const imp = await executaImport(ctx, plan, "Date demo (fictive)");
      m.importId = imp.importId;
      m.donatori = imp.donatoriNoi;
      areCrm = true;
    } catch (e) {
      return stergeSiEroare(ctx, m, e instanceof Error ? e.message : "Importul de donatori demo a eșuat.");
    }
  }
  await salveazaMarcaj();

  // 3. Obiective strategice (anul curent)
  const incasari = areCrm ? ((await valoareCrm(ctx.db, ctx.orgId, "incasari_totale", `${an}-01-01`, azi)) ?? 0) : 0;
  const noi = areCrm ? ((await valoareCrm(ctx.db, ctx.orgId, "donatori_noi", `${an}-01-01`, azi)) ?? 0) : 0;
  const elapsedAn = ritmAsteptat(`${an}-01-01`, `${an}-12-31`, azi) || 0.77;
  const rotunjeste = (v: number, pas: number) => Math.max(pas, Math.round(v / pas) * pas);
  const baza = { nivel: "strategic" as const, responsabilId: eu.id, departmentId: null, parentId: null, perioadaStart: `${an}-01-01`, perioadaEnd: `${an}-12-31`, vizibilitate: "organizatie" as const, colaboratori: [] as string[], legaturi: [] as { id: string; tip: "sprijina" | "depinde_de" | "legat" }[] };
  const kr = (titlu: string, tinta: number, extra: Record<string, unknown> = {}) => ({ titlu, metoda: "crescator" as const, tipTinta: "cumulativ" as const, unitate: "", nivelInitial: 0, tinta, pondere: 1, sursa: "manual" as const, frecventaActualizare: "lunar" as const, ...extra });
  const s1 = await salveazaObiectiv(ctx, {
    ...baza,
    titlu: "Creștem veniturile din donații individuale cu 25%",
    descriere: "Obiectivul anului: mai mulți donatori care rămân, nu doar mai multe campanii.",
    rezultate: areCrm
      ? [
          kr("Încasări din donații", rotunjeste(incasari / (elapsedAn * 0.97), 1000), { unitate: "lei", sursa: "crm", metrica: "incasari_totale", pondere: 3, formula: "Suma donațiilor reușite din perioadă, după rambursări.", atribuire: "Rezultat al organizației; nu se atribuie unei singure persoane." }),
          kr("Donatori noi în an", rotunjeste(noi / (elapsedAn * 0.9), 5), { unitate: "donatori", sursa: "crm", metrica: "donatori_noi", pondere: 2, atribuire: "Rezultat al organizației, la care contribuie campaniile și comunicarea." }),
        ]
      : [kr("Încasări din donații", 250000, { unitate: "lei", pondere: 3, formula: "Suma donațiilor reușite din perioadă.", atribuire: "Rezultat al organizației; nu se atribuie unei singure persoane." }), kr("Donatori noi în an", 600, { unitate: "donatori", pondere: 2 })],
  });
  const s2 = await salveazaObiectiv(ctx, { ...baza, titlu: "Parteneriate strategice pe termen lung", descriere: "Mai puține relații, dar solide.", rezultate: [kr("Parteneriate strategice semnate", 4, { unitate: "parteneriate", pondere: 3 }), kr("Raport către consiliu predat", 1, { metoda: "binar" as never, tipTinta: "periodic" as const, nivelInitial: null })] });
  if (!s1.ok || !s2.ok) return stergeSiEroare(ctx, m, !s1.ok ? s1.eroare : !s2.ok ? s2.eroare : "Obiectivele strategice nu s-au putut crea.");
  m.obiective.push(s1.id, s2.id);
  const krStrat = await ctx.db.select().from(rezultateCheie).where(inArray(rezultateCheie.obiectivId, [s1.id, s2.id]));
  for (const k of krStrat.filter((x) => x.sursa === "manual")) {
    const v = k.titlu === "Încasări din donații" ? 190000 : k.titlu === "Donatori noi în an" ? 430 : k.titlu === "Parteneriate strategice semnate" ? 3 : null;
    if (v !== null) await scrieValoare(ctx, k.id, v, la(adauga(azi, -2)), "Actualizare lunară", "mare");
  }

  // 4. Obiective pe roluri, din șabloane (ținte-exemplu)
  const toti = [{ cheie: "eu", sablon: "conducere", nume: eu.nume }, ...ECHIPA.map((p) => ({ cheie: p.cheie, sablon: p.sablon, nume: p.nume }))];
  const titluri = (sablonId: string) => SABLON_PE_ID.get(sablonId)!.obiective.map((o) => o.titlu);
  const selecteaza = () => ctx.db.select().from(obiective).where(and(eq(obiective.orgId, ctx.orgId), inArray(obiective.responsabilId, Object.values(id)), eq(obiective.nivel, "individual"), eq(obiective.perioadaStart, trim.start)));
  const inainte = new Set((await selecteaza()).map((o) => o.id));
  for (const p of toti) {
    const r = await aplicaSablon(ctx, { sablonId: p.sablon, angajatId: id[p.cheie], perioadaStart: trim.start, perioadaEnd: trim.end });
    if (!r.ok) return stergeSiEroare(ctx, m, `Șablonul „${p.sablon}”: ${r.eroare}`);
  }
  const creat = (await selecteaza()).filter((o) => !inainte.has(o.id) && toti.some((p) => id[p.cheie] === o.responsabilId && titluri(p.sablon).includes(o.titlu)));
  m.obiective.push(...creat.map((o) => o.id));
  const dupaResp = (rid: string) => creat.filter((o) => o.responsabilId === rid).sort((a, b) => a.titlu.localeCompare(b.titlu, "ro"));
  for (const p of toti) {
    const prim = dupaResp(id[p.cheie])[0];
    if (prim) await ctx.db.update(obiective).set({ parentId: p.cheie === "radu" || p.cheie === "eu" ? s2.id : s1.id }).where(eq(obiective.id, prim.id));
  }
  await ctx.db.update(obiective).set({ departmentId: dep[0].id }).where(eq(obiective.id, s1.id));

  const e = ritmAsteptat(trim.start, trim.end, azi);
  // Rezultatele din CRM: cu donatori demo, țintele se potrivesc cu valorile calculate; altfel (sau pentru metrici fără date demo) devin manuale.
  const krInitiale = await ctx.db.select().from(rezultateCheie).where(inArray(rezultateCheie.obiectivId, creat.map((o) => o.id)));
  for (const k of krInitiale.filter((x) => x.sursa === "crm")) {
    const metrica = (k.sursaConfig as { metrica?: string } | null)?.metrica ?? "";
    const valoare = areCrm ? await valoareCrm(ctx.db, ctx.orgId, metrica, trim.start, trim.end) : null;
    if (areCrm && valoare !== null && valoare > 0 && ["incasari_totale", "donatori_noi"].includes(metrica)) {
      await ctx.db.update(rezultateCheie).set({ tinta: rotunjeste(valoare / Math.max(e, 0.05), metrica === "incasari_totale" ? 1000 : 5) }).where(eq(rezultateCheie.id, k.id));
    } else if (areCrm && valoare !== null && valoare > 0 && ["retentie_donatori", "completitudine_date_donatori"].includes(metrica)) {
      await ctx.db.update(rezultateCheie).set({ nivelInitial: Math.max(0, Math.round(valoare - 6)), tinta: Math.min(100, Math.round(valoare + 9)) }).where(eq(rezultateCheie.id, k.id));
    } else {
      await ctx.db.update(rezultateCheie).set({ sursa: "manual", sursaConfig: null, frecventaActualizare: "lunar" }).where(eq(rezultateCheie.id, k.id));
    }
  }
  const krTot = await ctx.db.select().from(rezultateCheie).where(inArray(rezultateCheie.obiectivId, creat.map((o) => o.id)));
  for (const p of toti) {
    const manuale = krTot.filter((k) => k.sursa === "manual" && dupaResp(id[p.cheie]).some((o) => o.id === k.obiectivId)).sort((a, b) => a.ordine - b.ordine || a.titlu.localeCompare(b.titlu, "ro"));
    const tipar = RITM[p.cheie] ?? [1];
    let i = 0;
    for (const k of manuale) {
      const ratio = tipar[i % tipar.length];
      i++;
      if (ratio === null) continue;
      const ti = k.tinta ?? 0;
      const ni = k.nivelInitial ?? 0;
      let v: number;
      if (k.metoda === "binar") v = ratio >= 1 ? 1 : 0;
      else if (k.metoda === "interval") v = ratio >= 0.9 ? ((k.tinta ?? 0) + (k.tintaMax ?? 0)) / 2 : (k.tinta ?? 0) * 0.5;
      else if (k.metoda === "descrescator") v = ni - (ni - ti) * Math.min(1, e * ratio);
      else v = k.tipTinta === "periodic" ? ni + (ti - ni) * Math.min(1, e * ratio) : Math.max(1, Math.round(ti * Math.min(1, e * ratio)));
      v = Math.round(v * 10) / 10;
      const veche = p.cheie === "ioana" && i === 3 && k.frecventaActualizare !== "trimestrial";
      await scrieValoare(ctx, k.id, v, la(adauga(azi, veche ? -90 : -(1 + (i % 4))), 10), COMENTARII[(i + p.cheie.length) % COMENTARII.length], (["mare", "medie", "scazuta"] as const)[i % 3]);
    }
  }
  await salveazaMarcaj();

  // 5. Activități
  const ob = (rid: string, k = 0) => dupaResp(rid)[k]?.id ?? null;
  const krDe = (oid: string | null, titlu: RegExp) => krTot.find((x) => x.obiectivId === oid && titlu.test(x.titlu))?.id ?? null;
  const a = async (v: { titlu: string; resp: string; zile: number | null; prioritate?: "critica" | "mare" | "medie" | "scazuta"; status?: string; efort?: number | null; ob?: string | null; kr?: string | null; aprobare?: boolean; aprobata?: boolean; recurenta?: "nu" | "saptamanal" | "lunar"; sursa?: "manual" | "automatizare"; cheie?: string; dep?: string | null; criteriu?: string }) => {
    const [x] = await ctx.db
      .insert(activitati)
      .values({
        orgId: ctx.orgId, titlu: v.titlu, responsabilId: id[v.resp], obiectivId: v.ob ?? null, rezultatId: v.kr ?? null, prioritate: v.prioritate ?? "medie", termen: v.zile === null ? null : adauga(azi, v.zile), efortOre: v.efort === undefined ? 2 : v.efort,
        status: v.status ?? "de_facut", aprobareNecesara: v.aprobare ?? false, aprobataDe: v.aprobata ? ctx.userId : null, aprobataLa: v.aprobata ? la(adauga(azi, -1)) : null, recurenta: v.recurenta ?? "nu", sursa: v.sursa ?? "manual",
        cheieAutomatizare: v.cheie ?? null, dependeDe: v.dep ?? null, criteriuFinalizare: v.criteriu ?? null, finalizatLa: v.status === "finalizat" ? la(adauga(azi, v.zile ?? 0), 15) : null, creatDe: ctx.userId,
      })
      .returning({ id: activitati.id });
    m.activitati.push(x.id);
    return x.id;
  };
  const obIrina = ob(id.irina), obRadu = ob(id.radu), obElena = ob(id.elena), obTudor = ob(id.tudor), obIoana = ob(id.ioana), obEu = ob(id.eu);
  const exportCrm = await a({ titlu: "Cere exportul de date de la contabilitate", resp: "ioana", zile: -1, prioritate: "mare", status: "in_lucru", efort: 1 });
  await a({ titlu: "Pregătește raportul pentru sponsorul Alpha", resp: "ioana", zile: 2, prioritate: "critica", efort: 6, ob: obIoana, kr: krDe(obIoana, /Rapoarte de sponsor/), dep: exportCrm, criteriu: "Raportul e trimis sponsorului, cu cifrele verificate în platformă." });
  await a({ titlu: "Raport săptămânal de statistici", resp: "ioana", zile: 0, prioritate: "medie", recurenta: "saptamanal", efort: 2 });
  await a({ titlu: "Postare LinkedIn despre campania de iarnă", resp: "ioana", zile: 3, efort: 1.5, ob: obIoana, kr: krDe(obIoana, /LinkedIn/) });
  await a({ titlu: "Comunicat de presă: lansarea campaniei de iarnă", resp: "irina", zile: 1, prioritate: "mare", aprobare: true, aprobata: false, efort: 3, ob: obIrina, kr: krDe(obIrina, /Comunicate/) });
  await a({ titlu: "Mesaj de mulțumire către sponsorii din vară", resp: "irina", zile: 4, aprobare: true, aprobata: true, efort: 1.5 });
  await a({ titlu: "Planifică calendarul campaniilor din T4", resp: "irina", zile: -3, prioritate: "mare", status: "finalizat", efort: 4, ob: obIrina });
  await a({ titlu: "Interviu pentru emisiunea de dimineață", resp: "irina", zile: 5, prioritate: "medie", efort: 2, ob: obIrina, kr: krDe(obIrina, /presă/) });
  const contract = await a({ titlu: "Finalizează contractul cu firma Alpha", resp: "radu", zile: -2, prioritate: "critica", status: "blocat", efort: 3, ob: obRadu, kr: krDe(obRadu, /Sponsorizări/) });
  await a({ titlu: "Întâlnire cu un potențial partener corporate", resp: "radu", zile: 1, prioritate: "mare", efort: 2, ob: obRadu });
  await a({ titlu: "Contactează 10 companii noi din lista de prospecți", resp: "radu", zile: 0, efort: 3, ob: obRadu, kr: krDe(obRadu, /noi contactate/) });
  await a({ titlu: "Ghid pentru voluntarii noi", resp: "radu", zile: 7, prioritate: "scazuta", efort: 5, ob: obRadu });
  await a({ titlu: "Sună donatorii dormanți din lista de reactivare", resp: "elena", zile: 0, prioritate: "mare", efort: 3, ob: obElena });
  await a({ titlu: "Curăță datele donatorilor fără telefon", resp: "elena", zile: 2, efort: 4, ob: obElena, kr: krDe(obElena, /Completitudinea/) });
  await a({ titlu: "Trimite mulțumirile din ultima campanie", resp: "elena", zile: -1, prioritate: "mare", status: "finalizat", efort: 2, ob: obElena });
  await a({ titlu: "Mulțumește donatorilor primei donații", resp: "elena", zile: 1, efort: 0.5, sursa: "automatizare", cheie: "demo:multumire:1", criteriu: "Donatorul a primit mulțumirea (telefon, mesaj sau email)." });
  await a({ titlu: "Montaj clip de mulțumire pentru donatorii lunari", resp: "tudor", zile: 3, prioritate: "mare", status: "in_lucru", efort: 8, ob: obTudor, kr: krDe(obTudor, /Videoclipuri/) });
  await a({ titlu: "Transmisiune live: povestea unui beneficiar", resp: "tudor", zile: 6, prioritate: "critica", efort: 6, ob: obTudor, kr: krDe(obTudor, /live/) });
  await a({ titlu: "Arhivează materialele brute din campania de vară", resp: "tudor", zile: null, prioritate: "scazuta", efort: null });
  await a({ titlu: "Pregătește raportul trimestrial pentru consiliu", resp: "eu", zile: 5, prioritate: "mare", efort: 5, ob: obEu });
  await a({ titlu: "Decizie: prioritățile campaniei de iarnă", resp: "eu", zile: -1, prioritate: "critica", status: "in_asteptare", efort: 1 });
  await a({ titlu: "Revizuiește țintele din șabloanele de roluri", resp: "eu", zile: 2, efort: 2 });
  await a({ titlu: "Raport către sponsor: partenerul Beta", resp: "ioana", zile: 20, prioritate: "mare", efort: 3, sursa: "automatizare", cheie: "demo:raport-sponsor:1", criteriu: "Raportul a fost trimis sponsorului." });

  // 6. Blocaje
  const zileTrim = Math.max(0, Math.round((Date.parse(`${azi}T12:00:00Z`) - Date.parse(`${trim.start}T12:00:00Z`)) / 86400000));
  const inapoi = (zile: number) => adauga(azi, -Math.min(zile, zileTrim));
  const bl = await ctx.db
    .insert(blocaje)
    .values([
      { orgId: ctx.orgId, activitateId: contract, motiv: "Aprobarea juridică a sponsorului întârzie; fără ea nu putem semna.", responsabilRezolvareId: id.eu, raportatDeId: id.radu, termenRevenire: adauga(azi, -1), necesitaDecizie: true, deschisLa: la(adauga(azi, -6)) },
      { orgId: ctx.orgId, obiectivId: obTudor, motiv: "Studioul de montaj e ocupat până joi; clipul de mulțumire riscă să se mute.", responsabilRezolvareId: id.irina, raportatDeId: id.tudor, termenRevenire: azi, necesitaDecizie: false, deschisLa: la(adauga(azi, -3)) },
      { orgId: ctx.orgId, activitateId: exportCrm, motiv: "Contabilitatea nu avea exportul în formatul cerut.", responsabilRezolvareId: id.irina, raportatDeId: id.ioana, termenRevenire: adauga(azi, -4), necesitaDecizie: false, status: "rezolvat", rezolvare: "S-a stabilit un format comun; exportul vine lunar.", deschisLa: la(inapoi(9)), rezolvatLa: la(inapoi(5)) },
    ])
    .returning({ id: blocaje.id });
  m.blocaje.push(...bl.map((x) => x.id));

  // 7. Absențe
  const abs = await ctx.db
    .insert(angajatiAbsente)
    .values([
      { orgId: ctx.orgId, angajatId: id.radu, tip: "concediu", dataStart: adauga(luni, 7), dataSfarsit: adauga(luni, 11), nota: "Concediu planificat" },
      { orgId: ctx.orgId, angajatId: id.elena, tip: "medical", dataStart: azi, dataSfarsit: adauga(azi, 2), nota: null },
      { orgId: ctx.orgId, angajatId: id.tudor, tip: "concediu", dataStart: adauga(luni, 21), dataSfarsit: adauga(luni, 32), nota: "Concediu de odihnă" },
    ])
    .returning({ id: angajatiAbsente.id });
  m.absente.push(...abs.map((x) => x.id));

  // 8. Discuții și evaluări
  const prevT = rezolvaPerioada(null, adauga(trim.start, -1));
  const intr = async (angajat: string, tip: string, zile: number, continut: Record<string, unknown>, autor: boolean) => {
    const [x] = await ctx.db.insert(kpiInteractiuni).values({ orgId: ctx.orgId, angajatId: id[angajat], autorUserId: autor ? ctx.userId : null, tip, data: tip === "checkin" ? luniSaptamanii(adauga(azi, zile)) : adauga(azi, zile), continut }).returning({ id: kpiInteractiuni.id });
    m.interactiuni.push(x.id);
  };
  await intr("eu", "checkin", 0, { realizari: "Am pus la punct calendarul campaniilor și am vorbit cu doi parteneri.", blocaje: "Aștept decizia juridică pentru contractul Alpha.", prioritate: "Raportul către consiliu." }, true);
  for (const [cine, zile, c] of [["irina", 0, { realizari: "Comunicatul e gata de aprobare; am confirmat un interviu.", blocaje: "", prioritate: "Calendarul de mulțumiri." }], ["irina", -7, { realizari: "Am finalizat calendarul T4.", blocaje: "", prioritate: "Comunicatul de presă." }], ["radu", -7, { realizari: "Am avut două întâlniri cu companii.", blocaje: "Contractul Alpha stă la juridic.", prioritate: "Închiderea contractului." }], ["elena", 0, { realizari: "Am sunat 12 donatori dormanți, 4 au promis o nouă donație.", blocaje: "", prioritate: "Curățarea datelor." }], ["ioana", -7, { realizari: "Am predat statisticile lunii.", blocaje: "Exportul de la contabilitate vine târziu.", prioritate: "Raportul pentru sponsorul Alpha." }]] as const) await intr(cine, "checkin", zile, c, false);
  await intr("irina", "1la1", -20, { subiecte: "Prioritățile T4, încărcarea lunii octombrie", decizii: "Comunicatul pentru presă trece prin aprobare.", actiuni: `Irina: calendar T4. ${numeAdmin.split(" ")[0]}: decizie bugete.`, urmatoarea: adauga(azi, 10) }, true);
  await intr("radu", "1la1", -62, { subiecte: "Pipeline companii", decizii: "Prioritizăm 5 companii mari.", actiuni: "Radu: întâlniri până la sfârșitul lunii." }, true);
  await intr("elena", "1la1", -12, { subiecte: "Reactivarea donatorilor dormanți", decizii: "Apeluri scurte, cu mulțumire.", actiuni: "Elena: 30 de apeluri pe săptămână.", urmatoarea: adauga(azi, 18) }, true);
  await intr("ioana", "1la1", -31, { subiecte: "Rapoartele de sponsor", decizii: "Format standard pentru toate rapoartele.", actiuni: "Ioana: șablon de raport." }, true);
  await intr("irina", "review_trimestrial", -5, { perioada: prevT.cod, rezumat: "Un trimestru solid: campaniile au ieșit la termen, iar relația cu presa s-a consolidat.", puncteTari: "Planificare, comunicare clară cu partenerii.", deDezvoltat: "Delegarea sarcinilor mărunte către colegi.", partajat: true, obiective: [{ titlu: "Campanii care ajung la oameni", progres: 0.94, stare: "in_grafic" }, { titlu: "Vizibilitate în presă", progres: 0.75, stare: "in_grafic" }] }, true);
  await intr("radu", "review_trimestrial", -4, { perioada: prevT.cod, rezumat: "Pipeline bun, dar contractele se închid greu.", puncteTari: "Relații bune cu companiile.", deDezvoltat: "Ritmul de urmărire după întâlniri.", partajat: false, obiective: [{ titlu: "Dezvoltăm parteneriatele cu companii", progres: 0.55, stare: "in_risc" }] }, true);
  await intr("elena", "autoevaluare", -6, { perioada: prevT.cod, ceaIesit: "Mulțumirile în 48 de ore au devenit rutină.", ceamInvatat: "Cum să deschid o convorbire cu un donator care nu a mai dat de mult.", nevoieSprijin: "Un script de bază pentru apeluri dificile." }, false);
  await intr("irina", "feedback", -8, { tipFeedback: "apreciere", text: "Comunicatul pentru campania de vară a fost clar și scurt, iar presa l-a preluat aproape neschimbat.", context: "Campania de vară" }, true);
  await intr("tudor", "feedback", -10, { tipFeedback: "sugestie", text: "La clipurile lungi, primele 10 secunde decid dacă rămân oamenii; merită un cadru de început mai puternic.", context: "Clipurile din campania de iarnă" }, true);
  await intr("irina", "obiectiv_dezvoltare", -30, { titlu: "Scrierea de cereri de finanțare", descriere: "Un curs și o cerere scrisă împreună cu un mentor.", termen: adauga(azi, 60), status: "in_curs", comentariu: "Cursul a început." }, true);
  await intr("elena", "obiectiv_dezvoltare", -15, { titlu: "Comunicare empatică la telefon", descriere: "Două ateliere și exerciții practice.", termen: adauga(azi, 90), status: "de_inceput", comentariu: "" }, true);
  await intr("ioana", "obiectiv_dezvoltare", -40, { titlu: "Tablouri de bord în Power BI", descriere: "Curs online și un tablou pentru raportul lunar.", termen: adauga(azi, 45), status: "in_curs", comentariu: "Primul tablou e în lucru." }, true);

  // 9. Notificări
  const link = `/${ctx.orgSlug}/crm/performanta`;
  await ctx.db.insert(performantaNotificari).values([
    { orgId: ctx.orgId, appUserId: ctx.userId, tip: "termen", titlu: "Termene: 3 cu termen în curând, 2 cu termenul depășit", continut: "Termen în curând:\n• Pregătește raportul trimestrial pentru consiliu\n• Revizuiește țintele din șabloanele de roluri\n\nTermen depășit:\n• Decizie: prioritățile campaniei de iarnă", link: `${link}/saptamana`, cheieDedup: "demo:n1", citit: false, createdAt: la(azi, 6) },
    { orgId: ctx.orgId, appUserId: ctx.userId, tip: "blocaj", titlu: "Un blocaj așteaptă decizia ta", continut: "Aprobarea juridică a sponsorului întârzie; fără ea nu putem semna.", link: `${link}/spatiul-meu`, cheieDedup: "demo:n2", citit: false, createdAt: la(adauga(azi, -6), 6) },
    { orgId: ctx.orgId, appUserId: ctx.userId, tip: "risc", titlu: "„Dezvoltăm parteneriatele cu companii” e în urma ritmului", continut: "Responsabil: Radu Matei. Merită o discuție despre ce ar ajuta.", link: `${link}/obiective`, cheieDedup: "demo:n3", citit: true, createdAt: la(adauga(azi, -2), 6) },
    { orgId: ctx.orgId, appUserId: ctx.userId, tip: "rezumat", titlu: "Săptămâna ta în cifre", continut: "Activități cu termen în această săptămână: 7\nRestanțe: 2\nObiective ale echipei tale în risc sau întârziate: 3", link: `${link}/spatiul-meu`, cheieDedup: "demo:n4", citit: true, createdAt: la(luni, 6) },
  ]);

  await salveazaMarcaj();
  return { ok: true, rezumat: `${m.angajati.length} persoane, ${m.obiective.length} obiective, ${m.activitati.length} activități, ${m.blocaje.length} blocaje${m.donatori ? `, ${m.donatori} donatori fictivi` : ""}.` };
}

async function scrieValoare(ctx: OrgContext, rezultatId: string, valoare: number, cand: Date, comentariu: string, incredere: "mare" | "medie" | "scazuta") {
  const pasi = [0.4, 0.75, 1];
  let anterior: number | null = null;
  for (let i = 0; i < pasi.length; i++) {
    const v = Math.round(valoare * pasi[i] * 10) / 10;
    await ctx.db.insert(rezultateActualizari).values({ orgId: ctx.orgId, rezultatId, tip: "valoare", valoare: v, valoareAnterioara: anterior, comentariu: i === pasi.length - 1 ? comentariu : null, incredere: i === pasi.length - 1 ? incredere : null, createdAt: new Date(cand.getTime() - (pasi.length - 1 - i) * 5 * 86400000) });
    anterior = v;
  }
  await ctx.db.update(rezultateCheie).set({ valoareCurenta: valoare, ultimaActualizare: cand, incredere }).where(eq(rezultateCheie.id, rezultatId));
}

// Dacă încărcarea eșuează la jumătate, ce s-a creat până atunci se șterge, ca să nu rămână date fictive pe jumătate.
async function stergeSiEroare(ctx: OrgContext, m: Marcaj, eroare: string): Promise<{ ok: false; eroare: string }> {
  await ctx.db.insert(crmKv).values({ orgId: ctx.orgId, path: CALE, data: m, updatedAt: new Date() }).onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: m, updatedAt: new Date() } });
  await stergeDemo(ctx);
  return { ok: false, eroare };
}

export async function stergeDemo(ctx: OrgContext): Promise<Rez<{ rezumat: string }>> {
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, eroare: "Datele demo le șterge un administrator." };
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CALE))).limit(1);
  const m = r?.data as Marcaj | undefined;
  if (!m) return { ok: true, rezumat: "Nu erau date demo încărcate." };
  const sterge = async <T extends { id: unknown }>(ids: string[], f: (x: string[]) => Promise<T[]>) => (ids.length ? (await f(ids)).length : 0);

  await ctx.db.delete(performantaNotificari).where(and(eq(performantaNotificari.orgId, ctx.orgId), like(performantaNotificari.cheieDedup, "demo:%")));
  await sterge(m.blocaje, (ids) => ctx.db.delete(blocaje).where(and(eq(blocaje.orgId, ctx.orgId), inArray(blocaje.id, ids))).returning({ id: blocaje.id }));
  await sterge(m.activitati, (ids) => ctx.db.delete(activitati).where(and(eq(activitati.orgId, ctx.orgId), inArray(activitati.id, ids))).returning({ id: activitati.id }));
  await ctx.db.delete(activitati).where(and(eq(activitati.orgId, ctx.orgId), like(activitati.cheieAutomatizare, "demo:%")));
  await sterge(m.interactiuni, (ids) => ctx.db.delete(kpiInteractiuni).where(and(eq(kpiInteractiuni.orgId, ctx.orgId), inArray(kpiInteractiuni.id, ids))).returning({ id: kpiInteractiuni.id }));
  await sterge(m.absente, (ids) => ctx.db.delete(angajatiAbsente).where(and(eq(angajatiAbsente.orgId, ctx.orgId), inArray(angajatiAbsente.id, ids))).returning({ id: angajatiAbsente.id }));
  const nrOb = await sterge(m.obiective, (ids) => ctx.db.delete(obiective).where(and(eq(obiective.orgId, ctx.orgId), inArray(obiective.id, ids))).returning({ id: obiective.id }));
  // KPI Library: șabloanele și definițiile (atribuirile și valorile pleacă în cascadă), apoi categoriile create de încărcare
  await sterge(m.sabloaneKpi ?? [], (ids) => ctx.db.delete(kpiSabloane).where(and(eq(kpiSabloane.orgId, ctx.orgId), inArray(kpiSabloane.id, ids))).returning({ id: kpiSabloane.id }));
  await sterge(m.definitiiKpi ?? [], (ids) => ctx.db.delete(kpiDefinitii).where(and(eq(kpiDefinitii.orgId, ctx.orgId), inArray(kpiDefinitii.id, ids))).returning({ id: kpiDefinitii.id }));
  await sterge(m.categoriiKpi ?? [], (ids) => ctx.db.delete(kpiCategorii).where(and(eq(kpiCategorii.orgId, ctx.orgId), inArray(kpiCategorii.id, ids))).returning({ id: kpiCategorii.id }));
  // KPI echipă (varianta veche): se restaurează exact ce exista înainte (sau se șterge cheia, dacă nu exista)
  for (const [path, v] of Object.entries(m.kvAnterior ?? {})) {
    if (v.existat) await ctx.db.update(crmKv).set({ data: v.anterior, updatedAt: new Date() }).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, path)));
    else await ctx.db.delete(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, path)));
  }
  await sterge(m.angajati, (ids) => ctx.db.delete(angajati).where(and(eq(angajati.orgId, ctx.orgId), inArray(angajati.id, ids))).returning({ id: angajati.id }));
  await sterge(m.roluri, (ids) => ctx.db.delete(roluri).where(and(eq(roluri.orgId, ctx.orgId), inArray(roluri.id, ids))).returning({ id: roluri.id }));
  await sterge(m.departamente, (ids) => ctx.db.delete(departments).where(and(eq(departments.orgId, ctx.orgId), inArray(departments.id, ids))).returning({ id: departments.id }));
  if (m.importId) {
    try {
      await stergeImport(ctx, m.importId);
    } catch {
      /* importul a fost șters deja */
    }
  }
  await ctx.db.delete(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CALE)));
  return { ok: true, rezumat: `Au fost șterse ${m.angajati.length} persoane, ${nrOb} obiective, ${m.activitati.length} activități${m.importId ? " și donatorii fictivi" : ""}.` };
}
