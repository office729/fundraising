import "server-only";

import { randomBytes } from "node:crypto";

import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { programari, programariConfig, programariDisponibilitate, programariExceptii, programariTipuri } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { emailFaraLink, layoutEmail, paragraf } from "@/lib/email-layout";
import { esteEmailTemporar } from "@/lib/email-temporar";
import { escHtml } from "@/lib/html-escape";
import { raporteazaEroare } from "@/lib/monitoring";
import { creeazaIntalnireMeet, stareGoogle, stergeIntalnireMeet } from "@/lib/google-meet";
import { creeazaIntalnireZoom, stergeIntalnireZoom, zoomConfigurat } from "@/lib/zoom";
import { esteAdresaWeb, esteLinkMeet, esteLinkZoom } from "@/lib/zoom-link";

import {
  curataSetari,
  esteData,
  esteSlotValid,
  localDinUtc,
  sloturiPeZi,
  valideazaPersoana,
  zileDisponibileInLuna,
  type Exceptie,
  type Interval,
  type Ocupat,
  type SetariProgramari,
  type Slot,
} from "./sloturi";

type Tx = typeof db;

// Citirea publică (vizitatori) deschide politicile „programari_publica”; administrarea deschide „platforma”. Contextele sunt setate doar aici, în cod validat.
export async function inContextPublic<T>(f: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.programari_public', 'true', true)`);
    return f(tx as unknown as Tx);
  });
}
export async function inContextPlatforma<T>(f: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    return f(tx as unknown as Tx);
  });
}

const bazaSite = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");
const DESTINATAR_IMPLICIT = "vlad.placinta@alexandrit.ro";

// ---------- citire ----------

export type TipPublic = { id: string; titlu: string; descriere: string | null; durataMin: number; locatie: string | null };

export async function citesteSetari(tx: Tx): Promise<SetariProgramari> {
  const [r] = await tx.select({ config: programariConfig.config }).from(programariConfig).where(eq(programariConfig.id, 1)).limit(1);
  return curataSetari(r?.config);
}

async function citesteProgram(tx: Tx): Promise<{ saptamanal: Interval[]; exceptii: Exceptie[] }> {
  const sapt = await tx.select().from(programariDisponibilitate).orderBy(asc(programariDisponibilitate.zi), asc(programariDisponibilitate.deLa));
  const exc = await tx.select().from(programariExceptii).orderBy(asc(programariExceptii.data));
  return {
    saptamanal: sapt.map((i) => ({ zi: i.zi, de: i.deLa.slice(0, 5), pana: i.panaLa.slice(0, 5) })),
    exceptii: exc.map((e) => ({ data: e.data, tip: e.tip === "liber" ? "liber" : "program", de: e.deLa, pana: e.panaLa })),
  };
}

export async function tipuriActive(tx: Tx): Promise<TipPublic[]> {
  const r = await tx.select().from(programariTipuri).where(eq(programariTipuri.activ, true)).orderBy(asc(programariTipuri.ordine), asc(programariTipuri.creatLa));
  return r.map((t) => ({ id: t.id, titlu: t.titlu, descriere: t.descriere, durataMin: t.durataMin, locatie: t.locatie }));
}

async function ocupateIntre(tx: Tx, de: Date, pana: Date): Promise<Ocupat[]> {
  const r = await tx
    .select({ start: programari.startLa, sfarsit: programari.sfarsitLa })
    .from(programari)
    .where(and(eq(programari.stare, "confirmata"), lt(programari.startLa, pana), gte(programari.sfarsitLa, de)));
  return r.map((x) => ({ start: x.start, sfarsit: x.sfarsit }));
}

