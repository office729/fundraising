import "server-only";

import { randomBytes } from "node:crypto";

import { sql, type SQL } from "drizzle-orm";

import { amprentaInfluencerNoua, amprentaInfluencerVeche } from "@/lib/amprente-hmac";
import type { OrgContext } from "@/lib/auth/guard";
import { conditieSqlDistribuibil } from "@/lib/campanii/distribuibil";
import { patternLike, sqlFaraDiacritice } from "@/lib/cautare";
import { EroareUtilizator } from "@/lib/erori";
import { getTr } from "@/lib/i18n/tr-server";
import { gasesteJudet } from "@/lib/judete";
import { sqlArray } from "@/lib/sql-array";

import { judetDin } from "./judet";
import {
  blocatDeColega,
  cheiNormalizate,
  codDinOcteti,
  construiesteSlugLink,
  curataSetari,
  curataUrmaritori,
  dupaTrimitere,
  dupaVerificareFaraRaspuns,
  ETAPE_FARA_CONTACT,
  esteCanal,
  esteCategorie,
  esteEtapa,
  esteUuid,
  listaChei,
  normEmail,
  numeDinContacte,
  PLATFORME,
  PLATFORME_CHEI,
  text,
  ordoneazaInfluenceri,
  type Canal,
  type ContacteInfluencer,
  type FiltreLista,
  type SetariUrmarire,
  type TipActivitate,
} from "./reguli";
import type {
  Activitate,
  CampuriInfluencer,
  CazDistribuibil,
  Coordonare,
  Fisa,
  Influencer,
  LinkInfluencer,
  Membru,
  RandLista,
  RezultatImport,
  RezultatSalvare,
  StareAzi,
} from "./tipuri";

// Influenceri — interogările și scrierile modulului. Rulează pe `ctx.db` (tranzacția organizației, cu RLS); org_id e filtrat și explicit în fiecare interogare.
// Regulile stau în reguli.ts (pure, testate). Nimic de aici nu trimite un mesaj: „trimis” se marchează doar când colega apasă „Am trimis”.

type Db = OrgContext["db"];
type Brut = Record<string, unknown>;
const rows = <T = Brut>(r: unknown): T[] => r as T[];

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const intreg = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
function jsonObiect(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

// Eroarea cerută de coordonare: altă colegă a scris recent, iar colega curentă nu a confirmat că preia contactarea.
export class EroareCoordonare extends EroareUtilizator {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "EroareCoordonare";
  }
}

// Codul erorii Postgres (23505 = încălcare de unicitate), indiferent dacă driverul o împachetează sau nu.
function codDb(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const o = e as { code?: unknown; cause?: unknown };
  if (typeof o.code === "string") return o.code;
  return o.cause ? codDb(o.cause) : null;
}

// ───────── Coloane și filtre ─────────

const COL_LISTA = sql`
  i.id::text as id, i.nume_public as "numePublic", i.foto_url as "fotoUrl", i.instagram, i.facebook, i.tiktok, i.youtube, i.urmaritori,
  i.categorie, i.oras, i.judet, i.tara, i.etapa, i.responsabil_id::text as "responsabilId",
  coalesce(nullif(ur.name, ''), split_part(ur.email, '@', 1)) as responsabil,
  i.nu_contacta as "nuContacta", i.ultima_contactare as "ultimaContactare",
  (select coalesce(nullif(u2.name, ''), split_part(u2.email, '@', 1)) from influenceri_activitati a2 left join app_users u2 on u2.id = a2.user_id
     where a2.influencer_id = i.id and a2.tip = 'mesaj_trimis' order by a2.created_at desc limit 1) as "ultimulContactDe",
  i.follow_up_la as "followUpLa", i.follow_up_tip as "followUpTip", i.follow_up_nota as "followUpNota", i.nr_reveniri as "nrReveniri",
  i.caz_id::text as "cazId", p.titlu as caz, i.updated_at as "actualizatLa"`;
const DIN = sql`from influenceri i left join app_users ur on ur.id = i.responsabil_id left join fundraising_pages p on p.id = i.caz_id`;

function dinRand(r: Brut): RandLista {
  return {
    id: String(r.id),
    numePublic: String(r.numePublic ?? ""),
    fotoUrl: str(r.fotoUrl),
    instagram: str(r.instagram),
    facebook: str(r.facebook),
    tiktok: str(r.tiktok),
    youtube: str(r.youtube),
    urmaritori: curataUrmaritori(jsonObiect(r.urmaritori)),
    categorie: String(r.categorie ?? "lifestyle"),
    oras: str(r.oras),
    judet: str(r.judet),
    tara: str(r.tara),
    etapa: String(r.etapa ?? "identificat"),
    responsabilId: str(r.responsabilId),
    responsabil: str(r.responsabil),
    nuContacta: Boolean(r.nuContacta),
    ultimaContactare: iso(r.ultimaContactare),
    ultimulContactDe: str(r.ultimulContactDe),
    followUpLa: iso(r.followUpLa),
    followUpTip: str(r.followUpTip),
    followUpNota: str(r.followUpNota),
    nrReveniri: intreg(r.nrReveniri),
    cazId: str(r.cazId),
    caz: str(r.caz),
    actualizatLa: iso(r.actualizatLa) ?? new Date(0).toISOString(),
  };
}

const AZI_RO = sql`(now() at time zone 'Europe/Bucharest')::date`;
const SCADENT = sql`i.follow_up_la is not null and (i.follow_up_la at time zone 'Europe/Bucharest')::date <= ${AZI_RO} and not i.nu_contacta`;
const LIMITA_LISTA = 2000;

