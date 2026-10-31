"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { aiConfigurat, cautaApeluriAI, genereazaDraftGrantAI, type RezultatCautareApeluri } from "@/lib/ai";
import { limitaAIDepasita, limitaCautareDepasita, MESAJ_LIMITA_AI, MESAJ_LIMITA_CAUTARE } from "@/lib/ai-limit";
import { withOrgAdmin, withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
import { isPlatformAdmin, pachetPentruModule } from "@/lib/billing/trial";
import { appUsers, granturi, granturiDosar, memberships, type FisierGrant } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { BUCKET_PRIVAT, caleDinReferinta, referintaPrivata, stergeFisierePrivate } from "@/lib/fisiere-private";
import { createClient } from "@/lib/supabase/server";
import { CAMPURI_DOSAR, aziBucuresti, curataDosar, esteStare, valideazaGrant, type ElementLista, type GrantInput } from "@/lib/granturi/stari";
import { getLocale } from "@/lib/i18n/get-locale";
import { GRANTURI_UI_DICT, traduEroareGrant } from "@/lib/i18n/dictionaries/granturi-ui";

// Mesajele afișate utilizatorului, în limba aleasă (cookie-ul de limbă).
const mesaje = async () => GRANTURI_UI_DICT[await getLocale()].msg;

// Modulul Granturi (inclus din pachetul IMPACT; poarta e în layout.tsx). Orice membru al organizației citește și lucrează la cereri;
// ștergerea unei cereri cere rol de admin sau owner.

export type GrantRand = {
  id: string;
  finantator: string;
  titlu: string;
  tipFinantator: string;
  stare: string;
  suma: number | null;
  moneda: string;
  termen: string | null;
  link: string | null;
  responsabilId: string | null;
  nota: string | null;
  cerinte: string | null;
  eligibilitate: ElementLista[];
  documente: ElementLista[];
  fisiere: FisierGrant[];
  draft: string | null;
  sumaCastigata: number | null;
  dataDecizie: string | null;
  termenRaportare: string | null;
};

export type Membru = { id: string; nume: string };

export type DateGranturi = {
  granturi: GrantRand[];
  dosar: Record<string, string>;
  membri: Membru[];
  azi: string;
  aiDisponibil: boolean;
  // Funcțiile AI din Granturi (căutarea de apeluri, schița cererii) consumă creditele Anthropic ale platformei și nu sunt promise în niciun pachet:
  // le văd doar conturile administratorilor platformei (vezi isPlatformAdmin). Clienții nu le văd în interfață, iar acțiunile le refuză și pe server.
  aiPermis: boolean;
};

// Pagina e închisă în layout pentru pachetele fără Granturi; aceeași verificare și aici, ca acțiunile să nu poată fi apelate direct.
const cuModul = async (ctx: { orgPackage: Parameters<typeof areModul>[0]; userEmail: string }) => {
  if (!areModul(pachetPentruModule(ctx.orgPackage, ctx.userEmail), "granturi")) throw new EroareUtilizator((await mesaje()).pachetImpact);
};

const numar = (x: string | null): number | null => (x === null ? null : Number(x));

export const obtineDateGranturi = withOrgSession(async (ctx): Promise<DateGranturi> => {
  await cuModul(ctx);
  const [randuri, dosar, membri] = await Promise.all([
    ctx.db.select().from(granturi).where(eq(granturi.orgId, ctx.orgId)).orderBy(granturi.termen, granturi.createdAt),
    ctx.db.select({ continut: granturiDosar.continut }).from(granturiDosar).where(eq(granturiDosar.orgId, ctx.orgId)).limit(1),
    ctx.db
      .select({ id: appUsers.id, nume: appUsers.name, email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(eq(memberships.orgId, ctx.orgId)),
  ]);
  return {
    granturi: randuri.map((g) => ({
      id: g.id,
      finantator: g.finantator,
      titlu: g.titlu,
      tipFinantator: g.tipFinantator,
      stare: g.stare,
      suma: numar(g.suma),
      moneda: g.moneda,
      termen: g.termen,
      link: g.link,
      responsabilId: g.responsabilId,
      nota: g.nota,
      cerinte: g.cerinte,
      eligibilitate: g.eligibilitate,
      documente: g.documente,
      fisiere: g.fisiere,
      draft: g.draft,
      sumaCastigata: numar(g.sumaCastigata),
      dataDecizie: g.dataDecizie,
      termenRaportare: g.termenRaportare,
    })),
    dosar: curataDosar(dosar[0]?.continut),
    membri: membri.map((m) => ({ id: m.id, nume: m.nume?.trim() || m.email })),
    azi: aziBucuresti(),
    aiDisponibil: aiConfigurat(),
    aiPermis: isPlatformAdmin(ctx.userEmail),
  };
});

export type RezultatSalvare = { ok: true; id: string } | { ok: false; eroare: string };

export const salveazaGrantAction = withOrgSession(async (ctx, input: GrantInput): Promise<RezultatSalvare> => {
  await cuModul(ctx);
  const locale = await getLocale();
  const m = await mesaje();
  const r = valideazaGrant(input);
  if (!r.ok) return { ok: false, eroare: traduEroareGrant(locale, r.eroare) };
  const v = r.v;
  const valori = {
    finantator: v.finantator,
    titlu: v.titlu,
    tipFinantator: v.tipFinantator,
    stare: v.stare,
    suma: v.suma === null ? null : String(v.suma),
    moneda: v.moneda,
    termen: v.termen,
    link: v.link,
    responsabilId: v.responsabilId,
    nota: v.nota,
    cerinte: v.cerinte,
    eligibilitate: v.eligibilitate,
    documente: v.documente,
    draft: v.draft,
    sumaCastigata: v.sumaCastigata === null ? null : String(v.sumaCastigata),
    dataDecizie: v.dataDecizie,
    termenRaportare: v.termenRaportare,
    updatedAt: new Date(),
  };
  // Responsabilul trebuie să fie membru al organizației (un id străin nu se acceptă).
  if (v.responsabilId) {
    const [mb] = await ctx.db.select({ id: memberships.userId }).from(memberships).where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.userId, v.responsabilId))).limit(1);
    if (!mb) return { ok: false, eroare: m.responsabilInvalid };
  }
  if (input.id) {
    // Termenul nou redeschide reminderele: dacă termenul se schimbă, ele pot pleca din nou.
    const [vechi] = await ctx.db.select({ termen: granturi.termen }).from(granturi).where(and(eq(granturi.id, input.id), eq(granturi.orgId, ctx.orgId))).limit(1);
    if (!vechi) return { ok: false, eroare: m.cerereNegasita };
    await ctx.db
      .update(granturi)
      .set({ ...valori, ...(vechi.termen !== v.termen ? { reminder7zLa: null, reminder1zLa: null } : {}) })
      .where(and(eq(granturi.id, input.id), eq(granturi.orgId, ctx.orgId)));
    return { ok: true, id: input.id };
  }
  const [nou] = await ctx.db.insert(granturi).values({ ...valori, orgId: ctx.orgId, createdBy: ctx.userId }).returning({ id: granturi.id });
  return { ok: true, id: nou.id };
});

