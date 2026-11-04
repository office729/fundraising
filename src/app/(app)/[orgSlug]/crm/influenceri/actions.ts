"use server";

import { sql } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";

import { apeleazaClaude, type RezultatClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum, mesajFaraCheieAi } from "@/lib/ai-org/consum-server";
import { inregistreazaAudit } from "@/lib/audit";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { withOrgAdmin, withOrgFaze, withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTr } from "@/lib/i18n/tr-server";
import { cerereAi, citesteVariante, instructiuniAi, sablonMesaje, type DateMesaj } from "@/lib/influenceri/mesaje";
import {
  CATEGORII,
  categorieDin,
  curataSetari,
  esteCanal,
  esteUuid,
  text,
  type Canal,
  type FiltreLista,
  type SetariUrmarire,
} from "@/lib/influenceri/reguli";
import type { RandImport } from "@/lib/influenceri/import-tabel";
import {
  adaugaNota,
  cazuriDistribuibile,
  citesteCoordonare,
  citesteFisa,
  citesteSetari,
  faraRaspuns,
  importaRanduri,
  linkPentru,
  listaInfluenceri,
  listaMembri,
  marcheazaRaspuns,
  marcheazaTrimis,
  nuMaiContactam,
  numarScadente,
  pentruMesaj,
  preia,
  programeazaPas,
  salveazaInfluencer,
  salveazaSetari,
  salveazaTinta,
  schimbaEtapa,
  stareAzi,
  stergeLaCerere,
  type RezultatTrimis,
} from "@/lib/influenceri/server";
import type { CampuriInfluencer, DateInfluenceri, Fisa, MesajePregatite, Rez, RezultatImport, RezultatSalvare } from "@/lib/influenceri/tipuri";

// Modulul Influenceri (inclus din pachetul IMPACT; poarta e în layout.tsx, iar pachetul se verifică și aici, pe server).
// Toată echipa lucrează cu influencerii; doar proprietarul și administratorii pot șterge o fișă la cerere sau schimba setările de urmărire.
// Nimic de aici nu trimite un mesaj: platforma pregătește textul și linkul, colega le trimite manual, iar „trimis” se marchează doar din „Am trimis”.
const OPT = { modul: "influenceri" as const };

const esteAdmin = (ctx: OrgContext) => ctx.role === "owner" || ctx.role === "admin";
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/+$/, "");

// Rezultatul unei acțiuni: eroare de validare => mesaj clar; redirecturile și erorile de framework trec mai departe; restul se raportează și devin un mesaj general.
async function incearca<T>(zona: string, f: () => Promise<T>, mesaj?: string): Promise<Rez<T>> {
  try {
    return { ok: true, data: await f(), mesaj };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof EroareUtilizator) return { ok: false, eroare: e.message, coordonare: e.name === "EroareCoordonare" };
    const t = await getTr();
    return { ok: false, eroare: mesajSigur(e, t("Nu s-a putut face. Încearcă din nou.", "That did not work. Please try again."), zona) };
  }
}

// Acțiunile care nu întorc date: rulează și răspunsul rămâne gol.
const fara = async (f: () => Promise<unknown>): Promise<null> => {
  await f();
  return null;
};

// ───────── Pagina ─────────

// null = tabelele modulului nu există încă (documentation/influenceri.sql nu a fost aplicat): pagina explică, nu cade.
export const obtineDate = withOrgSession(async (ctx, filtre: FiltreLista): Promise<DateInfluenceri | null> => {
  const [t] = (await ctx.db.execute(sql`select to_regclass('public.influenceri')::text as t`)) as unknown as { t: string | null }[];
  if (!t?.t) return null;
  const setari = await citesteSetari(ctx.db, ctx.orgId);
  const [lista, scadenteAzi, membri, cazuri, azi, ai] = await Promise.all([
    listaInfluenceri(ctx.db, ctx.orgId, filtre),
    numarScadente(ctx.db, ctx.orgId),
    listaMembri(ctx.db, ctx.orgId),
    cazuriDistribuibile(ctx.db, ctx.orgId),
    stareAzi(ctx.db, ctx.orgId, ctx.userId),
    citesteConfigAi(ctx.db, ctx.orgId, false),
  ]);
  return {
    randuri: lista.randuri,
    trunchiat: lista.trunchiat,
    scadenteAzi,
    membri,
    cazuri,
    eu: { id: ctx.userId, esteAdmin: esteAdmin(ctx) },
    setari,
    azi,
    aiConectat: ai.conectat,
    siteUrl: siteUrl(),
  };
}, OPT);