export async function listaInfluenceri(db: Db, orgId: string, f: FiltreLista): Promise<{ randuri: RandLista[]; trunchiat: boolean }> {
  const conditii: SQL[] = [sql`i.org_id = ${orgId}`];
  if (f.q) conditii.push(sql`${sqlFaraDiacritice(sql`concat_ws(' ', i.nume_public, i.nume, i.instagram, i.facebook, i.tiktok, i.youtube, i.domeniu, i.oras, i.judet, i.tara, i.email, i.public_tinta, i.note)`)} like ${patternLike(f.q)}`);
  if (f.categorie) conditii.push(sql`i.categorie = ${f.categorie}`);
  if (f.etapa) conditii.push(sql`i.etapa = ${f.etapa}`);
  if (f.responsabil === "fara") conditii.push(sql`i.responsabil_id is null`);
  else if (f.responsabil && RE_UUID_FILTRU.test(f.responsabil)) conditii.push(sql`i.responsabil_id = ${f.responsabil}::uuid`);
  // Filtrele vin din browser: un id care nu e uuid se ignoră (altfel cast-ul ar da eroare 500).
  if (f.caz && RE_UUID_FILTRU.test(f.caz)) conditii.push(sql`i.caz_id = ${f.caz}::uuid`);
  // Țara scrisă oricum („romania”, „ROMÂNIA ”, „Romînia”, „RO”) rămâne România; doar restul e diaspora.
  const romania = sql`${sqlFaraDiacritice(sql`trim(coalesce(nullif(trim(i.tara), ''), 'România'))`)} in ('romania', 'ro')`;
  if (f.judet === "diaspora") conditii.push(sql`not (${romania})`);
  else if (f.judet === "fara") conditii.push(sql`i.judet is null and ${romania}`);
  else if (f.judet) {
    const j = gasesteJudet(f.judet);
    conditii.push(j ? sql`i.judet = ${j}` : sql`false`);
  }
  // Numele coloanei și al cheii vin dintr-o listă albă, deci pot fi scrise direct în SQL.
  const plat = f.platforma && PLATFORME_CHEI.includes(f.platforma) ? f.platforma : null;
  const urmPlat = plat ? sql.raw(`coalesce((i.urmaritori->>'${plat}')::bigint, 0)`) : null;
  if (plat) conditii.push(sql`coalesce(${sql.raw(`i.${plat}`)}, '') <> ''`);
  if (f.urmMin) {
    conditii.push(
      urmPlat
        ? sql`${urmPlat} >= ${f.urmMin}`
        : sql`greatest(${sql.join(PLATFORME_CHEI.map((k) => sql.raw(`coalesce((i.urmaritori->>'${k}')::bigint, 0)`)), sql`, `)}) >= ${f.urmMin}`,
    );
  }
  if (f.scadente) conditii.push(SCADENT);
  const ordine = urmPlat ? sql`${urmPlat} desc, i.updated_at desc` : sql`i.updated_at desc`;
  const r = rows(await db.execute(sql`select ${COL_LISTA} ${DIN} where ${sql.join(conditii, sql` and `)} order by ${ordine} limit ${LIMITA_LISTA + 1}`));
  const trunchiat = r.length > LIMITA_LISTA;
  const randuri = r.slice(0, LIMITA_LISTA).map(dinRand);
  // Aceeași ordine ca în SQL, scrisă o singură dată în regulile pure (și testată acolo).
  return { randuri: ordoneazaInfluenceri(randuri, plat), trunchiat };
}

export async function numarScadente(db: Db, orgId: string): Promise<number> {
  const [r] = rows(await db.execute(sql`select count(*)::int as n from influenceri i where i.org_id = ${orgId} and ${SCADENT}`));
  return intreg(r?.n);
}

export async function listaMembri(db: Db, orgId: string): Promise<Membru[]> {
  const r = rows(
    await db.execute(sql`
      select u.id::text as id, coalesce(nullif(u.name, ''), split_part(u.email, '@', 1)) as nume
      from memberships m join app_users u on u.id = m.user_id
      where m.org_id = ${orgId} order by 2`),
  );
  return r.map((x) => ({ id: String(x.id), nume: String(x.nume ?? "") }));
}

// Campaniile care pot fi distribuite public: active, cu acordul de publicare, neanonimizate, cu acordul neretras și (la minori) cu acordul părintelui — regula din lib/campanii/distribuibil.ts.
export async function cazuriDistribuibile(db: Db, orgId: string, id?: string): Promise<CazDistribuibil[]> {
  const r = rows(
    await db.execute(sql`
      select p.id::text as id, p.slug, p.titlu, p.judet, p.suma_tinta as "sumaTinta", p.suma_stransa as "sumaStransa"
      from fundraising_pages p
      where p.org_id = ${orgId} and ${sql.raw(conditieSqlDistribuibil("p"))} ${id ? sql`and p.id = ${id}::uuid` : sql``}
      order by p.titlu`),
  );
  return r.map((x) => {
    const tinta = x.sumaTinta === null || x.sumaTinta === undefined ? null : intreg(x.sumaTinta);
    return { id: String(x.id), slug: String(x.slug), titlu: String(x.titlu), judet: str(x.judet), ramasLei: tinta && tinta > 0 ? Math.max(0, tinta - intreg(x.sumaStransa)) : null };
  });
}

// ───────── Setări și starea zilei ─────────

const CALE_SETARI = "influenceri/setari";
const caleTinta = (userId: string) => `influenceri/tinta/${userId}`;

export async function citesteSetari(db: Db, orgId: string): Promise<SetariUrmarire> {
  const [r] = rows(await db.execute(sql`select data from crm_kv where org_id = ${orgId} and path = ${CALE_SETARI} limit 1`));
  const d = jsonObiect(r?.data);
  return curataSetari(d && typeof d === "object" ? (d as Record<string, unknown>) : null);
}

export async function salveazaSetari(db: Db, orgId: string, s: SetariUrmarire): Promise<void> {
  const curat = curataSetari(s);
  await db.execute(sql`
    insert into crm_kv (org_id, path, data, updated_at) values (${orgId}, ${CALE_SETARI}, ${JSON.stringify(curat)}::text::jsonb, now())
    on conflict (org_id, path) do update set data = excluded.data, updated_at = now()`);
}

// Ținta zilnică personală: o stabilește doar cine o vrea (fără țintă, nu se arată nicio comparație).
export async function stareAzi(db: Db, orgId: string, userId: string): Promise<StareAzi> {
  const [n] = rows(
    await db.execute(sql`
      select count(*)::int as n from influenceri
      where org_id = ${orgId} and created_by = ${userId}::uuid and (created_at at time zone 'Europe/Bucharest')::date = ${AZI_RO}`),
  );
  const [t] = rows(await db.execute(sql`select data from crm_kv where org_id = ${orgId} and path = ${caleTinta(userId)} limit 1`));
  const d = jsonObiect(t?.data);
  const tinta = d && typeof d === "object" ? Math.round(Number((d as { zi?: unknown }).zi)) : NaN;
  return { identificate: intreg(n?.n), tinta: Number.isFinite(tinta) && tinta >= 1 ? Math.min(tinta, 1000) : null };
}

export async function salveazaTinta(db: Db, orgId: string, userId: string, zi: number | null): Promise<void> {
  if (zi === null || !Number.isFinite(zi) || zi < 1) {
    await db.execute(sql`delete from crm_kv where org_id = ${orgId} and path = ${caleTinta(userId)}`);
    return;
  }
  await db.execute(sql`
    insert into crm_kv (org_id, path, data, updated_at) values (${orgId}, ${caleTinta(userId)}, ${JSON.stringify({ zi: Math.min(Math.round(zi), 1000) })}::text::jsonb, now())
    on conflict (org_id, path) do update set data = excluded.data, updated_at = now()`);
}

// ───────── Istoric (jurnal de audit) ─────────