export async function paginaPublica(): Promise<{ setari: SetariProgramari; tipuri: TipPublic[] }> {
  return inContextPublic(async (tx) => ({ setari: await citesteSetari(tx), tipuri: await tipuriActive(tx) }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function incarcaCalendar(tx: Tx, tipId: string) {
  if (!UUID_RE.test(tipId)) return null;
  const [tip] = await tx.select().from(programariTipuri).where(and(eq(programariTipuri.id, tipId), eq(programariTipuri.activ, true))).limit(1);
  if (!tip) return null;
  const setari = await citesteSetari(tx);
  const program = await citesteProgram(tx);
  const acum = new Date();
  const ocupate = await ocupateIntre(tx, new Date(acum.getTime() - 86_400_000), new Date(acum.getTime() + (setari.orizontZile + 2) * 86_400_000));
  return { tip, setari, ...program, ocupate, acum };
}

export async function zileDisponibile(tipId: string, an: number, luna: number): Promise<string[]> {
  if (!Number.isInteger(an) || !Number.isInteger(luna) || luna < 1 || luna > 12 || an < 2024 || an > 2100) return [];
  return inContextPublic(async (tx) => {
    const c = await incarcaCalendar(tx, tipId);
    if (!c) return [];
    return zileDisponibileInLuna({ an, luna, durataMin: c.tip.durataMin, config: c.setari, saptamanal: c.saptamanal, exceptii: c.exceptii, ocupate: c.ocupate, acum: c.acum });
  });
}

export async function sloturiZi(tipId: string, data: string): Promise<Slot[]> {
  if (!esteData(data)) return [];
  return inContextPublic(async (tx) => {
    const c = await incarcaCalendar(tx, tipId);
    if (!c) return [];
    return sloturiPeZi({ data, durataMin: c.tip.durataMin, config: c.setari, saptamanal: c.saptamanal, exceptii: c.exceptii, ocupate: c.ocupate, acum: c.acum });
  });
}

// ---------- rezervare ----------

export type RezultatRezervare = { ok: true; token: string; startLa: string; sfarsitLa: string; mesaj: string; locatie?: string | null; emailTrimis?: boolean } | { ok: false; eroare: string; campuri?: Record<string, string>; slotOcupat?: boolean };

// `echipa`: programare făcută de echipa platformei pentru un înscris (telefonul nu e obligatoriu, iar echipa nu primește și emailul „Programare nouă”).
// `locatie` (doar la `echipa`): linkul întâlnirii ales chiar la programare; are prioritate față de linkul fix al tipului și față de linkul Zoom automat.
export type IntrareRezervare = { tipId: string; startUtc: string; persoana: unknown; capcana?: string; sursa?: string; orgId?: string | null; echipa?: boolean; locatie?: string | null };

export async function rezerva(i: IntrareRezervare): Promise<RezultatRezervare> {
  // Capcană pentru roboți: un câmp ascuns oamenilor. Dacă are conținut, răspundem ca la succes și nu salvăm nimic.
  if (typeof i.capcana === "string" && i.capcana.trim() !== "") return { ok: true, token: "x", startLa: i.startUtc, sfarsitLa: i.startUtc, mesaj: "" };
  const start = new Date(i.startUtc);
  if (Number.isNaN(start.getTime()) || !UUID_RE.test(i.tipId)) return { ok: false, eroare: "Alege din nou ziua și ora." };

  const ip = await obtineIpClient();
  const [okIp, okGlobal] = await Promise.all([verificaLimitaRata("programare-ip", ip, 6, 60), verificaLimitaRata("programare-global", "toate", 200, 60)]);
  if (!okIp || !okGlobal) return { ok: false, eroare: "Prea multe încercări de pe această conexiune. Scrie-ne la vlad.placinta@alexandrit.ro și te programăm manual." };
  return salveazaRezervare(i);
}

// Partea de salvare (fără antete și limite de cereri): validează slotul sub blocare și scrie programarea; emailurile pleacă după salvare.
export async function salveazaRezervare(i: IntrareRezervare): Promise<RezultatRezervare> {
  const start = new Date(i.startUtc);
  if (Number.isNaN(start.getTime()) || !UUID_RE.test(i.tipId)) return { ok: false, eroare: "Alege din nou ziua și ora." };
  let rezultat: RezultatRezervare;
  let dateEmail: { setari: SetariProgramari; p: typeof programari.$inferSelect; linkAles: boolean } | null = null;
  try {
    rezultat = await inContextPublic(async (tx) => {
      // Un singur flux de rezervare odată: două persoane nu pot lua același slot.
      await tx.execute(sql`select pg_advisory_xact_lock(74610001)`);
      const c = await incarcaCalendar(tx, i.tipId);
      if (!c) return { ok: false as const, eroare: "Acest tip de întâlnire nu mai e disponibil." };
      const v = valideazaPersoana(i.persoana, c.setari.cereTelefon && !i.echipa);
      if (!v.ok) return { ok: false as const, eroare: "Verifică câmpurile marcate.", campuri: v.erori as Record<string, string> };
      if (esteEmailTemporar(v.date.email)) return { ok: false as const, eroare: "Folosește o adresă de email reală, nu una temporară.", campuri: { email: "Folosește o adresă de email reală." } };
      if (!esteSlotValid(start, { durataMin: c.tip.durataMin, config: c.setari, saptamanal: c.saptamanal, exceptii: c.exceptii, ocupate: c.ocupate, acum: c.acum })) {
        return { ok: false as const, eroare: "Ora aleasă tocmai a fost ocupată sau nu mai e disponibilă. Alege alta.", slotOcupat: true };
      }
      // Linkul ales de echipa platformei la programare (opțional): trebuie să fie o adresă web completă.
      let locatieEchipa: string | null = null;
      if (i.echipa && typeof i.locatie === "string" && i.locatie.trim()) {
        const l = i.locatie.trim();
        if (!esteAdresaWeb(l) || l.length > 300) return { ok: false as const, eroare: "Linkul întâlnirii trebuie să fie o adresă web completă, care începe cu https://.", campuri: { locatie: "Lipește linkul complet (https://…)." } };
        locatieEchipa = l;
      }
      const sfarsit = new Date(start.getTime() + c.tip.durataMin * 60_000);
      const token = randomBytes(24).toString("base64url");
      const [p] = await tx
        .insert(programari)
        .values({
          tipId: c.tip.id,
          tipTitlu: c.tip.titlu,
          durataMin: c.tip.durataMin,
          locatie: locatieEchipa ?? c.tip.locatie,
          startLa: start,
          sfarsitLa: sfarsit,
          nume: v.date.nume,
          email: v.date.email,
          telefon: v.date.telefon || null,
          organizatie: v.date.organizatie || null,
          mesaj: v.date.mesaj || null,
          token,
          orgId: i.orgId ?? null,
          sursa: typeof i.sursa === "string" ? i.sursa.slice(0, 30) : null,
        })
        .returning();
      dateEmail = { setari: c.setari, p: p!, linkAles: locatieEchipa !== null };
      return { ok: true as const, token, startLa: start.toISOString(), sfarsitLa: sfarsit.toISOString(), mesaj: c.setari.mesajConfirmare };
    });
  } catch (e) {
    raporteazaEroare("programare-rezervare", e);
    return { ok: false, eroare: "Nu am putut salva programarea. Încearcă din nou sau scrie-ne la vlad.placinta@alexandrit.ro." };
  }
  if (rezultat.ok && dateEmail) {
    const d = dateEmail as { setari: SetariProgramari; p: typeof programari.$inferSelect; linkAles: boolean };
    // Link Google Meet sau Zoom creat special pentru această întâlnire (dacă e conectat unul dintre ele și echipa nu a ales alt link); altfel rămâne linkul ales sau cel fix al tipului. Emailurile pleacă cu linkul final.
    const cuLink = d.linkAles ? null : await ataseazaLinkAutomat(d.p);
    const p = cuLink ?? d.p;
    const emailTrimis = await trimiteEmailuriProgramare(p, d.setari, "noua");
    rezultat = { ...rezultat, locatie: p.locatie, emailTrimis };
  }
  return rezultat;
}

// Creează linkul întâlnirii după ce programarea e salvată (nu în tranzacția cu blocare: apelul de rețea nu trebuie să țină slotul blocat) și îl pune în „locatie”.
// Întâi Google Meet (dacă contul Google e conectat), apoi Zoom (dacă e configurat). Dacă niciunul nu răspunde, programarea rămâne valabilă, cu linkul fix al tipului; eroarea se raportează.
async function ataseazaLinkAutomat(p: typeof programari.$inferSelect): Promise<typeof programari.$inferSelect | null> {
  const subiect = `${p.tipTitlu}: ${p.nume}${p.organizatie ? ` (${p.organizatie})` : ""}`;
  const salveaza = async (link: string, curata: () => Promise<unknown>, eticheta: string) => {
    try {
      const [u] = await inContextPlatforma((tx) => tx.update(programari).set({ locatie: link }).where(eq(programari.id, p.id)).returning());
      return u ?? null;
    } catch (e) {
      raporteazaEroare(`programare-${eticheta}-salvare`, e);
      await curata();
      return null;
    }
  };
  if ((await stareGoogle()).conectat) {
    const m = await creeazaIntalnireMeet({ subiect, start: p.startLa, durataMin: p.durataMin, agenda: p.mesaj, tokenProgramare: p.token });
    if (m.ok) return salveaza(m.linkIntrare, () => stergeIntalnireMeet(p.token), "meet");
    raporteazaEroare("programare-meet", new Error(m.eroare));
  }
  if (zoomConfigurat()) {
    const z = await creeazaIntalnireZoom({ subiect, start: p.startLa, durataMin: p.durataMin, agenda: p.mesaj });
    if (z.ok) return salveaza(z.linkIntrare, () => stergeIntalnireZoom(z.linkIntrare), "zoom");
    raporteazaEroare("programare-zoom", new Error(z.eroare));
  }
  return null;
}

// La anulare se șterge și întâlnirea creată automat (Meet: evenimentul din calendar, găsit după tokenul programării; Zoom: după id-ul din link). Un link ales de echipă nu se atinge.
async function stergeLinkAutomat(p: typeof programari.$inferSelect): Promise<void> {
  if (esteLinkMeet(p.locatie)) await stergeIntalnireMeet(p.token);
  else await stergeIntalnireZoom(p.locatie);
}

// ---------- vizualizare / anulare prin token ----------

export type ProgramareVizibila = {
  id: string;
  token: string;
  tipTitlu: string;
  durataMin: number;
  locatie: string | null;
  startLa: string;
  sfarsitLa: string;
  nume: string;
  stare: string;
  trecuta: boolean;
  mesajConfirmare: string;
};

export async function programareDupaToken(token: string): Promise<ProgramareVizibila | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 80 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  return inContextPublic(async (tx) => {
    const [p] = await tx.select().from(programari).where(eq(programari.token, token)).limit(1);
    if (!p) return null;
    const setari = await citesteSetari(tx);
    return { id: p.id, token: p.token, tipTitlu: p.tipTitlu, durataMin: p.durataMin, locatie: p.locatie, startLa: p.startLa.toISOString(), sfarsitLa: p.sfarsitLa.toISOString(), nume: p.nume, stare: p.stare, trecuta: p.startLa.getTime() < Date.now(), mesajConfirmare: setari.mesajConfirmare };
  });
}

export async function anuleazaDupaToken(token: string): Promise<{ ok: boolean; eroare?: string }> {
  if (!(await verificaLimitaRata("programare-anulare", await obtineIpClient(), 20, 60))) return { ok: false, eroare: "Prea multe încercări. Încearcă mai târziu." };
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,80}$/.test(token)) return { ok: false, eroare: "Link invalid." };
  let anulata: typeof programari.$inferSelect | null = null;
  let setari: SetariProgramari | null = null;
  await inContextPublic(async (tx) => {
    const [p] = await tx
      .update(programari)
      .set({ stare: "anulata", anulatLa: new Date(), anulatDe: "persoana" })
      .where(and(eq(programari.token, token), eq(programari.stare, "confirmata")))
      .returning();
    if (p) {
      anulata = p;
      setari = await citesteSetari(tx);
    }
  });
  if (!anulata || !setari) return { ok: false, eroare: "Programarea nu mai poate fi anulată (era deja anulată sau s-a încheiat)." };
  await stergeLinkAutomat(anulata as typeof programari.$inferSelect);
  await trimiteEmailuriProgramare(anulata, setari, "anulata");
  return { ok: true };
}

