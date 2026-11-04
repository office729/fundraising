"use server";

import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { companies, prospectareCandidati, prospectareChei, prospectareJurnal } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { getLocale } from "@/lib/i18n/get-locale";
import { PROSPECTARE_DEEP_DICT } from "@/lib/i18n/dictionaries/prospectare-deep-ui";
import { traduEroareProspectare } from "@/lib/i18n/dictionaries/lib-mesaje-ui";
import {
  planAprobare,
  ruleazaCautare,
  uneste,
  type CandidatDeep,
  type IesireDeep,
  type ModCautare,
  type StareFurnizor,
} from "@/lib/prospectare/deep-search";
import { adaugaZileLucratoare, APELURI_REZERVATE_PER_CAUTARE, aziBucuresti, COOLDOWN_CAUTARE_ORE, LIMITA_APELURI_PE_ZI } from "@/lib/prospectare/limite";
import {
  alegeCandidati,
  apolloCauta,
  apolloGasesteDomeniu,
  apolloImbogateste,
  cheieNume,
  domeniuDinSite,
  etichetaRol,
  grupRol,
  hunterDomeniu,
  hunterVerifica,
  linkedinSigur,
  lushaCauta,
  lushaImbogateste,
  NUME_FURNIZOR,
  ORDINE_DESCOPERIRE,
  prenumeSiNume,
  prospeoCauta,
  prospeoImbogateste,
  SCOR_MINIM,
  scorDecident,
  waalaxyTrimite,
  type CandidatBrut,
  type FetchFn,
  type Furnizor,
} from "@/lib/prospectare/motor";
import {
  apeluriFolosite,
  candidatDinRand,
  citesteChei,
  creeazaContactDinCandidat,
  esteExclus,
  esteSuprimataOrg,
  idsValide,
  incarcaExcluderi,
  incarcaSuprimate,
  noteazaAprobarea,
  respingeCuAmprenta,
  salveazaCandidati,
  type DateAduse,
  type Excluderi,
  type RandCandidat,
} from "@/lib/prospectare/server";
import { decripteaza } from "@/lib/secret-box";
import { noteazaInvitatie } from "@/lib/waalaxy-server";

// Deep Search pentru decidenți (pachetul IMPACT, cu cheile PROPRII ale organizației). Căutarea aduce doar nume + funcție (gratuit): Apollo întâi, apoi ceilalți în paralel,
// rezultatele unite fără dubluri. Emailul și telefonul se cumpără abia la „Aprobă”, de la furnizorul care a găsit persoana, doar pentru cei bifați.
// Apelurile către furnizori se fac în afara tranzacției (withOrgFaze), ca o conexiune la baza de date să nu stea blocată cât durează.