async function noteaza(db: Db, orgId: string, influencerId: string, tip: TipActivitate, userId: string | null, x: { canal?: string | null; text?: string | null; cazId?: string | null } = {}): Promise<void> {
  await db.execute(sql`
    insert into influenceri_activitati (org_id, influencer_id, tip, canal, text, caz_id, user_id)
    values (${orgId}, ${influencerId}::uuid, ${tip}, ${x.canal ?? null}, ${x.text ? x.text.slice(0, 4000) : null}, ${x.cazId && esteUuid(x.cazId) ? x.cazId : null}::uuid, ${userId}::uuid)`);
}

// ───────── Excluderi (ștergere la cerere / nu mai contactăm) ─────────

// GDPR: amprenta e HMAC cu ORG_SECRETS_KEY (nu se ghicește dintr-un dicționar de handle-uri / emailuri). Scrierile folosesc doar forma nouă; la verificare se caută și forma veche
// (SHA-256 simplu, 32 de caractere), ca excluderile existente să rămână valabile.
const amprenteDeVerificat = (orgId: string, cheie: string): string[] => [amprentaInfluencerNoua(orgId, cheie), amprentaInfluencerVeche(orgId, cheie)];

async function incarcaExcluderi(db: Db, orgId: string, chei?: string[]): Promise<Set<string>> {
  if (chei && chei.length === 0) return new Set();
  const r = rows(
    await db.execute(
      chei
        ? sql`select amprenta from influenceri_excluderi where org_id = ${orgId} and amprenta = any(${sqlArray(chei.flatMap((k) => amprenteDeVerificat(orgId, k)))})`
        : sql`select amprenta from influenceri_excluderi where org_id = ${orgId}`,
    ),
  );
  return new Set(r.map((x) => String(x.amprenta)));
}

// Cel puțin una dintre chei e pe lista de excludere (forma nouă sau cea veche). Folosit la salvarea unui profil nou; import-ul citește lista o singură dată pentru tot lotul.
export async function profilExclus(db: Db, orgId: string, chei: string[]): Promise<boolean> {
  return sunteExcluse(orgId, chei, await incarcaExcluderi(db, orgId, chei));
}

const sunteExcluse = (orgId: string, chei: string[], excluderi: Set<string>) => chei.some((k) => amprenteDeVerificat(orgId, k).some((h) => excluderi.has(h)));

async function adaugaExcluderi(db: Db, orgId: string, chei: string[], motiv: "stergere" | "nu_mai_contactam"): Promise<void> {
  for (const k of chei) {
    await db.execute(sql`insert into influenceri_excluderi (org_id, amprenta, motiv) values (${orgId}, ${amprentaInfluencerNoua(orgId, k)}, ${motiv}) on conflict (org_id, amprenta) do nothing`);
  }
}

// ───────── Fișa ─────────

async function donatiiPeSluguri(db: Db, orgId: string, sluguri: string[]): Promise<Map<string, { n: number; suma: number }>> {
  const m = new Map<string, { n: number; suma: number }>();
  if (sluguri.length === 0) return m;
  // Doar donațiile ÎNCASATE (status „reusita”) care poartă exact slugul linkului în utm_campaign; o donație are un singur rând de atribuire, deci nu se dublează.
  // Suma e după rambursările parțiale. Nu există nicio atribuire estimativă.
  const r = rows(
    await db.execute(sql`
      select a.utm_campaign as slug, count(*)::int as n, coalesce(sum(greatest(d.suma - d.suma_rambursata, 0)), 0)::bigint as suma
      from donatie_atribuiri a
      join fundraising_donations d on d.id = a.donatie_id and d.org_id = a.org_id
      where a.org_id = ${orgId} and d.org_id = ${orgId} and d.status = 'reusita' and a.utm_campaign = any(${sqlArray(sluguri)})
      group by a.utm_campaign`),
  );
  for (const x of r) m.set(String(x.slug), { n: intreg(x.n), suma: intreg(x.suma) });
  return m;
}