// ---------- emailuri ----------

const formatData = (d: Date) => new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

export function linkProgramare(token: string): string {
  return `${bazaSite()}/programare/${token}`;
}

// Un email pentru persoană (confirmare / anulare) și unul pentru echipă. Best-effort: o eroare de trimitere nu strică programarea.
async function trimiteEmailuriProgramare(p: typeof programari.$inferSelect, setari: SetariProgramari, tip: "noua" | "anulata" | "anulata-echipa"): Promise<boolean> {
  if (!emailConfigurat()) return false;
  let trimisPersoana = false;
  const cand = formatData(p.startLa);
  const link = linkProgramare(p.token);
  const adresa = p.locatie && esteAdresaWeb(p.locatie) ? p.locatie.trim() : null;
  const loc = !p.locatie
    ? ""
    : adresa
      ? paragraf(`<strong>${esteLinkZoom(adresa) ? "Intri în ședință (Zoom)" : esteLinkMeet(adresa) ? "Intri în ședință (Google Meet)" : "Link întâlnire"}:</strong> <a href="${escHtml(adresa)}">${escHtml(adresa)}</a>`) +
        (esteLinkZoom(adresa) ? paragraf("Intră cu 2–3 minute înainte. Gazda te primește din sala de așteptare Zoom.") : esteLinkMeet(adresa) ? paragraf("Intră cu 2–3 minute înainte. Dacă Meet îți cere acces, gazda te primește în ședință.") : "")
      : paragraf(`<strong>Unde:</strong> ${escHtml(p.locatie)}`);
  try {
    if (tip === "noua") {
      await trimiteEmail({
        to: p.email,
        subiect: `Programare confirmată: ${p.tipTitlu}, ${cand}`,
        html: layoutEmail({
          previzualizare: `${p.tipTitlu}, ${cand}`,
          titlu: "Programarea ta e confirmată",
          corpHtml: [
            paragraf(`Bună, ${escHtml(p.nume)}!`),
            paragraf(`<strong>${escHtml(p.tipTitlu)}</strong><br>${escHtml(cand)} (ora României), ${p.durataMin} de minute.`),
            loc,
            paragraf(escHtml(setari.mesajConfirmare)),
            paragraf(`Adaugă întâlnirea în calendar: <a href="${escHtml(link)}/ics">descarcă fișierul .ics</a>.`),
          ].join(""),
          buton: { text: "Vezi, anulează sau mută programarea", url: link },
        }),
        replyTo: setari.emailNotificare || DESTINATAR_IMPLICIT,
      });
    } else {
      // anulată (de persoană sau de echipă)
      await trimiteEmail({
        to: p.email,
        subiect: `Programare anulată: ${p.tipTitlu}, ${cand}`,
        html: layoutEmail({
          titlu: "Programarea a fost anulată",
          corpHtml: [paragraf(`Bună, ${escHtml(p.nume)}!`), paragraf(`Programarea <strong>${escHtml(p.tipTitlu)}</strong> din ${escHtml(cand)} a fost anulată.`), paragraf("Poți alege oricând o altă oră.")].join(""),
          buton: { text: "Programează din nou", url: `${bazaSite()}/programare` },
        }),
      });
    }
    trimisPersoana = true;
  } catch (e) {
    raporteazaEroare("programare-email-persoana", e);
  }
  // Când echipa anulează sau programează ea însăși, echipa știe deja: se anunță doar persoana.
  if (tip === "anulata-echipa") return trimisPersoana;
  if (tip === "noua" && p.sursa?.startsWith("echipa")) return trimisPersoana;
  try {
    const rand = (e: string, v: string) => paragraf(`<strong>${escHtml(e)}:</strong> ${v}`);
    await trimiteEmail({
      to: setari.emailNotificare || process.env.INTERES_EMAIL_TO?.trim() || DESTINATAR_IMPLICIT,
      subiect: `${tip === "noua" ? "Programare nouă" : "Programare anulată"}: ${p.nume}, ${cand}`,
      html: layoutEmail({
        titlu: tip === "noua" ? "Programare nouă" : "Programare anulată de persoană",
        corpHtml: [
          rand("Când", escHtml(cand)),
          rand("Tip", `${escHtml(p.tipTitlu)} (${p.durataMin} min)`),
          rand("Nume", escHtml(p.nume)),
          rand("Email", emailFaraLink(p.email)),
          rand("Telefon", p.telefon ? escHtml(p.telefon) : "nu a lăsat"),
          rand("Organizație", p.organizatie ? escHtml(p.organizatie) : "—"),
          ...(p.mesaj ? [rand("Mesaj", escHtml(p.mesaj))] : []),
          rand("De unde", escHtml(p.sursa ?? "—")),
        ].join(""),
        buton: { text: "Deschide programările", url: `${bazaSite()}/platform-admin/programari` },
      }),
      replyTo: p.email,
    });
  } catch (e) {
    raporteazaEroare("programare-email-echipa", e);
  }
  return trimisPersoana;
}

