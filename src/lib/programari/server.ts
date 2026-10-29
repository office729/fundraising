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

export type RezultatRezervare = { ok: true; token: string; startLa: string; sfarsitLa: string; mesaj: string } | { ok: false; eroare: string; campuri?: Record<string, string>; slotOcupat?: boolean };

export type IntrareRezervare = { tipId: string; startUtc: string; persoana: unknown; capcana?: string; sursa?: string; orgId?: string | null };

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
  let dateEmail: { setari: SetariProgramari; p: typeof programari.$inferSelect } | null = null;
  try {
    rezultat = await inContextPublic(async (tx) => {
      // Un singur flux de rezervare odată: două persoane nu pot lua același slot.
      await tx.execute(sql`select pg_advisory_xact_lock(74610001)`);
      const c = await incarcaCalendar(tx, i.tipId);
      if (!c) return { ok: false as const, eroare: "Acest tip de întâlnire nu mai e disponibil." };
      const v = valideazaPersoana(i.persoana, c.setari.cereTelefon);
      if (!v.ok) return { ok: false as const, eroare: "Verifică câmpurile marcate.", campuri: v.erori as Record<string, string> };
      if (esteEmailTemporar(v.date.email)) return { ok: false as const, eroare: "Folosește o adresă de email reală, nu una temporară.", campuri: { email: "Folosește o adresă de email reală." } };
      if (!esteSlotValid(start, { durataMin: c.tip.durataMin, config: c.setari, saptamanal: c.saptamanal, exceptii: c.exceptii, ocupate: c.ocupate, acum: c.acum })) {
        return { ok: false as const, eroare: "Ora aleasă tocmai a fost ocupată sau nu mai e disponibilă. Alege alta.", slotOcupat: true };
      }
      const sfarsit = new Date(start.getTime() + c.tip.durataMin * 60_000);
      const token = randomBytes(24).toString("base64url");
      const [p] = await tx
        .insert(programari)
        .values({
          tipId: c.tip.id,
          tipTitlu: c.tip.titlu,
          durataMin: c.tip.durataMin,
          locatie: c.tip.locatie,
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
      dateEmail = { setari: c.setari, p: p! };
      return { ok: true as const, token, startLa: start.toISOString(), sfarsitLa: sfarsit.toISOString(), mesaj: c.setari.mesajConfirmare };
    });
  } catch (e) {
    raporteazaEroare("programare-rezervare", e);
    return { ok: false, eroare: "Nu am putut salva programarea. Încearcă din nou sau scrie-ne la vlad.placinta@alexandrit.ro." };
  }
  if (rezultat.ok && dateEmail) {
    const d = dateEmail as { setari: SetariProgramari; p: typeof programari.$inferSelect };
    await trimiteEmailuriProgramare(d.p, d.setari, "noua");
  }
  return rezultat;
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
  await trimiteEmailuriProgramare(anulata, setari, "anulata");
  return { ok: true };
}

// ---------- emailuri ----------

const formatData = (d: Date) => new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

export function linkProgramare(token: string): string {
  return `${bazaSite()}/programare/${token}`;
}

// Un email pentru persoană (confirmare / anulare) și unul pentru echipă. Best-effort: o eroare de trimitere nu strică programarea.
async function trimiteEmailuriProgramare(p: typeof programari.$inferSelect, setari: SetariProgramari, tip: "noua" | "anulata" | "anulata-echipa"): Promise<void> {
  if (!emailConfigurat()) return;
  const cand = formatData(p.startLa);
  const link = linkProgramare(p.token);
  const loc = p.locatie ? paragraf(`<strong>Unde:</strong> ${escHtml(p.locatie)}`) : "";
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
  } catch (e) {
    raporteazaEroare("programare-email-persoana", e);
  }
  // Când echipa anulează, echipa știe deja: se anunță doar persoana.
  if (tip === "anulata-echipa") return;
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
  if (stare === "anulata" && setari) await trimiteEmailuriProgramare(p, setari, "anulata-echipa");
  return true;
}

export { localDinUtc };