// Schimbarea rapidă a stării din listă, fără să deschizi cererea.
export const schimbaStareGrantAction = withOrgSession(async (ctx, id: string, stare: string): Promise<{ ok: boolean }> => {
  await cuModul(ctx);
  if (!esteStare(stare)) return { ok: false };
  const r = await ctx.db
    .update(granturi)
    .set({ stare, updatedAt: new Date() })
    .where(and(eq(granturi.id, id), eq(granturi.orgId, ctx.orgId)))
    .returning({ id: granturi.id });
  return { ok: Boolean(r[0]) };
});

export const stergeGrantAction = withOrgAdmin(async (ctx, id: string): Promise<void> => {
  await cuModul(ctx);
  const [g] = await ctx.db.select({ fisiere: granturi.fisiere }).from(granturi).where(and(eq(granturi.id, id), eq(granturi.orgId, ctx.orgId))).limit(1);
  await ctx.db.delete(granturi).where(and(eq(granturi.id, id), eq(granturi.orgId, ctx.orgId)));
  if (g?.fisiere?.length) await stergeFisierePrivate(ctx.orgSlug, g.fisiere.map((f) => f.ref));
});

// Adaugă în registru o sursă din lista „Surse de finanțare” (stare „identificat”); nu o dublează dacă același finanțator + titlu există deja.
export const adaugaSursaInRegistruAction = withOrgSession(async (ctx, finantator: string, titlu: string, tip: string, link: string, termen: string = ""): Promise<RezultatSalvare> => {
  await cuModul(ctx);
  const locale = await getLocale();
  const r = valideazaGrant({
    id: null,
    finantator,
    titlu,
    tipFinantator: tip,
    stare: "identificat",
    suma: "",
    moneda: "RON",
    termen,
    link,
    responsabilId: null,
    nota: "",
    cerinte: "",
    eligibilitate: [],
    documente: [],
    draft: "",
    sumaCastigata: "",
    dataDecizie: "",
    termenRaportare: "",
  });
  if (!r.ok) return { ok: false, eroare: traduEroareGrant(locale, r.eroare) };
  const [exista] = await ctx.db
    .select({ id: granturi.id })
    .from(granturi)
    .where(and(eq(granturi.orgId, ctx.orgId), eq(granturi.finantator, r.v.finantator), eq(granturi.titlu, r.v.titlu)))
    .limit(1);
  if (exista) return { ok: true, id: exista.id };
  const [nou] = await ctx.db
    .insert(granturi)
    .values({ orgId: ctx.orgId, finantator: r.v.finantator, titlu: r.v.titlu, tipFinantator: r.v.tipFinantator, link: r.v.link, termen: r.v.termen, createdBy: ctx.userId })
    .returning({ id: granturi.id });
  return { ok: true, id: nou.id };
});