export const fisaAction = withOrgSession(async (ctx, id: string): Promise<Rez<Fisa>> => {
  const t = await getTr();
  return incearca("influenceri-fisa", async () => {
    const setari = await citesteSetari(ctx.db, ctx.orgId);
    const f = await citesteFisa(ctx.db, ctx.orgId, String(id), ctx.userId, siteUrl(), setari);
    if (!f) throw new EroareUtilizator(t("Influencerul nu mai există.", "The influencer no longer exists."));
    return f;
  });
}, OPT);

// ───────── Adăugare, editare, import ─────────

export const salveazaAction = withOrgSession(async (ctx, id: string | null, campuri: CampuriInfluencer): Promise<Rez<RezultatSalvare>> => {
  const t = await getTr();
  return incearca("influenceri-salvare", () => salveazaInfluencer(ctx.db, ctx.orgId, ctx.userId, id ? String(id) : null, campuri && typeof campuri === "object" ? campuri : {}), t("Salvat.", "Saved."));
}, OPT);

// Un lot de până la 200 de rânduri (clientul trimite fișierul pe bucăți); `primulRand` doar pentru mesajele de eroare.
export const importaAction = withOrgSession(async (ctx, randuri: RandImport[], primulRand: number): Promise<Rez<RezultatImport>> => {
  return incearca("influenceri-import", async () => {
    const lista = Array.isArray(randuri) ? randuri.slice(0, 200) : [];
    const campuri: CampuriInfluencer[] = lista
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        numePublic: r.numePublic,
        nume: r.nume,
        instagram: r.instagram,
        facebook: r.facebook,
        tiktok: r.tiktok,
        youtube: r.youtube,
        urmaritori: r.urmaritori,
        categorie: categorieDin(r.categorie) ?? undefined,
        domeniu: r.domeniu,
        publicTinta: r.publicTinta,
        oras: r.oras,
        judet: r.judet,
        tara: r.tara,
        email: r.email,
        telefon: r.telefon,
        sursaDate: r.sursaDate,
        note: r.note,
      }));
    return importaRanduri(ctx.db, ctx.orgId, ctx.userId, campuri, Math.max(2, Math.min(100_000, Math.round(Number(primulRand)) || 2)));
  });
}, OPT);

// ───────── Centrul de contactare ─────────

type PregatitMesaje = {
  orgId: string;
  userId: string;
  link: string;
  coordonare: MesajePregatite["coordonare"];
  date: DateMesaj;
  ai: { cheie: string; model: string } | null;
  avertisment: string | null;
  locale: "ro" | "en";
};

const MESAJ_FARA_PROFIL = (t: (ro: string, en: string) => string) => t("Completează profilul pentru acest canal în fișă.", "Fill in the profile for this channel on the profile page.");