const OPTIUNI = { modul: "prospectare-multi" as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esteAdminRol = (rol: string) => rol === "owner" || rol === "admin";
const MAX_CANDIDATI: Record<ModCautare, number> = { deep: 10, lant: 5 };
const MAX_APROBARE = 50;
const MAX_VERIFICARI = 5; // verificări Hunter pe o aprobare
const TIMP_MAX_MS = 50_000; // după atât, apelurile în curs se opresc (rezultatele de până acum se păstrează)
const msg = async () => PROSPECTARE_DEEP_DICT[await getLocale()].msg;

// ============================================================================
// Căutarea
// ============================================================================
export type RezultatDeepSearch = {
  ok: boolean;
  eroare?: string;
  stari?: StareFurnizor[];
  noi?: number; // persoane noi puse în listă
  total?: number; // câte persoane sunt acum în lista „De aprobat” a firmei
  toateMemorate?: boolean;
};

type PregatitDeep = {
  companyId: string;
  mod: ModCautare;
  firma: { nume: string; angajati: number | null };
  domeniu: string | null;
  chei: Partial<Record<Furnizor, string>>;
  furnizori: Furnizor[];
  memorate: Record<string, number>;
  existente: ReturnType<typeof candidatDinRand>[];
  excluderi: Excluderi;
  rezerva: number;
  rezervareId: string;
};

const deBrut = (c: CandidatBrut): CandidatDeep => ({
  nume: c.nume,
  rol: c.rol,
  dept: c.dept,
  linkedin: c.linkedin,
  email: c.email,
  emailStatus: c.emailStatus,
  telefon: c.telefon,
  sursa: c.sursa,
  ids: Object.fromEntries(Object.entries(c.ids ?? {}).filter((e): e is [string, string] => typeof e[1] === "string")),
  cerereLusha: c.cerereLusha,
  roConfirmat: c.roConfirmat,
  seniority: c.seniority,
});

const cautareDeep = withOrgFaze<[string, ModCautare, boolean], PregatitDeep, IesireDeep, RezultatDeepSearch>({
  opts: OPTIUNI,
  pregateste: async (ctx, companyId, mod, forteaza) => {
    const m = await msg();
    if (!UUID.test(companyId)) throw new EroareUtilizator(m.firmaNegasita);
    const [firma] = await ctx.db
      .select({ nume: companies.nume, site: companies.site, angajati: companies.nrAngajati })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
      .limit(1);
    if (!firma) throw new EroareUtilizator(m.firmaNegasita);

    const chei = await citesteChei(ctx.db, ctx.orgId);
    const furnizori = ORDINE_DESCOPERIRE.filter((f) => chei[f]);
    if (furnizori.length === 0) return { gata: { ok: false, eroare: m.nicioCheie } };

    // Același furnizor nu se plătește a doua oară pentru aceeași firmă în 24 de ore („memorat”); doar un administrator poate repeta căutarea.
    const fortat = forteaza && esteAdminRol(ctx.role);
    const existenteRanduri = await ctx.db
      .select()
      .from(prospectareCandidati)
      .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.stare, "nou")));
    const memorate: Record<string, number> = {};
    if (!fortat) {
      const recente = await ctx.db
        .selectDistinct({ p: prospectareJurnal.provider })
        .from(prospectareJurnal)
        .where(
          and(
            eq(prospectareJurnal.orgId, ctx.orgId),
            eq(prospectareJurnal.companyId, companyId),
            eq(prospectareJurnal.operatie, "cautare"),
            eq(prospectareJurnal.ok, true),
            gte(prospectareJurnal.createdAt, sql`now() - make_interval(hours => ${COOLDOWN_CAUTARE_ORE})`),
          ),
        );
      const setRecente = new Set(recente.map((r) => r.p));
      for (const f of furnizori) if (setRecente.has(f)) memorate[f] = existenteRanduri.filter((c) => c.sursa === f || (c.alteSurse ?? []).includes(f)).length;
    }
    if (mod === "deep" && furnizori.every((f) => memorate[f] !== undefined)) {
      return { gata: { ok: true, noi: 0, total: existenteRanduri.length, toateMemorate: true, stari: furnizori.map((f) => ({ furnizor: f, gasiti: memorate[f], memorat: true })) } };
    }

    // Limita zilnică: citire, verificare și rezervare într-o singură tranzacție, sub un lock pe organizație. Fără rezervare, N căutări simultane ar vedea
    // toate aceeași limită liberă și ar depăși-o împreună.
    await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtext(${ctx.orgId}))`);
    const ramase = LIMITA_APELURI_PE_ZI - (await apeluriFolosite(ctx.db, ctx.orgId));
    if (ramase <= 0) return { gata: { ok: false, eroare: m.limitaZilnica } };
    const rezerva = Math.min(ramase, APELURI_REZERVATE_PER_CAUTARE);
    const [rezervare] = await ctx.db
      .insert(prospectareJurnal)
      .values({ orgId: ctx.orgId, provider: "rezervare", operatie: "rezervare", ok: true, unitati: rezerva, companyId, userId: ctx.userId })
      .returning({ id: prospectareJurnal.id });

    const excluderi = await incarcaExcluderi(ctx.db, ctx.orgId, companyId);
    return {
      pregatit: {
        companyId,
        mod,
        firma: { nume: firma.nume, angajati: firma.angajati },
        domeniu: domeniuDinSite(firma.site) ?? domeniuDinSite(excluderi.domeniuAlternativ),
        chei,
        furnizori,
        memorate,
        existente: existenteRanduri.map(candidatDinRand),
        excluderi,
        rezerva,
        rezervareId: rezervare.id,
      },
    };
  },
  extern: async (p): Promise<IesireDeep> => {
    // O limită de timp pentru toată căutarea: apelurile rămase în urmă se opresc, iar ce s-a adunat până atunci se păstrează.
    const termen = AbortSignal.timeout(TIMP_MAX_MS);
    const f: FetchFn = (url, init) => fetch(url, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, termen]) : termen });
    const chei = p.chei;
    return ruleazaCautare(
      { firma: { nume: p.firma.nume, domeniu: p.domeniu }, furnizori: p.furnizori, memorate: p.memorate, mod: p.mod, apeluriRamase: p.rezerva },
      {
        domeniu: chei.apollo ? (nume) => apolloGasesteDomeniu(chei.apollo!, nume, f) : undefined,
        cauta: {
          apollo: chei.apollo
            ? async (firma) => {
                const r = await apolloCauta(chei.apollo!, firma, f); // căutarea în Apollo nu consumă credite
                return r.ok ? { ok: true, date: { candidati: r.date.map(deBrut), unitati: 0 } } : r;
              }
            : undefined,
          prospeo: chei.prospeo
            ? async (firma) => {
                const r = await prospeoCauta(chei.prospeo!, firma, f);
                return r.ok ? { ok: true, date: { candidati: r.date.map(deBrut), unitati: r.date.length > 0 ? 1 : 0 } } : r;
              }
            : undefined,
          hunter: chei.hunter
            ? async (firma) => {
                if (!firma.domeniu) return { ok: true, date: { candidati: [], unitati: 0 } };
                const r = await hunterDomeniu(chei.hunter!, firma.domeniu, f);
                return r.ok ? { ok: true, date: { candidati: r.date.map(deBrut), unitati: 1 } } : r;
              }
            : undefined,
          lusha: chei.lusha
            ? async (firma) => {
                const r = await lushaCauta(chei.lusha!, firma, f);
                return r.ok ? { ok: true, date: { candidati: r.date.candidati.map(deBrut), unitati: r.date.cereri } } : r;
              }
            : undefined,
        },
      },
    );
  },
  salveaza: async (ctx, p, r): Promise<RezultatDeepSearch> => {
    // Apelurile reale înlocuiesc rezervarea (care se șterge), chiar dacă nu s-a găsit nimeni: creditele s-au consumat oricum.
    await ctx.db.delete(prospectareJurnal).where(and(eq(prospectareJurnal.id, p.rezervareId), eq(prospectareJurnal.orgId, ctx.orgId)));
    if (r.apeluri.length > 0) {
      await ctx.db.insert(prospectareJurnal).values(r.apeluri.map((a) => ({ orgId: ctx.orgId, provider: a.furnizor, operatie: a.operatie, ok: a.ok, unitati: a.unitati, companyId: p.companyId, userId: ctx.userId })));
    }
    // Rândurile deja în listă se unesc cu ce a adus căutarea (nu se pierd sursele), apoi: fără cei excluși, scor minim, câte unul din fiecare rol.
    const unite = uneste([p.existente, ...r.brut.map((b) => b.candidati)]);
    const scorate: (CandidatDeep & { scor: number; prioritate: number | null; eticheta: string; alteSurse: string[] })[] = [];
    for (const c of unite) {
      const dinLista = typeof c.scor === "number";
      if (!dinLista && esteExclus(p.excluderi, ctx.orgId, p.companyId, c)) continue;
      const calculat = scorDecident(c.rol, { seniority: c.seniority, romania: Boolean(c.roConfirmat), angajati: p.firma.angajati });
      const scor = dinLista ? Math.max(c.scor ?? 0, calculat.scor) : calculat.scor;
      if (!dinLista && scor < SCOR_MINIM) continue;
      scorate.push({ ...c, scor, prioritate: dinLista ? (c.prioritate ?? calculat.prioritate) : calculat.prioritate, eticheta: etichetaRol(c.rol), alteSurse: c.alteSurse });
    }
    scorate.sort((a, b) => b.scor - a.scor || (a.prioritate ?? 9) - (b.prioritate ?? 9));
    const alesi = alegeCandidati(scorate, MAX_CANDIDATI[p.mod]);
    const noi = await salveazaCandidati(ctx.db, ctx.orgId, p.companyId, ctx.userId, alesi);
    const [{ total }] = await ctx.db
      .select({ total: count() })
      .from(prospectareCandidati)
      .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.companyId, p.companyId), eq(prospectareCandidati.stare, "nou")));
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    revalidatePath(`/${ctx.orgSlug}/crm/decidenti`);
    const locale = await getLocale();
    return { ok: true, noi, total: Number(total), stari: r.stari.map((s) => (s.eroare ? { ...s, eroare: traduEroareProspectare(s.eroare, locale) } : s)) };
  },
});

export async function cautaDeepSearch(orgSlug: string, companyId: string, mod: string, forteaza = false): Promise<RezultatDeepSearch> {
  const m = await msg();
  try {
    if (mod !== "deep" && mod !== "lant") return { ok: false, eroare: m.modInvalid };
    return await cautareDeep(orgSlug, companyId, mod, forteaza === true);
  } catch (e) {
    return { ok: false, eroare: mesajSigur(e, m.cautareEsuata, "deep-search-cautare") };
  }
}

// ============================================================================
// Aprobarea: emailul/telefonul se aduc de la furnizorul care a găsit persoana, doar pentru cei bifați
// ============================================================================
export type OptiuniAprobare = { cuTelefon?: boolean; trimiteWaalaxy?: boolean; waalaxyObligatoriu?: boolean };

export type RezultatAprobareLot = {
  ok: boolean;
  eroare?: string;
  adaugati: number;
  faraEmail: number;
  esuati: { furnizor: string; mesaj: string }[];
  ramase: string[]; // persoanele rămase în listă (furnizorul a dat eroare): pot fi reîncercate
  excluse: number; // scoase din listă: au cerut să nu mai fie contactate
  avertismente: string[];
};

const gol = (eroare?: string): RezultatAprobareLot => ({ ok: !eroare, eroare, adaugati: 0, faraEmail: 0, esuati: [], ramase: [], excluse: 0, avertismente: [] });

type WaalaxyConfig = { cheie: string; listaId: string; campanieImplicita: string; campaniiPeGrup: Record<string, string> };

type PregatitAprobare = {
  candidati: (RandCandidat & { firma: string })[];
  plan: ReturnType<typeof planAprobare>;
  chei: Partial<Record<Furnizor, string>>;
  cuTelefon: boolean;
  limitaDepasita: boolean;
  waalaxy: WaalaxyConfig | null;
  excluse: number;
};

type ExternAprobare = {
  aduse: Record<string, DateAduse>; // id candidat → ce a adus furnizorul
  esecuri: Record<string, string>; // furnizor → motivul exact
  jurnal: { furnizor: string; operatie: string; ok: boolean; unitati: number; companyId: string }[];
  waalaxy: { trimisi: string[]; eroare?: string };
};

const aprobaFaze = withOrgFaze<[string[], OptiuniAprobare], PregatitAprobare, ExternAprobare, RezultatAprobareLot>({
  opts: OPTIUNI,
  pregateste: async (ctx, ids, optiuni) => {
    const m = await msg();
    const curate = idsValide(Array.isArray(ids) ? ids : [], MAX_APROBARE);
    if (curate.length === 0) return { gata: gol(m.nicioPersoanaSelectata) };
    const randuri = await ctx.db
      .select({ c: prospectareCandidati, firma: companies.nume })
      .from(prospectareCandidati)
      .innerJoin(companies, eq(companies.id, prospectareCandidati.companyId))
      .where(and(inArray(prospectareCandidati.id, curate), eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou"), sql`${companies.deletedAt} is null`));
    if (randuri.length === 0) return { gata: gol(m.candidatNuMaiEInLista) };

    // Cine a cerut să nu mai fie propus nu se aprobă (nici dacă era deja în listă de la altă căutare): rândul se închide, rămâne doar amprenta.
    const supr = await incarcaSuprimate(ctx.db, ctx.orgId);
    const cerute = randuri.filter(({ c }) => esteSuprimataOrg(supr, c));
    const excluse = cerute.length ? await respingeCuAmprenta(ctx, cerute.map((x) => x.c)) : 0;
    const ramasi = randuri.filter((x) => !cerute.includes(x)).map(({ c, firma }) => ({ ...c, firma }));
    if (ramasi.length === 0) return { gata: { ...gol(), ok: true, excluse } };

    const cuTelefon = optiuni?.cuTelefon === true;
    const plan = planAprobare(ramasi.map((c) => ({ id: c.id, sursa: c.sursa, email: c.email, telefon: c.telefon, ids: c.ids ?? {} })), { cuTelefon });
    const chei = await citesteChei(ctx.db, ctx.orgId);

    // Limita zilnică de apeluri: dacă e depășită, doar furnizorii (nu și persoanele care nu cer nimic de cumpărat) sunt opriți.
    let limitaDepasita = false;
    if (Object.keys(plan.cumpara).length > 0) {
      await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtext(${ctx.orgId}))`);
      limitaDepasita = (await apeluriFolosite(ctx.db, ctx.orgId)) >= LIMITA_APELURI_PE_ZI;
    }

    let waalaxy: WaalaxyConfig | null = null;
    if (optiuni?.trimiteWaalaxy === true) {
      if (optiuni.waalaxyObligatoriu && ramasi.some((c) => !linkedinSigur(c.linkedin))) throw new EroareUtilizator(m.faraLinkedinValid);
      const [w] = await ctx.db.select({ enc: prospectareChei.cheieEnc, setari: prospectareChei.setari }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "waalaxy"))).limit(1);
      if (!w?.setari?.listaId) throw new EroareUtilizator(m.conecteazaWaalaxy);
      let cheie: string;
      try {
        cheie = decripteaza(w.enc);
      } catch {
        throw new EroareUtilizator(m.waalaxyIlizibila);
      }
      const campaniiPeGrup: Record<string, string> = {};
      for (const g of ["decident", "buget", "csr", "hr"]) if (w.setari[`campanie_${g}`]) campaniiPeGrup[g] = w.setari[`campanie_${g}`];
      waalaxy = { cheie, listaId: w.setari.listaId, campanieImplicita: w.setari.campanieId || "", campaniiPeGrup };
    }
    return { pregatit: { candidati: ramasi, plan, chei, cuTelefon, limitaDepasita, waalaxy, excluse } };
  },
  extern: async (p): Promise<ExternAprobare> => {
    const m = await msg();
    const locale = await getLocale();
    const termen = AbortSignal.timeout(TIMP_MAX_MS);
    const f: FetchFn = (url, init) => fetch(url, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, termen]) : termen });
    const dupaId = new Map(p.candidati.map((c) => [c.id, c]));
    const aduse: Record<string, DateAduse> = {};
    const esecuri: Record<string, string> = {};
    const jurnal: ExternAprobare["jurnal"] = [];
    const goale = (c: RandCandidat): DateAduse => ({ email: "", emailStatus: null, telefon: "", linkedin: c.linkedin ?? "" });

    // Fiecare furnizor separat și în paralel: o eroare la unul nu le pierde pe celelalte.
    await Promise.all(
      Object.entries(p.plan.cumpara).map(async ([furnizor, idsCand]) => {
        const nume = NUME_FURNIZOR[furnizor as Furnizor] ?? furnizor;
        const cheie = p.chei[furnizor as Furnizor];
        if (!cheie) {
          esecuri[furnizor] = m.cheiaLipseste(nume);
          return;
        }
        if (p.limitaDepasita) {
          esecuri[furnizor] = m.limitaZilnica;
          return;
        }
        const cand = idsCand.map((id) => dupaId.get(id)!).filter(Boolean);
        const esec = (eroare: string) => {
          esecuri[furnizor] = traduEroareProspectare(eroare, locale);
          jurnal.push({ furnizor, operatie: "email", ok: false, unitati: 0, companyId: cand[0].companyId });
        };
        if (furnizor === "apollo") {
          const r = await apolloImbogateste(cheie, cand.map((c) => c.ids.apollo), f);
          if (!r.ok) return esec(r.eroare);
          for (const c of cand) aduse[c.id] = { ...goale(c), email: r.date[c.ids.apollo] ?? "" };
          jurnal.push({ furnizor, operatie: "email", ok: true, unitati: Object.keys(r.date).length, companyId: cand[0].companyId });
        } else if (furnizor === "prospeo") {
          const r = await prospeoImbogateste(cheie, cand.map((c) => c.ids.prospeo), f, { mobil: p.cuTelefon });
          if (!r.ok) return esec(r.eroare);
          for (const c of cand) {
            const g = r.date[c.ids.prospeo];
            aduse[c.id] = { ...goale(c), email: g?.email ?? "", emailStatus: g?.verificat ? "valid" : null, telefon: g?.telefon ?? "" };
          }
          jurnal.push({ furnizor, operatie: "email", ok: true, unitati: Object.keys(r.date).length, companyId: cand[0].companyId });
        } else if (furnizor === "lusha") {
          // Lusha leagă îmbogățirea de cererea de căutare: un lot pe cerere; fără cerere salvată nu se poate.
          const peCerere = new Map<string, typeof cand>();
          for (const c of cand) if (c.cerereLusha) peCerere.set(c.cerereLusha, [...(peCerere.get(c.cerereLusha) ?? []), c]);
          if (peCerere.size === 0) return esec(m.lushaFaraCerere);
          let gasite = 0;
          for (const [cerere, grup] of peCerere) {
            const r = await lushaImbogateste(cheie, cerere, grup.map((c) => c.ids.lusha), f);
            if (!r.ok) return esec(r.eroare);
            for (const c of grup) {
              const g = r.date.find((x) => cheieNume(x.nume) === cheieNume(c.nume));
              aduse[c.id] = { ...goale(c), email: g?.email ?? "", telefon: g?.telefon ?? "", linkedin: linkedinSigur(g?.linkedin) || (c.linkedin ?? "") };
              if (g?.email) gasite++;
            }
          }
          jurnal.push({ furnizor, operatie: "email", ok: true, unitati: gasite, companyId: cand[0].companyId });
        }
      }),
    );

    // Verificarea emailului (Hunter), doar pentru adresele aduse acum și neverificate de furnizor.
    if (p.chei.hunter && !p.limitaDepasita) {
      let verificari = MAX_VERIFICARI;
      for (const [id, d] of Object.entries(aduse)) {
        if (!d.email || d.emailStatus || verificari <= 0) continue;
        verificari--;
        const r = await hunterVerifica(p.chei.hunter, d.email, f);
        jurnal.push({ furnizor: "hunter", operatie: "verificare", ok: r.ok, unitati: r.ok ? 1 : 0, companyId: dupaId.get(id)!.companyId });
        if (r.ok) aduse[id] = { ...d, emailStatus: r.date };
      }
    }

    // Waalaxy: persoanele cu profil LinkedIn valid, pe campania rolului lor. Cele al căror furnizor a căzut nu se trimit (rămân în listă).
    const waalaxy: ExternAprobare["waalaxy"] = { trimisi: [] };
    if (p.waalaxy) {
      const peCampanie = new Map<string, (typeof p.candidati)[number][]>();
      for (const c of p.candidati) {
        const necumparat = Object.entries(p.plan.cumpara).some(([fz, idsC]) => esecuri[fz] && idsC.includes(c.id));
        if (necumparat || !linkedinSigur(c.linkedin)) continue;
        const grup = grupRol(c.prioritate);
        const campanie = (grup !== "altul" && p.waalaxy.campaniiPeGrup[grup]) || p.waalaxy.campanieImplicita;
        peCampanie.set(campanie, [...(peCampanie.get(campanie) ?? []), c]);
      }
      for (const [campanie, lista] of peCampanie) {
        const r = await waalaxyTrimite(
          p.waalaxy.cheie,
          {
            listaId: p.waalaxy.listaId,
            campanieId: campanie || undefined,
            prospecti: lista.map((c) => {
              const { prenume, nume } = prenumeSiNume(c.nume);
              return { linkedinUrl: linkedinSigur(c.linkedin), prenume, nume, firma: c.firma, rol: c.rol ?? undefined };
            }),
          },
          f,
        );
        if (r.ok) waalaxy.trimisi.push(...lista.map((c) => `${c.id}|${campanie}`));
        else waalaxy.eroare = traduEroareProspectare(r.eroare, locale);
      }
    }
    return { aduse, esecuri, jurnal, waalaxy };
  },
  salveaza: async (ctx, p, x): Promise<RezultatAprobareLot> => {
    const m = await msg();
    if (x.jurnal.length > 0) {
      await ctx.db.insert(prospectareJurnal).values(x.jurnal.map((j) => ({ orgId: ctx.orgId, provider: j.furnizor, operatie: j.operatie, ok: j.ok, unitati: j.unitati, companyId: j.companyId, userId: ctx.userId })));
    }
    const trimisi = new Map(x.waalaxy.trimisi.map((t) => [t.split("|")[0], t.split("|")[1] ?? ""]));
    const rezultat: RezultatAprobareLot = { ...gol(), excluse: p.excluse };
    const furnizoriCazuti = new Set(Object.keys(x.esecuri));
    const cuCumparare = new Set(Object.values(p.plan.cumpara).flat());
    for (const c of p.candidati) {
      // Furnizorul care trebuia să aducă emailul a dat eroare: persoana rămâne în listă, pentru reîncercare.
      if (cuCumparare.has(c.id) && furnizoriCazuti.has(c.sursa)) {
        rezultat.ramase.push(c.id);
        continue;
      }
      const adus = x.aduse[c.id];
      const email = adus?.email || c.email || "";
      const date: DateAduse = {
        email,
        emailStatus: adus?.email ? adus.emailStatus : c.emailStatus,
        telefon: adus?.telefon || c.telefon || "",
        linkedin: adus?.linkedin || c.linkedin || "",
      };
      // Poarta atomică: doar cine trece rândul din „nou” în „aprobat” continuă; un al doilea apel simultan nu găsește nimic și se oprește.
      const [aprobat] = await ctx.db
        .update(prospectareCandidati)
        .set({
          stare: "aprobat",
          hotaratDe: ctx.userId,
          hotaratLa: new Date(),
          responsabilId: ctx.userId,
          stadiu: "de_contactat",
          urmatorPasLa: adaugaZileLucratoare(aziBucuresti(), 2),
          email: date.emailStatus === "invalid" ? null : email || null,
          emailStatus: email && date.emailStatus !== "invalid" ? date.emailStatus : null,
          telefon: date.telefon || null,
        })
        .where(and(eq(prospectareCandidati.id, c.id), eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou")))
        .returning();
      if (!aprobat) continue;
      const { contactId, nou } = await creeazaContactDinCandidat(ctx, aprobat, date);
      await ctx.db.update(prospectareCandidati).set({ contactId }).where(eq(prospectareCandidati.id, aprobat.id));
      if (nou) {
        await noteazaAprobarea(ctx, aprobat);
        if (!email || date.emailStatus === "invalid") rezultat.faraEmail++;
      }
      // Ajunsă în Waalaxy, persoana e „invitat” (pâlnia și listele de urmărit pornesc de aici); răspunsurile vin apoi prin webhook.
      const campanie = trimisi.get(c.id);
      if (campanie !== undefined) await noteazaInvitatie(ctx.db, ctx.orgId, { contactId, companyId: aprobat.companyId, campanie: campanie || null });
      await inregistreazaAudit(ctx.db, {
        orgId: ctx.orgId,
        actorAppUserId: ctx.userId,
        actiune: "prospectare_candidat_aprobat",
        entitate: "contact",
        entitateId: contactId,
        detalii: { sursa: c.sursa, waalaxy: p.waalaxy ? (campanie !== undefined ? "trimis" : "nu") : "nu", telefon: Boolean(date.telefon) },
      });
      rezultat.adaugati++;
    }
    rezultat.esuati = Object.entries(x.esecuri).map(([furnizor, mesaj]) => ({ furnizor: NUME_FURNIZOR[furnizor as Furnizor] ?? furnizor, mesaj }));
    if (x.waalaxy.eroare) rezultat.avertismente.push(m.waalaxyNeajuns(x.waalaxy.eroare));
    rezultat.ok = rezultat.adaugati > 0 || rezultat.esuati.length === 0;
    if (!rezultat.ok) rezultat.eroare = rezultat.esuati.map((e) => `${e.furnizor}: ${e.mesaj}`).join(" · ");
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    revalidatePath(`/${ctx.orgSlug}/crm/decidenti`);
    return rezultat;
  },
});