export function adresaLink(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/r/${slug}`;
}

export async function citesteCoordonare(db: Db, orgId: string, influencerId: string, userId: string, zile: number): Promise<Coordonare | null> {
  if (zile <= 0) return null;
  const [r] = rows(
    await db.execute(sql`
      select coalesce(nullif(u.name, ''), split_part(u.email, '@', 1)) as nume, a.created_at as la, a.user_id::text as "userId"
      from influenceri_activitati a left join app_users u on u.id = a.user_id
      where a.org_id = ${orgId} and a.influencer_id = ${influencerId}::uuid and a.tip = 'mesaj_trimis' and a.user_id is not null
      order by a.created_at desc limit 1`),
  );
  if (!r) return null;
  const la = new Date(String(iso(r.la)));
  return blocatDeColega({ userId: str(r.userId), la }, userId, new Date(), zile) ? { nume: str(r.nume), la: la.toISOString() } : null;
}

export async function citesteFisa(db: Db, orgId: string, id: string, userId: string, siteUrl: string, setari: SetariUrmarire): Promise<Fisa | null> {
  if (!esteUuid(id)) return null;
  const [r] = rows(
    await db.execute(sql`
      select ${COL_LISTA}, i.nume, i.email, i.telefon, i.domeniu, i.public_tinta as "publicTinta", i.sursa_date as "sursaDate", i.temei_legal as "temeiLegal", i.note,
        i.nu_contacta_motiv as "nuContactaMotiv", i.ultimul_raspuns as "ultimulRaspuns", i.acord_public as "acordPublic", i.created_at as "creatLa"
      ${DIN} where i.org_id = ${orgId} and i.id = ${id}::uuid`),
  );
  if (!r) return null;
  const inf: Influencer = {
    ...dinRand(r),
    nume: str(r.nume),
    email: str(r.email),
    telefon: str(r.telefon),
    domeniu: str(r.domeniu),
    publicTinta: str(r.publicTinta),
    sursaDate: String(r.sursaDate ?? ""),
    temeiLegal: String(r.temeiLegal ?? ""),
    note: str(r.note),
    nuContactaMotiv: str(r.nuContactaMotiv),
    ultimulRaspuns: iso(r.ultimulRaspuns),
    acordPublic: Boolean(r.acordPublic),
    creatLa: iso(r.creatLa) ?? new Date(0).toISOString(),
  };
  const act = rows(
    await db.execute(sql`
      select a.id::text as id, a.tip, a.canal, a.text, p.titlu as caz, coalesce(nullif(u.name, ''), split_part(u.email, '@', 1)) as "user", a.created_at as la
      from influenceri_activitati a left join app_users u on u.id = a.user_id left join fundraising_pages p on p.id = a.caz_id
      where a.org_id = ${orgId} and a.influencer_id = ${id}::uuid order by a.created_at desc limit 200`),
  );
  const activitati: Activitate[] = act.map((a) => ({ id: String(a.id), tip: String(a.tip), canal: str(a.canal), text: str(a.text), caz: str(a.caz), user: str(a.user), la: iso(a.la) ?? "" }));
  const lk = rows(
    await db.execute(sql`
      select l.id::text as id, p.titlu as caz, l.caz_id::text as "cazId", l.slug, l.platforma, coalesce(sum(c.nr), 0)::int as clicuri
      from influenceri_linkuri l join fundraising_pages p on p.id = l.caz_id left join influenceri_clicuri c on c.link_id = l.id
      where l.org_id = ${orgId} and l.influencer_id = ${id}::uuid
      group by l.id, p.titlu order by l.created_at desc`),
  );
  const don = await donatiiPeSluguri(db, orgId, lk.map((x) => String(x.slug)));
  const linkuri: LinkInfluencer[] = lk.map((x) => ({
    id: String(x.id),
    caz: String(x.caz),
    cazId: String(x.cazId),
    slug: String(x.slug),
    platforma: String(x.platforma),
    url: adresaLink(siteUrl, String(x.slug)),
    clicuri: intreg(x.clicuri),
    donatii: don.get(String(x.slug))?.n ?? 0,
    sumaLei: don.get(String(x.slug))?.suma ?? 0,
  }));
  return { inf, activitati, linkuri, coordonare: await citesteCoordonare(db, orgId, id, userId, setari.blocareColegZile) };
}

// ───────── Validare și salvare ─────────

type Mesaj = (ro: string, en: string) => string;

type CampuriCurate = {
  nume: string | null;
  numePublic: string;
  fotoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  urmaritori: string; // JSON
  categorie: string;
  domeniu: string | null;
  publicTinta: string | null;
  oras: string | null;
  judet: string | null;
  tara: string;
  email: string | null;
  telefon: string | null;
  sursaDate: string;
  temeiLegal: string;
  responsabilId: string | null;
  cazId: string | null;
  note: string | null;
  acordPublic: boolean;
};

const TEMEI_IMPLICIT = "interes legitim — profil public, contact profesional";

async function curataCampuri(db: Db, orgId: string, c: CampuriInfluencer, t: Mesaj, sursaImplicita = "manual"): Promise<CampuriCurate> {
  const contacte: ContacteInfluencer = { instagram: text(c.instagram, 300), facebook: text(c.facebook, 300), tiktok: text(c.tiktok, 300), youtube: text(c.youtube, 300), email: text(c.email, 200) };
  const n = cheiNormalizate(contacte);
  // Un profil scris, dar nerecunoscut, nu se salvează pe jumătate: colega îl corectează (altfel dubla n-ar mai fi prinsă).
  if (contacte.instagram && !n.instagram) throw new EroareUtilizator(t("Profilul de Instagram nu e recunoscut. Scrie @nume sau linkul profilului (nu al unei postări).", "The Instagram profile is not recognised. Write @name or the profile link (not a post link)."));
  if (contacte.facebook && !n.facebook) throw new EroareUtilizator(t("Profilul de Facebook nu e recunoscut. Scrie linkul paginii sau al profilului (de exemplu facebook.com/nume sau profile.php?id=…).", "The Facebook profile is not recognised. Write the page or profile link (for example facebook.com/name or profile.php?id=…)."));
  if (contacte.tiktok && !n.tiktok) throw new EroareUtilizator(t("Profilul de TikTok nu e recunoscut. Scrie @nume sau linkul tiktok.com/@nume.", "The TikTok profile is not recognised. Write @name or the tiktok.com/@name link."));
  if (contacte.youtube && !n.youtube) throw new EroareUtilizator(t("Canalul de YouTube nu e recunoscut. Scrie @nume sau linkul canalului (youtube.com/@nume sau /channel/…).", "The YouTube channel is not recognised. Write @name or the channel link (youtube.com/@name or /channel/…)."));
  if (contacte.email && !normEmail(contacte.email)) throw new EroareUtilizator(t("Adresa de email nu e validă.", "The email address is not valid."));
  const numePublic = text(c.numePublic, 160) ?? text(c.nume, 160) ?? numeDinContacte(contacte);
  if (!numePublic) throw new EroareUtilizator(t("Completează numele public sau cel puțin un profil.", "Fill in the public name or at least one profile."));
  const foto = text(c.fotoUrl, 500);
  // Poza se arată în pagină: doar adrese https.
  const fotoUrl = foto && /^https:\/\//i.test(foto) ? foto : null;
  const responsabilId = c.responsabilId && esteUuid(c.responsabilId) ? c.responsabilId : null;
  if (responsabilId) {
    const [m] = rows(await db.execute(sql`select 1 as x from memberships where org_id = ${orgId} and user_id = ${responsabilId}::uuid limit 1`));
    if (!m) throw new EroareUtilizator(t("Responsabilul ales nu face parte din echipă.", "The chosen owner is not on the team."));
  }
  const cazId = c.cazId && esteUuid(c.cazId) ? c.cazId : null;
  if (cazId) {
    const [p] = rows(await db.execute(sql`select 1 as x from fundraising_pages where org_id = ${orgId} and id = ${cazId}::uuid limit 1`));
    if (!p) throw new EroareUtilizator(t("Campania aleasă nu există.", "The chosen campaign does not exist."));
  }
  const oras = text(c.oras, 120);
  return {
    nume: text(c.nume, 160),
    numePublic,
    fotoUrl,
    instagram: contacte.instagram ?? null,
    facebook: contacte.facebook ?? null,
    tiktok: contacte.tiktok ?? null,
    youtube: contacte.youtube ?? null,
    urmaritori: JSON.stringify(curataUrmaritori(c.urmaritori)),
    categorie: esteCategorie(c.categorie) ? c.categorie : "lifestyle",
    domeniu: text(c.domeniu, 200),
    publicTinta: text(c.publicTinta, 300),
    oras,
    judet: judetDin(text(c.judet, 60), oras),
    tara: text(c.tara, 80) ?? "România",
    email: contacte.email ?? null,
    telefon: text(c.telefon, 40),
    sursaDate: text(c.sursaDate, 200) ?? sursaImplicita,
    temeiLegal: text(c.temeiLegal, 200) ?? TEMEI_IMPLICIT,
    responsabilId,
    cazId,
    note: text(c.note, 4000),
    acordPublic: Boolean(c.acordPublic),
  };
}

// Altă fișă a organizației cu același handle / id / email (aceleași forme normalizate ca în indexurile unice).
async function gasesteDublura(db: Db, orgId: string, c: ContacteInfluencer, excludeId: string | null): Promise<string | null> {
  const n = cheiNormalizate(c);
  const sau: SQL[] = [];
  if (n.instagram) sau.push(sql`instagram_norm = ${n.instagram}`);
  if (n.facebook) sau.push(sql`facebook_norm = ${n.facebook}`);
  if (n.tiktok) sau.push(sql`tiktok_norm = ${n.tiktok}`);
  if (n.youtube) sau.push(sql`youtube_norm = ${n.youtube}`);
  if (n.email) sau.push(sql`email_norm = ${n.email}`);
  if (sau.length === 0) return null;
  const [r] = rows(
    await db.execute(sql`select id::text as id from influenceri where org_id = ${orgId} and (${sql.join(sau, sql` or `)}) ${excludeId ? sql`and id <> ${excludeId}::uuid` : sql``} limit 1`),
  );
  return r ? String(r.id) : null;
}

function valoriInsert(orgId: string, c: CampuriCurate, userId: string): SQL {
  const n = cheiNormalizate(c);
  return sql`${orgId}, ${c.nume}, ${c.numePublic}, ${c.fotoUrl}, ${c.facebook}, ${c.instagram}, ${c.tiktok}, ${c.youtube},
    ${n.facebook}, ${n.instagram}, ${n.tiktok}, ${n.youtube}, ${n.email}, ${c.urmaritori}::text::jsonb, ${c.categorie}, ${c.domeniu}, ${c.publicTinta}, ${c.oras}, ${c.judet}, ${c.tara},
    ${c.email}, ${c.telefon}, ${c.sursaDate}, ${c.temeiLegal}, ${c.responsabilId}::uuid, ${c.cazId}::uuid, ${c.note}, ${c.acordPublic}, ${userId}::uuid`;
}

async function insereaza(db: Db, orgId: string, c: CampuriCurate, userId: string): Promise<string> {
  const [r] = rows(
    await db.execute(sql`
      insert into influenceri (org_id, nume, nume_public, foto_url, facebook, instagram, tiktok, youtube, facebook_norm, instagram_norm, tiktok_norm, youtube_norm, email_norm,
        urmaritori, categorie, domeniu, public_tinta, oras, judet, tara, email, telefon, sursa_date, temei_legal, responsabil_id, caz_id, note, acord_public, created_by)
      values (${valoriInsert(orgId, c, userId)}) returning id::text as id`),
  );
  return String(r?.id);
}

export async function salveazaInfluencer(db: Db, orgId: string, userId: string, id: string | null, campuri: CampuriInfluencer): Promise<RezultatSalvare> {
  const t = await getTr();
  const c = await curataCampuri(db, orgId, campuri, t);
  let vechi: ContacteInfluencer = {};
  if (id) {
    if (!esteUuid(id)) throw new EroareUtilizator(t("Influencerul nu mai există.", "The influencer no longer exists."));
    const [r] = rows(await db.execute(sql`select instagram, facebook, tiktok, youtube, email from influenceri where org_id = ${orgId} and id = ${id}::uuid for update`));
    if (!r) throw new EroareUtilizator(t("Influencerul nu mai există.", "The influencer no longer exists."));
    vechi = { instagram: str(r.instagram), facebook: str(r.facebook), tiktok: str(r.tiktok), youtube: str(r.youtube), email: str(r.email) };
  }
  // Un profil care a cerut ștergerea nu se readaugă. La o fișă existentă contează doar profilurile noi (o fișă „Nu mai contactăm” rămâne editabilă).
  const cheiVechi = new Set(listaChei(vechi));
  const cheiNoi = listaChei(c).filter((k) => !cheiVechi.has(k));
  if (await profilExclus(db, orgId, cheiNoi)) {
    throw new EroareUtilizator(t("Acest profil a cerut să nu mai fie contactat sau să fie șters — nu îl mai adăugăm.", "This profile asked not to be contacted or to be deleted — we do not add it again."));
  }
  const dub = await gasesteDublura(db, orgId, c, id);
  if (dub) return { id: dub, duplicat: true };
  try {
    return await db.transaction(async (sp) => {
      const tx = sp as unknown as Db;
      if (!id) {
        const nou = await insereaza(tx, orgId, c, userId);
        await noteaza(tx, orgId, nou, "creat", userId, { text: c.sursaDate });
        return { id: nou, duplicat: false } as const;
      }
      const n = cheiNormalizate(c);
      await tx.execute(sql`
        update influenceri set nume = ${c.nume}, nume_public = ${c.numePublic}, foto_url = ${c.fotoUrl}, facebook = ${c.facebook}, instagram = ${c.instagram}, tiktok = ${c.tiktok}, youtube = ${c.youtube},
          facebook_norm = ${n.facebook}, instagram_norm = ${n.instagram}, tiktok_norm = ${n.tiktok}, youtube_norm = ${n.youtube}, email_norm = ${n.email},
          urmaritori = ${c.urmaritori}::text::jsonb, categorie = ${c.categorie}, domeniu = ${c.domeniu}, public_tinta = ${c.publicTinta}, oras = ${c.oras}, judet = ${c.judet}, tara = ${c.tara},
          email = ${c.email}, telefon = ${c.telefon}, sursa_date = ${c.sursaDate}, temei_legal = ${c.temeiLegal}, responsabil_id = ${c.responsabilId}::uuid, caz_id = ${c.cazId}::uuid,
          note = ${c.note}, acord_public = ${c.acordPublic}, updated_at = now()
        where org_id = ${orgId} and id = ${id}::uuid`);
      await noteaza(tx, orgId, id, "actualizat", userId);
      return { id, duplicat: false } as const;
    });
  } catch (e) {
    // Două cereri simultane pentru același profil: indexul unic a oprit-o pe a doua; arătăm fișa existentă.
    if (codDb(e) === "23505") {
      const dubla = await gasesteDublura(db, orgId, c, id);
      if (dubla) return { id: dubla, duplicat: true };
    }
    throw e;
  }
}

// Import: adaugă fișele noi, completează (fără să suprascrie) fișele existente, sare peste profilurile excluse. Fiecare rând e izolat: o eroare nu oprește restul.
export async function importaRanduri(db: Db, orgId: string, userId: string, randuri: CampuriInfluencer[], primulRand: number): Promise<RezultatImport> {
  const t = await getTr();
  const rez: RezultatImport = { adaugate: 0, completate: 0, excluse: 0, erori: [] };
  const excluderi = await incarcaExcluderi(db, orgId); // o singură citire pentru tot lotul
  for (const [i, brut] of randuri.slice(0, 200).entries()) {
    const nr = primulRand + i;
    try {
      const c = await curataCampuri(db, orgId, brut, t, t("import din fișier", "file import"));
      const dub = await gasesteDublura(db, orgId, c, null);
      if (dub) {
        await completeaza(db, orgId, dub, c, userId);
        rez.completate++;
        continue;
      }
      if (sunteExcluse(orgId, listaChei(c), excluderi)) {
        rez.excluse++;
        continue;
      }
      await db.transaction(async (sp) => {
        const tx = sp as unknown as Db;
        const nou = await insereaza(tx, orgId, c, userId);
        await noteaza(tx, orgId, nou, "import", userId, { text: c.sursaDate });
      });
      rez.adaugate++;
    } catch (e) {
      if (e instanceof EroareUtilizator) rez.erori.push(`${t("Rândul", "Row")} ${nr}: ${e.message}`);
      else if (codDb(e) === "23505") rez.completate++; // apărut între timp (rând dublu în același lot)
      else rez.erori.push(`${t("Rândul", "Row")} ${nr}: ${t("nu s-a putut salva.", "could not be saved.")}`);
    }
  }
  return rez;
}

// Completează o fișă existentă cu ce lipsește (câmpurile deja completate rămân neschimbate).
async function completeaza(db: Db, orgId: string, id: string, c: CampuriCurate, userId: string): Promise<void> {
  const n = cheiNormalizate(c);
  const identitati = sql`
    instagram = coalesce(instagram, ${c.instagram}), instagram_norm = coalesce(instagram_norm, ${n.instagram}),
    facebook = coalesce(facebook, ${c.facebook}), facebook_norm = coalesce(facebook_norm, ${n.facebook}),
    tiktok = coalesce(tiktok, ${c.tiktok}), tiktok_norm = coalesce(tiktok_norm, ${n.tiktok}),
    youtube = coalesce(youtube, ${c.youtube}), youtube_norm = coalesce(youtube_norm, ${n.youtube}),
    email = coalesce(email, ${c.email}), email_norm = coalesce(email_norm, ${n.email}),`;
  const restul = sql`
    nume = coalesce(nume, ${c.nume}), foto_url = coalesce(foto_url, ${c.fotoUrl}), urmaritori = ${c.urmaritori}::text::jsonb || urmaritori,
    domeniu = coalesce(domeniu, ${c.domeniu}), public_tinta = coalesce(public_tinta, ${c.publicTinta}), oras = coalesce(oras, ${c.oras}), judet = coalesce(judet, ${c.judet}),
    telefon = coalesce(telefon, ${c.telefon}), updated_at = now()`;
  try {
    await db.transaction(async (sp) => {
      await (sp as unknown as Db).execute(sql`update influenceri set ${identitati} ${restul} where org_id = ${orgId} and id = ${id}::uuid`);
    });
  } catch (e) {
    // Un handle nou aparține deja altei fișe: completăm doar restul câmpurilor.
    if (codDb(e) !== "23505") throw e;
    await db.execute(sql`update influenceri set ${restul} where org_id = ${orgId} and id = ${id}::uuid`);
  }
  await noteaza(db, orgId, id, "actualizat", userId, { text: "import" });
}

// ───────── Contactare, răspuns, etapă, pas următor ─────────

type StareFisa = {
  id: string;
  nuContacta: boolean;
  etapa: string;
  ultimaContactare: Date | null;
  nrReveniri: number;
  responsabilId: string | null;
  cazId: string | null;
} & ContacteInfluencer;

async function blocheaza(db: Db, orgId: string, id: string): Promise<StareFisa> {
  // limba se citește doar când trebuie un mesaj de eroare (retenția din cron rulează fără cerere de utilizator)
  const nuExista = async () => new EroareUtilizator((await getTr())("Influencerul nu mai există.", "The influencer no longer exists."));
  if (!esteUuid(id)) throw await nuExista();
  const [r] = rows(
    await db.execute(sql`
      select id::text as id, nu_contacta as "nuContacta", etapa, ultima_contactare as "ultimaContactare", nr_reveniri as "nrReveniri", responsabil_id::text as "responsabilId", caz_id::text as "cazId",
        instagram, facebook, tiktok, youtube, email
      from influenceri where org_id = ${orgId} and id = ${id}::uuid for update`),
  );
  if (!r) throw await nuExista();
  const ultima = iso(r.ultimaContactare);
  return {
    id: String(r.id),
    nuContacta: Boolean(r.nuContacta),
    etapa: String(r.etapa),
    ultimaContactare: ultima ? new Date(ultima) : null,
    nrReveniri: intreg(r.nrReveniri),
    responsabilId: str(r.responsabilId),
    cazId: str(r.cazId),
    instagram: str(r.instagram),
    facebook: str(r.facebook),
    tiktok: str(r.tiktok),
    youtube: str(r.youtube),
    email: str(r.email),
  };
}

export const esteBlocat = (s: { nuContacta: boolean; etapa: string }) => s.nuContacta || ETAPE_FARA_CONTACT.has(s.etapa);

export async function verificaNeblocat(db: Db, orgId: string, id: string): Promise<void> {
  const t = await getTr();
  const s = await blocheaza(db, orgId, id);
  if (esteBlocat(s)) throw new EroareUtilizator(t("Acest influencer a refuzat sau a cerut să nu mai fie contactat.", "This influencer declined or asked not to be contacted again."));
}

export type RezultatTrimis = { verificareLa: string; nrReveniri: number; limitaAtinsa: boolean };

// „Am trimis”: singura cale prin care un mesaj devine „trimis”. Cere confirmarea „preiau eu” dacă altă colegă a scris recent.
export async function marcheazaTrimis(
  db: Db,
  orgId: string,
  userId: string,
  x: { id: string; canal: string; text: string; cazId: string | null; confirmaPreluare: boolean },
  setari: SetariUrmarire,
): Promise<RezultatTrimis> {
  const t = await getTr();
  const s = await blocheaza(db, orgId, x.id);
  if (esteBlocat(s)) throw new EroareUtilizator(t("Acest influencer a refuzat sau a cerut să nu mai fie contactat.", "This influencer declined or asked not to be contacted again."));
  if (!esteCanal(x.canal)) throw new EroareUtilizator(t("Canal necunoscut.", "Unknown channel."));
  if (!x.confirmaPreluare) {
    const alta = await citesteCoordonare(db, orgId, x.id, userId, setari.blocareColegZile);
    if (alta) {
      const cand = new Date(alta.la).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" });
      throw new EroareCoordonare(t(`${alta.nume ?? "O colegă"} i-a scris pe ${cand}. Confirmă că preiei tu contactarea.`, `${alta.nume ?? "A colleague"} wrote to them on ${cand}. Confirm that you are taking over.`));
    }
  }
  const cazId = x.cazId && esteUuid(x.cazId) ? x.cazId : s.cazId;
  const acum = new Date();
  const plan = dupaTrimitere(setari, { nrReveniri: s.nrReveniri, amContactat: s.ultimaContactare !== null }, acum);
  await noteaza(db, orgId, x.id, "mesaj_trimis", userId, { canal: x.canal, text: x.text, cazId });
  await db.execute(sql`
    update influenceri set ultima_contactare = ${acum.toISOString()}::timestamptz,
      etapa = case when etapa in ('identificat', 'pregatit', 'asteptam', 'raspuns') then 'asteptam' else etapa end,
      responsabil_id = coalesce(responsabil_id, ${userId}::uuid), caz_id = coalesce(${cazId}::uuid, caz_id),
      nr_reveniri = ${plan.nrReveniri}, follow_up_la = ${plan.verificareLa.toISOString()}::timestamptz, follow_up_tip = 'verificare', follow_up_nota = null,
      updated_at = now()
    where org_id = ${orgId} and id = ${x.id}::uuid`);
  return { verificareLa: plan.verificareLa.toISOString(), nrReveniri: plan.nrReveniri, limitaAtinsa: plan.limitaAtinsa };
}

export async function marcheazaRaspuns(db: Db, orgId: string, userId: string, id: string, raspuns: string): Promise<void> {
  const t = await getTr();
  const s = await blocheaza(db, orgId, id);
  const textul = text(raspuns, 2000);
  if (!textul) throw new EroareUtilizator(t("Scrie pe scurt ce a răspuns.", "Write briefly what they replied."));
  await noteaza(db, orgId, s.id, "raspuns", userId, { text: textul });
  await db.execute(sql`
    update influenceri set ultimul_raspuns = now(), etapa = case when etapa in ('identificat', 'pregatit', 'asteptam') then 'raspuns' else etapa end,
      follow_up_la = null, follow_up_tip = null, follow_up_nota = null, updated_at = now()
    where org_id = ${orgId} and id = ${s.id}::uuid`);
}

export async function schimbaEtapa(db: Db, orgId: string, userId: string, esteAdmin: boolean, id: string, etapa: string, nota?: string): Promise<void> {
  const t = await getTr();
  if (!esteEtapa(etapa)) throw new EroareUtilizator(t("Etapă necunoscută.", "Unknown stage."));
  const s = await blocheaza(db, orgId, id);
  // Refuzul se respectă: din „Nu mai contactăm” poate scoate fișa doar un administrator.
  if (s.nuContacta && etapa !== "stop" && !esteAdmin) throw new EroareUtilizator(t("Fișa e marcată „Nu mai contactăm”. O poate redeschide doar un administrator.", "This profile is marked “Do not contact”. Only an administrator can reopen it."));
  const stop = etapa === "stop";
  await noteaza(db, orgId, s.id, "etapa", userId, { text: `→ ${etapa}${nota ? ` — ${nota.slice(0, 300)}` : ""}` });
  await db.execute(sql`
    update influenceri set etapa = ${etapa}, updated_at = now(),
      follow_up_la = case when ${ETAPE_FARA_CONTACT.has(etapa)} then null else follow_up_la end,
      follow_up_tip = case when ${ETAPE_FARA_CONTACT.has(etapa)} then null else follow_up_tip end,
      follow_up_nota = case when ${ETAPE_FARA_CONTACT.has(etapa)} then null else follow_up_nota end,
      nu_contacta = case when ${stop} then true when ${s.nuContacta} then false else nu_contacta end
    where org_id = ${orgId} and id = ${s.id}::uuid`);
  if (etapa === "distribuit") await noteaza(db, orgId, s.id, "distribuire", userId, { text: nota ?? null, cazId: s.cazId });
  if (stop) await adaugaExcluderi(db, orgId, listaChei(s), "nu_mai_contactam");
}

export async function nuMaiContactam(db: Db, orgId: string, userId: string, id: string, motiv: string): Promise<void> {
  const s = await blocheaza(db, orgId, id);
  const m = text(motiv, 300);
  await db.execute(sql`
    update influenceri set nu_contacta = true, nu_contacta_motiv = ${m}, etapa = 'stop', follow_up_la = null, follow_up_tip = null, follow_up_nota = null, updated_at = now()
    where org_id = ${orgId} and id = ${s.id}::uuid`);
  await noteaza(db, orgId, s.id, "nu_contacta", userId, { text: m });
  await adaugaExcluderi(db, orgId, listaChei(s), "nu_mai_contactam");
}

// Pas următor stabilit de colegă, la o dată aleasă (ora 09:00, ora României).
export async function programeazaPas(db: Db, orgId: string, userId: string, id: string, ziua: string, nota: string): Promise<void> {
  const t = await getTr();
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ziua);
  const data = d ? new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]))) : null;
  if (!d || !data || data.toISOString().slice(0, 10) !== ziua) throw new EroareUtilizator(t("Data nu e validă.", "The date is not valid."));
  if (Math.abs(data.getTime() - Date.now()) > 3 * 366 * 86_400_000) throw new EroareUtilizator(t("Alege o dată din următorii ani.", "Pick a date within the next few years."));
  const s = await blocheaza(db, orgId, id);
  if (esteBlocat(s)) throw new EroareUtilizator(t("Nu programăm un pas: influencerul a refuzat sau a cerut să nu mai fie contactat.", "We do not schedule a step: the influencer declined or asked not to be contacted again."));
  const n = text(nota, 300) ?? t("Pas următor", "Next step");
  await db.execute(sql`
    update influenceri set follow_up_la = ((${ziua}::date + time '09:00') at time zone 'Europe/Bucharest'), follow_up_tip = 'manual', follow_up_nota = ${n}, updated_at = now()
    where org_id = ${orgId} and id = ${s.id}::uuid`);
  await noteaza(db, orgId, s.id, "follow_up", userId, { text: `${ziua}: ${n}` });
}

// La verificare, dacă n-a răspuns: se programează revenirea (la +7 zile de la ultimul mesaj), dacă mai sunt reveniri permise.
export async function faraRaspuns(db: Db, orgId: string, userId: string, id: string, setari: SetariUrmarire): Promise<{ revenireLa: string | null; limitaAtinsa: boolean }> {
  const t = await getTr();
  const s = await blocheaza(db, orgId, id);
  if (esteBlocat(s)) throw new EroareUtilizator(t("Acest influencer a refuzat sau a cerut să nu mai fie contactat.", "This influencer declined or asked not to be contacted again."));
  if (!s.ultimaContactare) throw new EroareUtilizator(t("Încă nu i-ai trimis niciun mesaj.", "You have not sent any message yet."));
  const plan = dupaVerificareFaraRaspuns(setari, { nrReveniri: s.nrReveniri, ultimaContactare: s.ultimaContactare }, new Date());
  if (!plan.revenireLa) {
    await db.execute(sql`update influenceri set follow_up_la = null, follow_up_tip = null, follow_up_nota = null, updated_at = now() where org_id = ${orgId} and id = ${s.id}::uuid`);
    await noteaza(db, orgId, s.id, "follow_up", userId, { text: t("Limita de reveniri a fost atinsă; nu mai programăm altele.", "The follow-up limit was reached; no more are scheduled.") });
    return { revenireLa: null, limitaAtinsa: true };
  }
  await db.execute(sql`
    update influenceri set follow_up_la = ${plan.revenireLa.toISOString()}::timestamptz, follow_up_tip = 'revenire', follow_up_nota = null, updated_at = now()
    where org_id = ${orgId} and id = ${s.id}::uuid`);
  await noteaza(db, orgId, s.id, "follow_up", userId, { text: t("Nu a răspuns; revenire programată.", "No reply; follow-up scheduled.") });
  return { revenireLa: plan.revenireLa.toISOString(), limitaAtinsa: false };
}

export async function adaugaNota(db: Db, orgId: string, userId: string, id: string, nota: string): Promise<void> {
  const t = await getTr();
  const s = await blocheaza(db, orgId, id);
  const textul = text(nota, 2000);
  if (!textul) throw new EroareUtilizator(t("Scrie nota.", "Write the note."));
  await noteaza(db, orgId, s.id, "nota", userId, { text: textul });
  await db.execute(sql`update influenceri set updated_at = now() where org_id = ${orgId} and id = ${s.id}::uuid`);
}

export async function preia(db: Db, orgId: string, userId: string, id: string, numeColega: string): Promise<void> {
  const s = await blocheaza(db, orgId, id);
  await db.execute(sql`update influenceri set responsabil_id = ${userId}::uuid, updated_at = now() where org_id = ${orgId} and id = ${s.id}::uuid`);
  await noteaza(db, orgId, s.id, "preluat", userId, { text: numeColega });
}

// Ștergere la cerere (dreptul la ștergere): dispar fișa, istoricul și numele din descrierea linkurilor; rămân doar amprentele (hash) ale tuturor handle-urilor și ale emailului.
// Linkurile rămân active (au fost deja distribuite), dar nu mai sunt legate de nicio persoană; clicurile și donațiile atribuite rămân în statistici.
// `motiv` rămâne „nu_mai_contactam” când reducerea vine din retenția celor marcați „Nu mai contactăm” (fără cerere de ștergere).
export async function stergeLaCerere(db: Db, orgId: string, id: string, motiv: "stergere" | "nu_mai_contactam" = "stergere"): Promise<void> {
  const s = await blocheaza(db, orgId, id);
  await adaugaExcluderi(db, orgId, listaChei(s), motiv);
  await db.execute(sql`update influenceri_linkuri set descriere = 'profil șters la cerere' where org_id = ${orgId} and influencer_id = ${s.id}::uuid`);
  await db.execute(sql`delete from influenceri_activitati where org_id = ${orgId} and influencer_id = ${s.id}::uuid`);
  await db.execute(sql`delete from influenceri where org_id = ${orgId} and id = ${s.id}::uuid`);
}

// ───────── Linkul unic ─────────

export type LinkPregatit = { id: string; slug: string; url: string; nou: boolean };

// Linkul unic pentru influencer × campanie × platformă: se creează o singură dată, apoi se reutilizează.
export async function linkPentru(db: Db, orgId: string, userId: string, siteUrl: string, influencerId: string, caz: CazDistribuibil, canal: Canal): Promise<LinkPregatit> {
  const [ex] = rows(await db.execute(sql`select id::text as id, slug from influenceri_linkuri where org_id = ${orgId} and influencer_id = ${influencerId}::uuid and caz_id = ${caz.id}::uuid and platforma = ${canal} limit 1`));
  if (ex) return { id: String(ex.id), slug: String(ex.slug), url: adresaLink(siteUrl, String(ex.slug)), nou: false };
  const etichetaCanal = PLATFORME.find((p) => p.k === canal)?.ro ?? "Email";
  // Descrierea NU poartă numele persoanei: ruta publică /r/<cod> citește linkurile, iar numele e dat personal (rămâne doar în fișa din `influenceri`, prin influencer_id).
  const descriere = `${caz.titlu} · ${etichetaCanal}`.slice(0, 300);
  for (let incercare = 0; incercare < 6; incercare++) {
    const cod = codDinOcteti(randomBytes(32));
    if (!cod) continue;
    const slug = construiesteSlugLink(caz.slug, cod);
    // „on conflict do nothing”: o coliziune de slug (aproape imposibilă) sau o cerere paralelă pentru același link nu aruncă eroare și nu strică tranzacția acțiunii.
    const [creat] = rows(
      await db.execute(sql`
        insert into influenceri_linkuri (org_id, influencer_id, caz_id, slug, platforma, descriere, created_by)
        values (${orgId}, ${influencerId}::uuid, ${caz.id}::uuid, ${slug}, ${canal}, ${descriere}, ${userId}::uuid)
        on conflict do nothing returning id::text as id`),
    );
    if (creat) {
      await noteaza(db, orgId, influencerId, "link", userId, { canal, cazId: caz.id, text: slug });
      return { id: String(creat.id), slug, url: adresaLink(siteUrl, slug), nou: true };
    }
    const [paralel] = rows(await db.execute(sql`select id::text as id, slug from influenceri_linkuri where org_id = ${orgId} and influencer_id = ${influencerId}::uuid and caz_id = ${caz.id}::uuid and platforma = ${canal} limit 1`));
    if (paralel) return { id: String(paralel.id), slug: String(paralel.slug), url: adresaLink(siteUrl, String(paralel.slug)), nou: false };
  }
  throw new EroareUtilizator((await getTr())("Nu am putut crea linkul. Încearcă din nou.", "We could not create the link. Please try again."));
}

// Datele minime ale unui influencer pentru pregătirea mesajului (fără contact, note sau alte date).
export async function pentruMesaj(db: Db, orgId: string, id: string): Promise<{ numePublic: string; categorie: string; domeniu: string | null; oras: string | null; tara: string | null; nuContacta: boolean; etapa: string; instagram: string | null; facebook: string | null; tiktok: string | null; youtube: string | null; email: string | null } | null> {
  if (!esteUuid(id)) return null;
  const [r] = rows(
    await db.execute(sql`
      select nume_public as "numePublic", categorie, domeniu, oras, tara, nu_contacta as "nuContacta", etapa, instagram, facebook, tiktok, youtube, email
      from influenceri where org_id = ${orgId} and id = ${id}::uuid`),
  );
  if (!r) return null;
  return {
    numePublic: String(r.numePublic),
    categorie: String(r.categorie),
    domeniu: str(r.domeniu),
    oras: str(r.oras),
    tara: str(r.tara),
    nuContacta: Boolean(r.nuContacta),
    etapa: String(r.etapa),
    instagram: str(r.instagram),
    facebook: str(r.facebook),
    tiktok: str(r.tiktok),
    youtube: str(r.youtube),
    email: str(r.email),
  };
}


const RE_UUID_FILTRU = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