// Pregătește linkul unic și cele trei variante de mesaj (AI pe contul Anthropic al organizației, sau șablon dacă AI nu e conectat). Nu trimite nimic.
// Pașii: (1) tranzacție scurtă — verificări, link, coordonare; (2) apelul AI, fără conexiune la baza de date; (3) consumul se înregistrează chiar dacă apelul a eșuat.
export const mesajeAction = withOrgFaze<[string, string, string, string, boolean], PregatitMesaje, RezultatClaude | null, Rez<MesajePregatite>>({
  opts: OPT,
  pregateste: async (ctx, id, cazId, canal, indicatii, cuAi) => {
    const t = await getTr();
    const locale = await getLocale();
    try {
      if (!esteUuid(id) || !esteUuid(cazId) || !esteCanal(canal)) throw new EroareUtilizator(t("Alege campania și platforma.", "Choose the campaign and the platform."));
      const inf = await pentruMesaj(ctx.db, ctx.orgId, id);
      if (!inf) throw new EroareUtilizator(t("Influencerul nu mai există.", "The influencer no longer exists."));
      if (inf.nuContacta || inf.etapa === "refuz" || inf.etapa === "stop") throw new EroareUtilizator(t("Acest influencer a refuzat sau a cerut să nu mai fie contactat.", "This influencer declined or asked not to be contacted again."));
      const are = canal === "email" ? inf.email : inf[canal as Exclude<Canal, "email">];
      if (!are) throw new EroareUtilizator(MESAJ_FARA_PROFIL(t));
      const [caz] = await cazuriDistribuibile(ctx.db, ctx.orgId, cazId);
      if (!caz) throw new EroareUtilizator(t("Campania nu poate fi distribuită public (trebuie să fie activă și cu pagină publică).", "The campaign cannot be shared publicly (it must be active and have a public page)."));
      if (!(await verificaLimitaRata("influenceri-mesaje", ctx.userId, 80, 60))) throw new EroareUtilizator(t("Prea multe mesaje pregătite într-o oră. Încearcă puțin mai târziu.", "Too many messages prepared in an hour. Please try a little later."));
      const setari = await citesteSetari(ctx.db, ctx.orgId);
      const link = await linkPentru(ctx.db, ctx.orgId, ctx.userId, siteUrl(), id, caz, canal, inf.numePublic);
      const coordonare = await citesteCoordonare(ctx.db, ctx.orgId, id, ctx.userId, setari.blocareColegZile);
      const date: DateMesaj = {
        influencer: { nume: inf.numePublic, categorie: CATEGORII.find((c) => c.k === inf.categorie)?.ro ?? inf.categorie, domeniu: inf.domeniu, oras: inf.oras, tara: inf.tara },
        campanie: { titlu: caz.titlu, judet: caz.judet, ramasLei: caz.ramasLei },
        link: link.url,
        expeditor: ctx.userName ?? ctx.userEmail.split("@")[0] ?? "",
        organizatie: ctx.orgName,
        indicatii: text(indicatii, 400),
      };
      let ai: PregatitMesaje["ai"] = null;
      let avertisment: string | null = null;
      if (cuAi) {
        const cfg = await citesteConfigAi(ctx.db, ctx.orgId);
        if (!cfg.conectat || !cfg.cheie) avertisment = mesajFaraCheieAi(locale, cfg.ilizibila);
        else ai = { cheie: cfg.cheie, model: cfg.model };
      }
      return { pregatit: { orgId: ctx.orgId, userId: ctx.userId, link: link.url, coordonare, date, ai, avertisment, locale: locale === "en" ? "en" : "ro" } };
    } catch (e) {
      unstable_rethrow(e);
      if (e instanceof EroareUtilizator) return { gata: { ok: false, eroare: e.message } as Rez<MesajePregatite> };
      return { gata: { ok: false, eroare: mesajSigur(e, t("Nu am putut pregăti mesajul. Încearcă din nou.", "We could not prepare the message. Please try again."), "influenceri-mesaje") } as Rez<MesajePregatite> };
    }
  },
  extern: async (p) => {
    if (!p.ai) return null;
    // Către AI pleacă doar numele public, categoria, nișa, orașul și datele publice ale campaniei (vezi mesaje.ts); contactul și notele rămân în platformă.
    return apeleazaClaude({
      cheie: p.ai.cheie,
      model: p.ai.model,
      system: instructiuniAi(p.date.organizatie),
      mesaje: [{ role: "user", content: cerereAi(p.date) }],
      maxTokens: 2500,
      efort: "medium",
      locale: p.locale,
    });
  },
  salveaza: async (ctx, p, rez) => {
    const t = await getTr();
    try {
      // Consumul se scrie și când apelul a eșuat parțial.
      if (rez) await inregistreazaConsum(ctx.db, { orgId: p.orgId, userId: p.userId, instrument: "influenceri", model: rez.model, utilizare: rez.utilizare, costUsd: rez.costUsd });
      let sursa: MesajePregatite["sursa"] = "sablon";
      let avertisment = p.avertisment;
      let variante = sablonMesaje(p.date);
      if (rez) {
        const citite = rez.ok ? citesteVariante(rez.text, p.link) : null;
        if (citite) {
          variante = citite;
          sursa = "ai";
        } else avertisment = rez.ok ? t("AI-ul nu a întors mesaje valide. Am pus un șablon.", "The AI did not return valid messages. We used a template.") : rez.eroare;
      }
      return { ok: true, data: { link: p.link, variante, sursa, avertisment, coordonare: p.coordonare } } as Rez<MesajePregatite>;
    } catch (e) {
      unstable_rethrow(e);
      return { ok: false, eroare: mesajSigur(e, t("Nu am putut pregăti mesajul. Încearcă din nou.", "We could not prepare the message. Please try again."), "influenceri-mesaje") } as Rez<MesajePregatite>;
    }
  },
});

// „Am trimis”: singura acțiune care marchează un mesaj ca trimis. Programează verificarea; nu trimite nimic.
export const trimisAction = withOrgSession(async (ctx, id: string, canal: string, mesaj: string, cazId: string | null, confirmaPreluare: boolean): Promise<Rez<RezultatTrimis>> => {
  const t = await getTr();
  return incearca(
    "influenceri-trimis",
    async () => {
      const setari = await citesteSetari(ctx.db, ctx.orgId);
      return marcheazaTrimis(ctx.db, ctx.orgId, ctx.userId, { id: String(id), canal: String(canal), text: String(mesaj ?? ""), cazId, confirmaPreluare: confirmaPreluare === true }, setari);
    },
    t("Marcat ca trimis. Verificarea e programată; nimic nu se trimite automat.", "Marked as sent. The check is scheduled; nothing is sent automatically."),
  );
}, OPT);