export const salveazaDosarAction = withOrgSession(async (ctx, continut: Record<string, string>): Promise<{ ok: true }> => {
  await cuModul(ctx);
  const curat = curataDosar(continut);
  await ctx.db
    .insert(granturiDosar)
    .values({ orgId: ctx.orgId, continut: curat })
    .onConflictDoUpdate({ target: granturiDosar.orgId, set: { continut: curat, updatedAt: new Date() } });
  return { ok: true };
});

// ---- Fișiere atașate -----------------------------------------------------------------------------------------------
// Stau în bucket-ul privat (URL semnat la deschidere), ca documentele firmelor; lista lor e în granturi.fisiere.
const TIPURI_FISIER: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};
const MAX_BYTES_FISIER = 4 * 1024 * 1024; // și plafonul corpului de cerere pe Vercel
const MAX_FISIERE = 30;

export type RezultatFisier = { ok: true } | { ok: false; eroare: string };

export const incarcaFisierGrantAction = withOrgSession(async (ctx, grantId: string, formData: FormData): Promise<RezultatFisier> => {
  await cuModul(ctx);
  const m = await mesaje();
  const fisier = formData.get("fisier");
  if (!(fisier instanceof File) || fisier.size === 0) return { ok: false, eroare: m.alegeFisier };
  if (fisier.size > MAX_BYTES_FISIER) return { ok: false, eroare: m.fisierPreaMare };
  const ext = TIPURI_FISIER[fisier.type];
  if (!ext) return { ok: false, eroare: m.tipNeacceptat };

  const [g] = await ctx.db.select({ fisiere: granturi.fisiere }).from(granturi).where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId))).limit(1);
  if (!g) return { ok: false, eroare: m.cerereNegasita };
  if (g.fisiere.length >= MAX_FISIERE) return { ok: false, eroare: m.limitaFisiere(MAX_FISIERE) };

  const id = randomUUID();
  const cale = `${ctx.orgSlug}/granturi/${grantId}/${id}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET_PRIVAT).upload(cale, fisier, { contentType: fisier.type, upsert: false });
  if (error) return { ok: false, eroare: m.incarcareEsuata(error.message) };

  const nume = (String(formData.get("nume") ?? "").trim() || fisier.name || `document.${ext}`).slice(0, 200);
  const nou: FisierGrant = { id, nume, ref: referintaPrivata(cale), tip: ext, marime: fisier.size, la: new Date().toISOString() };
  try {
    await ctx.db.update(granturi).set({ fisiere: [nou, ...g.fisiere], updatedAt: new Date() }).where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId)));
  } catch (e) {
    // Fără rând în listă, fișierul ar rămâne orfan în bucket: îl ștergem înainte să propagăm eroarea.
    await stergeFisierePrivate(ctx.orgSlug, [nou.ref]);
    throw e;
  }
  return { ok: true };
});

// Link semnat, valabil zece minute, pentru deschiderea unui fișier; verificat că fișierul aparține chiar acestei cereri.
export const deschideFisierGrantAction = withOrgSession(async (ctx, grantId: string, fisierId: string): Promise<{ ok: true; url: string } | { ok: false; eroare: string }> => {
  await cuModul(ctx);
  const m = await mesaje();
  const [g] = await ctx.db.select({ fisiere: granturi.fisiere }).from(granturi).where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId))).limit(1);
  const f = g?.fisiere.find((x) => x.id === fisierId);
  const cale = caleDinReferinta(f?.ref);
  if (!f || !cale || !cale.startsWith(`${ctx.orgSlug}/granturi/${grantId}/`)) return { ok: false, eroare: m.fisierNegasit };
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET_PRIVAT).createSignedUrl(cale, 600);
  if (error || !data?.signedUrl) return { ok: false, eroare: m.nuPotDeschide };
  return { ok: true, url: data.signedUrl };
});

export const stergeFisierGrantAction = withOrgSession(async (ctx, grantId: string, fisierId: string): Promise<RezultatFisier> => {
  await cuModul(ctx);
  const m = await mesaje();
  const [g] = await ctx.db.select({ fisiere: granturi.fisiere }).from(granturi).where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId))).limit(1);
  if (!g) return { ok: false, eroare: m.cerereNegasita };
  const f = g.fisiere.find((x) => x.id === fisierId);
  if (!f) return { ok: true };
  // Doar căi din folderul acestei cereri, în bucket-ul privat.
  if (caleDinReferinta(f.ref)?.startsWith(`${ctx.orgSlug}/granturi/${grantId}/`)) await stergeFisierePrivate(ctx.orgSlug, [f.ref]);
  await ctx.db.update(granturi).set({ fisiere: g.fisiere.filter((x) => x.id !== fisierId), updatedAt: new Date() }).where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId)));
  return { ok: true };
});

// ---- Căutare de apeluri cu AI ---------------------------------------------------------------------------------------
// Folosește căutarea web a Anthropic; păstrează doar rezultate cu linkuri reale (vezi cautaApeluriAI). Plafonată zilnic ca restul funcțiilor AI.
const CAMPURI_FARA_AI = new Set(["contact_nume", "contact_email", "contact_telefon", "iban"]);
const ZONE = ["România", "Europa", "Internațional"];

export const cautaApeluriAction = withOrgFaze<
  [string, string, string],
  { domeniu: string; zona: string; observatii: string; azi: string },
  RezultatCautareApeluri,
  RezultatCautareApeluri
>({
  pregateste: async (ctx, domeniu, zona, observatii) => {
    await cuModul(ctx);
    const locale = await getLocale();
    const m = await mesaje();
    if (!isPlatformAdmin(ctx.userEmail)) throw new EroareUtilizator(m.cautareIndisponibila);
    if (!aiConfigurat()) return { gata: { ok: false, eroare: m.cautareNeconfigurata } };
    if (await limitaCautareDepasita(ctx)) return { gata: { ok: false, eroare: traduEroareGrant(locale, MESAJ_LIMITA_CAUTARE) } };
    return {
      pregatit: {
        domeniu: String(domeniu ?? "").trim().slice(0, 200),
        zona: ZONE.includes(zona) ? zona : "România",
        observatii: String(observatii ?? "").trim().slice(0, 300),
        azi: aziBucuresti(),
      },
    };
  },
  extern: (p) => cautaApeluriAI(p),
});

export type RezultatDraft = { ok: true; draft: string } | { ok: false; eroare: string };

const FORMAT_SUMA = (n: string | null, moneda: string) => (n ? `${Number(n).toLocaleString("ro-RO")} ${moneda}` : null);

// Generează un draft de cerere din dosarul organizației și cerințele finanțatorului. Salvează draftul pe cerere (poate fi rescris după);
// apelul către model e în afara tranzacției (vezi withOrgFaze), iar numărul de generări pe zi e plafonat ca la celelalte funcții AI.
export const genereazaDraftGrantAction = withOrgFaze<
  [string, string],
  { cerere: Parameters<typeof genereazaDraftGrantAI>[0] },
  string | null,
  RezultatDraft
>({
  pregateste: async (ctx, grantId, limba) => {
    await cuModul(ctx);
    const locale = await getLocale();
    const m = await mesaje();
    if (!isPlatformAdmin(ctx.userEmail)) throw new EroareUtilizator(m.draftIndisponibil);
    if (!aiConfigurat()) return { gata: { ok: false, eroare: m.draftNeconfigurat } };
    const [g] = await ctx.db.select().from(granturi).where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId))).limit(1);
    if (!g) return { gata: { ok: false, eroare: m.cerereNegasita } };
    if (await limitaAIDepasita(ctx)) return { gata: { ok: false, eroare: traduEroareGrant(locale, MESAJ_LIMITA_AI) } };
    const [d] = await ctx.db.select({ continut: granturiDosar.continut }).from(granturiDosar).where(eq(granturiDosar.orgId, ctx.orgId)).limit(1);
    const dosar = curataDosar(d?.continut);
    return {
      pregatit: {
        cerere: {
          // Contactul și IBAN-ul nu sunt necesare scrierii draftului și nu pleacă la model (minimizarea datelor); în draft rămân de completat.
          dosar: CAMPURI_DOSAR.filter((c) => dosar[c.cheie] && !CAMPURI_FARA_AI.has(c.cheie)).map((c) => ({ eticheta: c.eticheta, valoare: dosar[c.cheie] })),
          finantator: g.finantator,
          titlu: g.titlu,
          suma: FORMAT_SUMA(g.suma, g.moneda),
          termen: g.termen,
          cerinte: g.cerinte,
          eligibilitate: g.eligibilitate.map((e) => e.text),
          limba: limba === "en" ? "en" : "ro",
        },
      },
    };
  },
  extern: ({ cerere }) => genereazaDraftGrantAI(cerere),
  salveaza: async (ctx, _pregatit, draft, grantId) => {
    const m = await mesaje();
    if (!draft) return { ok: false, eroare: m.draftEsuat };
    const r = await ctx.db
      .update(granturi)
      .set({ draft, updatedAt: new Date() })
      .where(and(eq(granturi.id, grantId), eq(granturi.orgId, ctx.orgId)))
      .returning({ id: granturi.id });
    if (!r[0]) throw new EroareUtilizator(m.cerereNegasita);
    return { ok: true, draft };
  },
});