export async function aprobaCandidatiAction(orgSlug: string, ids: string[], optiuni: OptiuniAprobare = {}): Promise<RezultatAprobareLot> {
  const m = await msg();
  try {
    return await aprobaFaze(orgSlug, ids, { cuTelefon: optiuni?.cuTelefon === true, trimiteWaalaxy: optiuni?.trimiteWaalaxy === true, waalaxyObligatoriu: optiuni?.waalaxyObligatoriu === true });
  } catch (e) {
    return gol(mesajSigur(e, m.nuAmPututAdauga, "prospectare-aprobare"));
  }
}

// Respingerea în lot (și o singură persoană): rândurile își pierd datele personale, rămâne doar amprenta în lista „nu mai căuta” a firmei.
export async function respingeCandidatiAction(orgSlug: string, ids: string[]): Promise<{ error: string | null; respinsi: number }> {
  const m = await msg();
  try {
    const respinsi = await respingeFaze(orgSlug, ids);
    return { error: null, respinsi };
  } catch (e) {
    return { error: mesajSigur(e, m.nuAmPututRespinge, "prospectare-respingere-lot"), respinsi: 0 };
  }
}

const respingeFaze = withOrgSession(async (ctx, ids: string[]): Promise<number> => {
  const curate = idsValide(Array.isArray(ids) ? ids : [], MAX_APROBARE);
  if (curate.length === 0) return 0;
  const randuri = await ctx.db
    .select()
    .from(prospectareCandidati)
    .where(and(inArray(prospectareCandidati.id, curate), eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou")));
  const n = await respingeCuAmprenta(ctx, randuri);
  revalidatePath(`/${ctx.orgSlug}/crm/companii`);
  revalidatePath(`/${ctx.orgSlug}/crm/decidenti`);
  return n;
}, OPTIUNI);