// ---------- administrare (doar echipa platformei) ----------

export type RandProgramare = { id: string; tipTitlu: string; durataMin: number; locatie: string | null; startLa: string; nume: string; email: string; telefon: string | null; organizatie: string | null; mesaj: string | null; stare: string; sursa: string | null; creatLa: string };

export async function listeazaProgramari(): Promise<RandProgramare[]> {
  return inContextPlatforma(async (tx) => {
    const r = await tx.select().from(programari).orderBy(desc(programari.startLa)).limit(500);
    return r.map((p) => ({ id: p.id, tipTitlu: p.tipTitlu, durataMin: p.durataMin, locatie: p.locatie, startLa: p.startLa.toISOString(), nume: p.nume, email: p.email, telefon: p.telefon, organizatie: p.organizatie, mesaj: p.mesaj, stare: p.stare, sursa: p.sursa, creatLa: p.creatLa.toISOString() }));
  });
}

export type DateAdmin = {
  zoomConfigurat: boolean;
  google: { configurat: boolean; conectat: boolean; email: string | null };
  setari: SetariProgramari;
  tipuri: { id: string; titlu: string; descriere: string; durataMin: number; locatie: string; activ: boolean }[];
  saptamanal: Interval[];
  exceptii: { data: string; tip: "liber" | "program"; de: string; pana: string; nota: string }[];
};