// ───────── Răspuns, etapă, pas următor, notă ─────────

export const raspunsAction = withOrgSession(async (ctx, id: string, raspuns: string): Promise<Rez> => {
  const t = await getTr();
  return incearca("influenceri-raspuns", () => fara(() => marcheazaRaspuns(ctx.db, ctx.orgId, ctx.userId, String(id), String(raspuns ?? ""))), t("Răspuns notat.", "Reply noted."));
}, OPT);

export const etapaAction = withOrgSession(async (ctx, id: string, etapa: string, nota?: string): Promise<Rez> => {
  const t = await getTr();
  return incearca("influenceri-etapa", () => fara(() => schimbaEtapa(ctx.db, ctx.orgId, ctx.userId, esteAdmin(ctx), String(id), String(etapa), nota ? String(nota) : undefined)), t("Etapă schimbată.", "Stage changed."));
}, OPT);

export const pasAction = withOrgSession(async (ctx, id: string, ziua: string, nota: string): Promise<Rez> => {
  const t = await getTr();
  return incearca("influenceri-pas", () => fara(() => programeazaPas(ctx.db, ctx.orgId, ctx.userId, String(id), String(ziua), String(nota ?? ""))), t("Pas următor programat.", "Next step scheduled."));
}, OPT);

export const faraRaspunsAction = withOrgSession(async (ctx, id: string): Promise<Rez<{ revenireLa: string | null; limitaAtinsa: boolean }>> => {
  const t = await getTr();
  return incearca("influenceri-fara-raspuns", async () => faraRaspuns(ctx.db, ctx.orgId, ctx.userId, String(id), await citesteSetari(ctx.db, ctx.orgId)), t("Notat.", "Noted."));
}, OPT);

export const notaAction = withOrgSession(async (ctx, id: string, nota: string): Promise<Rez> => {
  const t = await getTr();
  return incearca("influenceri-nota", () => fara(() => adaugaNota(ctx.db, ctx.orgId, ctx.userId, String(id), String(nota ?? ""))), t("Notă salvată.", "Note saved."));
}, OPT);

export const preiaAction = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  const t = await getTr();
  return incearca("influenceri-preia", () => fara(() => preia(ctx.db, ctx.orgId, ctx.userId, String(id), ctx.userName ?? ctx.userEmail)), t("Ai preluat influencerul.", "You took over this influencer."));
}, OPT);

export const nuContactamAction = withOrgSession(async (ctx, id: string, motiv: string): Promise<Rez> => {
  const t = await getTr();
  return incearca("influenceri-nu-contactam", () => fara(() => nuMaiContactam(ctx.db, ctx.orgId, ctx.userId, String(id), String(motiv ?? ""))), t("Marcat „Nu mai contactăm”. Mesajele și revenirile sunt blocate.", "Marked “Do not contact”. Messages and follow-ups are blocked."));
}, OPT);

// ───────── Administrare ─────────

export const stergeAction = withOrgAdmin(async (ctx, id: string): Promise<Rez> => {
  const t = await getTr();
  return incearca(
    "influenceri-stergere",
    async () => {
      await stergeLaCerere(ctx.db, ctx.orgId, String(id));
      // Jurnalul platformei păstrează doar faptul ștergerii (fără nume sau profiluri).
      await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "influencer_sters_la_cerere", entitate: "influencer", entitateId: esteUuid(id) ? id : null });
      return null;
    },
    t("Șters. Rămân doar amprentele profilurilor, ca să nu fie readăugate.", "Deleted. Only the profile fingerprints remain, so they are not added again."),
  );
}, OPT);

export const setariAction = withOrgAdmin(async (ctx, setari: SetariUrmarire): Promise<Rez<SetariUrmarire>> => {
  const t = await getTr();
  return incearca(
    "influenceri-setari",
    async () => {
      const curat = curataSetari(setari);
      await salveazaSetari(ctx.db, ctx.orgId, curat);
      return curat;
    },
    t("Setări salvate.", "Settings saved."),
  );
}, OPT);

// Ținta zilnică personală de „Influenceri identificați”: doar cine o vrea (gol = fără țintă).
export const tintaAction = withOrgSession(async (ctx, zi: number | null): Promise<Rez<null>> => {
  const t = await getTr();
  return incearca("influenceri-tinta", () => fara(() => salveazaTinta(ctx.db, ctx.orgId, ctx.userId, zi === null ? null : Number(zi))), t("Ținta a fost salvată.", "Target saved."));
}, OPT);