export async function dateAdministrare(): Promise<DateAdmin> {
  return inContextPlatforma(async (tx) => {
    const setari = await citesteSetari(tx);
    const tipuri = await tx.select().from(programariTipuri).orderBy(asc(programariTipuri.ordine), asc(programariTipuri.creatLa));
    const { saptamanal } = await citesteProgram(tx);
    const exc = await tx.select().from(programariExceptii).where(gte(programariExceptii.data, sql`(current_date - 1)`)).orderBy(asc(programariExceptii.data));
    return {
      zoomConfigurat: zoomConfigurat(),
      google: await stareGoogle(),
      setari,
      tipuri: tipuri.map((t) => ({ id: t.id, titlu: t.titlu, descriere: t.descriere ?? "", durataMin: t.durataMin, locatie: t.locatie ?? "", activ: t.activ })),
      saptamanal,
      exceptii: exc.map((e) => ({ data: e.data, tip: e.tip === "liber" ? ("liber" as const) : ("program" as const), de: (e.deLa ?? "").slice(0, 5), pana: (e.panaLa ?? "").slice(0, 5), nota: e.nota ?? "" })),
    };
  });
}

// Starea unei programări, schimbată de echipă. Anularea o anunță și pe persoană.
export async function schimbaStareDeEchipa(id: string, stare: "confirmata" | "anulata" | "efectuata", email: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  let p: typeof programari.$inferSelect | undefined;
  let setari: SetariProgramari | null = null;
  await inContextPlatforma(async (tx) => {
    [p] = await tx
      .update(programari)
      .set({ stare, anulatLa: stare === "anulata" ? new Date() : null, anulatDe: stare === "anulata" ? email : null })
      .where(eq(programari.id, id))
      .returning();
    setari = await citesteSetari(tx);
  });
  if (!p) return false;
  if (stare === "anulata") await stergeLinkAutomat(p as typeof programari.$inferSelect);
  if (stare === "anulata" && setari) await trimiteEmailuriProgramare(p, setari, "anulata-echipa");
  return true;
}

// Programarea unui înscris (organizație cu cont sau lead), făcută de echipa platformei: același calendar și aceleași reguli de disponibilitate ca la rezervarea publică,
// dar fără limitele de cereri ale vizitatorilor. Persoana primește confirmarea 1 la 1, cu linkul Zoom al întâlnirii.
export type OriginePersoana = "organizatie" | "lead" | "alta";
export async function programeazaDeEchipa(i: { tipId: string; startUtc: string; persoana: unknown; orgId?: string | null; origine: OriginePersoana; locatie?: string | null }): Promise<RezultatRezervare> {
  if (i.orgId != null && !UUID_RE.test(i.orgId)) return { ok: false, eroare: "Organizație invalidă." };
  const origine: OriginePersoana = i.origine === "organizatie" || i.origine === "lead" ? i.origine : "alta";
  return salveazaRezervare({ tipId: i.tipId, startUtc: i.startUtc, persoana: i.persoana, orgId: origine === "organizatie" ? (i.orgId ?? null) : null, sursa: `echipa-${origine}`, echipa: true, locatie: i.locatie ?? null });
}

export async function randDupaToken(token: string): Promise<RandProgramare | null> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  return inContextPlatforma(async (tx) => {
    const [p] = await tx.select().from(programari).where(eq(programari.token, token)).limit(1);
    return p ? { id: p.id, tipTitlu: p.tipTitlu, durataMin: p.durataMin, locatie: p.locatie, startLa: p.startLa.toISOString(), nume: p.nume, email: p.email, telefon: p.telefon, organizatie: p.organizatie, mesaj: p.mesaj, stare: p.stare, sursa: p.sursa, creatLa: p.creatLa.toISOString() } : null;
  });
}

export { localDinUtc };
