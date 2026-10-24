import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { emailSuppression, parcursuriDonatori, parcursuriTrimiteri } from "@/lib/db/schema";
import { hashSuprimare, linkDezabonare } from "@/lib/dezabonare";
import { trimiteEmail } from "@/lib/email";
import { anteteDezabonare } from "@/lib/formular230-email-template";
import { escHtml } from "@/lib/html-escape";
import { raporteazaAvertisment } from "@/lib/monitoring";
import {
  CHEI_PARCURS,
  CONTROL_PROCENT,
  corpHtml,
  esteInGrupDeControl,
  FEREASTRA_CONVERSIE_ZILE,
  FEREASTRA_ZILE,
  formatLei,
  MAX_EMAILURI_30_ZILE,
  ORGANIZATIE_NOUA_ZILE,
  PARCURSURI,
  pasScadent,
  PLAFON_ZI_GLOBAL,
  PLAFON_ZI_ORGANIZATIE,
  PLAFON_ZI_ORGANIZATIE_NOUA,
  prenumePentruSalut,
  adresaPagina,
  esteRespingereClara,
  propuneLunar,
  subiectRandat,
  subsolOrganizatie,
  sumaLunaraSugerata,
  type CheieParcurs,
  type PasParcurs,
  type RezultatParcurs,
  type ValoriParcurs,
} from "@/lib/parcursuri-donatori";

// Selecția donatorilor și trimiterea parcursurilor automate (Welcome, Save, Upgrade, Reactivare, A doua donație). Rulează zilnic din cron
// (/api/cron/parcursuri-donatori), în contextul organizației (app.current_org_id), nu cu o sesiune de utilizator.
//
// Garanții:
//  - primesc doar donatorii cu acord explicit pentru e-mailuri (consimtamant_email = true, dat de ei în formularul public, nu doar declarat de echipă),
//    nedezabonați, fără „nu contactat” sau „a răspuns”, și care nu sunt pe lista de suprimare (aceeași regulă ca la campania Formular 230);
//  - un pas se revendică în jurnal ÎNAINTE de trimitere (unicitate pe organizație, parcurs, pas, adresă): două rulări simultane nu trimit de două ori; dacă serverul de
//    e-mail respinge clar mesajul, revendicarea se șterge și pasul se încearcă la rularea următoare; la un timeout (necunoscut dacă a plecat) rămâne, ca să nu trimitem de două ori;
//  - un donator nu primește mai mult de un e-mail de parcurs la 7 zile și cel mult 3 la 30 de zile;
//  - plafoane: pe rulare, pe zi pentru fiecare organizație (mai mic în primele 30 de zile) și pe zi pentru toate la un loc;
//  - la Upgrade și Reactivare, 10% dintre donatori (aleși stabil după adresă) nu primesc mesajul: grupul de control cu care comparăm rezultatele.

export const MAX_TRIMISE_PE_RULARE = 150;
const PAUZA_INTRE_PARCURSURI_ZILE = 7;
const FEREASTRA_SAVE_ZILE = 50; // un abonament oprit e observat uneori la săptămâni după ultima plată

type Exec = Pick<typeof db, "execute">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// createdAt: pentru plafonul mai mic al organizațiilor noi. adresa/telefon/emailContact: identifică ONG-ul în subsolul e-mailului; emailContact e și adresa de răspuns.
export type OrganizatieParcursuri = { id: string; slug: string; name: string; createdAt?: Date; adresa?: string | null; telefon?: string | null; emailContact?: string | null };

export type ConfigParcurs = { cheie: CheieParcurs; activ: boolean; activDin: Date | null; pasi: PasParcurs[]; esteSalvata: boolean };

export type Candidat = {
  donatorId: string;
  email: string;
  nume: string;
  cheie: CheieParcurs;
  pas: number; // 1-based
  valori: ValoriParcurs;
  slugPagina: string | null;
  mediePeDonatie: number;
};

type RandBrut = {
  id: string;
  email: string;
  nume: string;
  total_donat: number;
  numar_donatii: number;
  ultima_suma: number | null;
  campanie: string | null;
  slug: string | null;
  pagina_activa: boolean | null;
  ancora: Date | string;
};

const dataIso = (d: Date) => d.toISOString();

// Configurarea unui parcurs: cea salvată de organizație, sau cea implicită (oprită).
export async function citesteConfig(exec: Exec, orgId: string): Promise<Record<CheieParcurs, ConfigParcurs>> {
  const randuri = (await exec.execute(sql`select cheie, activ, activ_din, pasi from parcursuri_donatori where org_id = ${orgId}`)) as unknown as { cheie: CheieParcurs; activ: boolean; activ_din: Date | string | null; pasi: PasParcurs[] }[];
  const rez = {} as Record<CheieParcurs, ConfigParcurs>;
  for (const cheie of CHEI_PARCURS) {
    const r = randuri.find((x) => x.cheie === cheie);
    rez[cheie] = r
      ? { cheie, activ: r.activ, activDin: r.activ_din ? new Date(r.activ_din) : null, pasi: Array.isArray(r.pasi) && r.pasi.length ? r.pasi : PARCURSURI[cheie].pasi, esteSalvata: true }
      : { cheie, activ: false, activDin: null, pasi: PARCURSURI[cheie].pasi, esteSalvata: false };
  }
  return rez;
}

// Filtrele comune: acord de e-mail dat de donator, nedezabonat, nu „nu contactat”, nu „a răspuns”, nu primit alt parcurs recent, nu depășit plafonul lunar.
function filtreComune(orgId: string, cheie: CheieParcurs, pas: number, acum: Date) {
  const limitaPauza = new Date(acum.getTime() - PAUZA_INTRE_PARCURSURI_ZILE * 86_400_000);
  const limita30 = new Date(acum.getTime() - 30 * 86_400_000);
  // Pasul 1 respectă pauza față de ORICE e-mail de parcurs trimis; pașii următori doar față de ALTE parcursuri (pasul anterior din același parcurs e, prin definiție, mai devreme).
  // Rândurile „control” nu sunt e-mailuri trimise, deci nu intră în pauză.
  const pauza =
    pas === 1
      ? sql`not exists (select 1 from parcursuri_trimiteri x where x.org_id = ${orgId} and x.email = lower(dr.email) and x.stare <> 'control' and x.creat_la > ${dataIso(limitaPauza)}::timestamptz)`
      : sql`not exists (select 1 from parcursuri_trimiteri x where x.org_id = ${orgId} and x.email = lower(dr.email) and x.stare <> 'control' and x.cheie <> ${cheie} and x.creat_la > ${dataIso(limitaPauza)}::timestamptz)`;
  return sql`dr.org_id = ${orgId} and dr.consimtamant_email = true and coalesce(dr.consimtamant_email_sursa, '') <> 'declarat_echipa'
    and dr.dezabonat_email_la is null and dr.nu_contactat = false and dr.a_raspuns = false
    and not exists (select 1 from parcursuri_trimiteri y where y.org_id = ${orgId} and y.cheie = ${cheie} and y.pas = ${pas} and y.email = lower(dr.email))
    and (select count(*) from parcursuri_trimiteri z where z.org_id = ${orgId} and z.email = lower(dr.email) and z.stare = 'trimis' and z.creat_la > ${dataIso(limita30)}::timestamptz) < ${MAX_EMAILURI_30_ZILE}
    and ${pauza}`;
}

// Ultima donație reușită a fiecărui donator (campania și suma), ca să putem lega mesajul de ce a susținut.
const ULTIMA = (orgId: string) => sql`
  ultima as (
    select distinct on (lower(d.email_donator)) lower(d.email_donator) as email, p.titlu as campanie, p.slug as slug, (p.status = 'activa') as pagina_activa, d.suma as suma
    from fundraising_donations d join fundraising_pages p on p.id = d.page_id
    where d.org_id = ${orgId} and d.status = 'reusita' and d.email_donator is not null
    order by lower(d.email_donator), d.created_at desc
  )`;

const COLOANE = sql`dr.id, dr.email, dr.nume, dr.total_donat, dr.numar_donatii, u.suma as ultima_suma, u.campanie, u.slug, u.pagina_activa`;

// Donatorii eligibili pentru un pas al unui parcurs, la momentul `acum`. Doar citește; folosit și de cron, și pentru estimarea din interfață.
export async function candidatiPas(exec: Exec, org: OrganizatieParcursuri, cheie: CheieParcurs, config: ConfigParcurs, indexPas: number, acum: Date): Promise<Candidat[]> {
  const pas = indexPas + 1;
  const def = config.pasi[indexPas];
  if (!def) return [];
  const comune = filtreComune(org.id, cheie, pas, acum);
  let randuri: RandBrut[] = [];
  // Cât de târziu mai poate pleca pasul după ce a devenit scadent.
  let fereastra = FEREASTRA_ZILE;
  // Primul pas pleacă imediat ce donatorul devine eligibil (nu are un eveniment de la care se numără zilele).
  let imediat = false;

  if (cheie === "welcome") {
    if (!config.activDin) return [];
    if (pas === 1) {
      randuri = (await exec.execute(sql`
        with ${ULTIMA(org.id)}
        select ${COLOANE}, dr.prima_donatie_la as ancora from donatori_reali dr left join ultima u on u.email = lower(dr.email)
        where ${comune} and dr.numar_donatii = 1 and dr.prima_donatie_la >= ${dataIso(config.activDin)}::timestamptz`)) as unknown as RandBrut[];
    } else {
      randuri = (await exec.execute(sql`
        with ${ULTIMA(org.id)}
        select ${COLOANE}, t.creat_la as ancora from parcursuri_trimiteri t join donatori_reali dr on dr.org_id = t.org_id and lower(dr.email) = t.email left join ultima u on u.email = lower(dr.email)
        where ${comune} and t.org_id = ${org.id} and t.cheie = 'welcome' and t.pas = ${pas - 1} and t.stare = 'trimis' and dr.numar_donatii = 1`)) as unknown as RandBrut[];
    }
  } else if (cheie === "a_doua_donatie") {
    // Donatori la a doua donație (nu lunară), după pornirea parcursului; mesajul pleacă la câteva zile după donație.
    if (!config.activDin) return [];
    randuri = (await exec.execute(sql`
      with ${ULTIMA(org.id)}
      select ${COLOANE}, dr.ultima_donatie_la as ancora from donatori_reali dr left join ultima u on u.email = lower(dr.email)
      where ${comune} and dr.numar_donatii = 2 and dr.ultima_donatie_la >= ${dataIso(config.activDin)}::timestamptz
        and not exists (select 1 from fundraising_donations f where f.org_id = ${org.id} and lower(f.email_donator) = lower(dr.email) and f.recurenta)`)) as unknown as RandBrut[];
  } else if (cheie === "save") {
    fereastra = pas === 1 ? FEREASTRA_SAVE_ZILE : FEREASTRA_ZILE;
    // Donatori lunari fără niciun abonament activ și fără nicio donație după ultima plată recurentă (altfel au revenit).
    const baza = sql`
      sub as (
        select lower(d.email_donator) as email, max(d.created_at) filter (where d.recurenta) as ultima_plata, bool_or(d.abonament_activ) filter (where d.recurenta) as are_activ
        from fundraising_donations d
        where d.org_id = ${org.id} and d.status = 'reusita' and d.email_donator is not null
        group by lower(d.email_donator)
        having count(*) filter (where d.recurenta) > 0
      )`;
    if (pas === 1) {
      randuri = (await exec.execute(sql`
        with ${ULTIMA(org.id)}, ${baza}
        select ${COLOANE}, s.ultima_plata as ancora from sub s join donatori_reali dr on dr.org_id = ${org.id} and lower(dr.email) = s.email left join ultima u on u.email = lower(dr.email)
        where ${comune} and s.are_activ = false and dr.ultima_donatie_la <= s.ultima_plata + interval '1 day'`)) as unknown as RandBrut[];
    } else {
      randuri = (await exec.execute(sql`
        with ${ULTIMA(org.id)}, ${baza}
        select ${COLOANE}, t.creat_la as ancora from parcursuri_trimiteri t join sub s on s.email = t.email join donatori_reali dr on dr.org_id = t.org_id and lower(dr.email) = t.email left join ultima u on u.email = lower(dr.email)
        where ${comune} and t.org_id = ${org.id} and t.cheie = 'save' and t.pas = ${pas - 1} and t.stare = 'trimis' and s.are_activ = false and dr.ultima_donatie_la <= s.ultima_plata + interval '1 day'`)) as unknown as RandBrut[];
    }
  } else if (cheie === "upgrade") {
    // Upgrade: donatori fideli care n-au donat niciodată lunar (cei care au avut o donație lunară, activă sau oprită, țin de Save); se trimite o singură dată fiecăruia.
    imediat = true;
    const limita = new Date(acum.getTime() - 90 * 86_400_000);
    randuri = (await exec.execute(sql`
      with ${ULTIMA(org.id)}
      select ${COLOANE}, ${dataIso(acum)}::timestamptz as ancora from donatori_reali dr left join ultima u on u.email = lower(dr.email)
      where ${comune} and dr.numar_donatii >= 3 and dr.ultima_donatie_la >= ${dataIso(limita)}::timestamptz
        and not exists (select 1 from fundraising_donations f where f.org_id = ${org.id} and lower(f.email_donator) = lower(dr.email) and f.recurenta)
      order by dr.total_donat desc limit 500`)) as unknown as RandBrut[];
  } else if (pas === 1) {
    // Reactivare: ultima donație acum 12–24 de luni, fără donație lunară activă; se trimite o singură dată fiecăruia, cei mai generoși întâi.
    imediat = true;
    const dinaintea = new Date(acum.getTime() - 365 * 86_400_000);
    const pana = new Date(acum.getTime() - 730 * 86_400_000);
    randuri = (await exec.execute(sql`
      with ${ULTIMA(org.id)}
      select ${COLOANE}, ${dataIso(acum)}::timestamptz as ancora from donatori_reali dr left join ultima u on u.email = lower(dr.email)
      where ${comune} and dr.numar_donatii >= 1 and dr.ultima_donatie_la <= ${dataIso(dinaintea)}::timestamptz and dr.ultima_donatie_la >= ${dataIso(pana)}::timestamptz
        and not exists (select 1 from fundraising_donations f where f.org_id = ${org.id} and lower(f.email_donator) = lower(dr.email) and f.recurenta and f.abonament_activ)
      order by dr.total_donat desc limit 500`)) as unknown as RandBrut[];
  } else {
    // Pașii următori: doar cei care n-au donat de la primul e-mail.
    randuri = (await exec.execute(sql`
      with ${ULTIMA(org.id)}
      select ${COLOANE}, t.creat_la as ancora from parcursuri_trimiteri t join donatori_reali dr on dr.org_id = t.org_id and lower(dr.email) = t.email left join ultima u on u.email = lower(dr.email)
      where ${comune} and t.org_id = ${org.id} and t.cheie = 'reactivare' and t.pas = ${pas - 1} and t.stare = 'trimis' and dr.ultima_donatie_la < t.creat_la`)) as unknown as RandBrut[];
  }

  return randuri
    .filter((r) => (imediat && pas === 1 ? true : pasScadent(new Date(r.ancora), def.zile, acum, fereastra)))
    .map((r) => ({
      donatorId: r.id,
      email: r.email.toLowerCase(),
      nume: r.nume,
      cheie,
      pas,
      slugPagina: r.slug && r.pagina_activa ? r.slug : null,
      mediePeDonatie: r.numar_donatii > 0 ? r.total_donat / r.numar_donatii : 0,
      valori: {
        prenume: prenumePentruSalut(r.nume),
        organizatie: org.name,
        // Suma ultimei donații online; dacă lipsește (donator fără donație online), media pe donație din fișa lui, ca textul să nu spună „0 lei”.
        suma: formatLei(r.ultima_suma ?? (r.numar_donatii > 0 ? Math.round(r.total_donat / r.numar_donatii) : 0)),
        total: formatLei(r.total_donat),
        campanie: r.campanie ?? "",
      },
    }));
}

// HTML-ul e-mailului: același stil simplu ca la campania Formular 230, cu mulțumirea, butonul (dacă pasul are unul și există o pagină) și dezabonarea.
export function htmlParcurs(p: { orgName: string; corp: string; valori: ValoriParcurs; buton?: string; link: string | null; linkDezabonare: string; identificare?: string }): string {
  const identificare = escHtml(p.identificare ?? p.orgName);
  const butonHtml =
    p.buton && p.link
      ? `<p style="text-align:center;margin:24px 0;"><a href="${escHtml(p.link)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${escHtml(p.buton)}</a></p>`
      : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #14213d;">
      ${corpHtml(p.corp, { ...p.valori, link: p.link ?? "" })}
      ${butonHtml}
      <p style="color:#64748b;font-size:12px;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:14px;line-height:1.5;">
        Primești acest mesaj de la ${identificare}, pentru că ai donat și ai ales să primești mesaje de la ei. Mesajul a fost trimis prin platforma Alexandrit, în numele organizației.
        Poți să te retragi oricând: <a href="${escHtml(p.linkDezabonare)}" style="color:#64748b;">Nu mai vreau e-mailuri</a>.
      </p>
    </div>`;
}

export type RezultatRulare = { trimise: number; esuate: number; sarite: number; control: number; fara_link: number; intrerupt: boolean };

const organizatieNoua = (org: OrganizatieParcursuri, acum: Date) => Boolean(org.createdAt) && acum.getTime() - (org.createdAt as Date).getTime() < ORGANIZATIE_NOUA_ZILE * 86_400_000;

// O rulare pentru o organizație: pentru fiecare parcurs activ și fiecare pas, trimite donatorilor eligibili (în limita plafoanelor și a termenului).
export async function ruleazaParcursuriOrg(params: { org: OrganizatieParcursuri; baseUrl: string; deadline: number; acum?: Date; plafon?: number }): Promise<RezultatRulare> {
  const { org, baseUrl, deadline } = params;
  const acum = params.acum ?? new Date();
  const plafon = params.plafon ?? MAX_TRIMISE_PE_RULARE;
  const rez: RezultatRulare = { trimise: 0, esuate: 0, sarite: 0, control: 0, fara_link: 0, intrerupt: false };

  const inOrg = async <T>(f: (tx: Tx) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
      return f(tx);
    });

  const config = await inOrg((tx) => citesteConfig(tx, org.id));
  if (!CHEI_PARCURS.some((c) => config[c].activ)) return rez;
  const suprimati = new Set(await inOrg(async (tx) => (await tx.select({ h: emailSuppression.emailHash }).from(emailSuppression).where(eq(emailSuppression.orgId, org.id))).map((r) => r.h)));
  // Pagina de rezervă pentru donatorii a căror campanie s-a închis.
  const [implicita] = await inOrg(async (tx) => (await tx.execute(sql`select slug from fundraising_pages where org_id = ${org.id} and status = 'activa' order by created_at desc limit 1`)) as unknown as { slug: string }[]);
  const plafonZi = organizatieNoua(org, acum) ? PLAFON_ZI_ORGANIZATIE_NOUA : PLAFON_ZI_ORGANIZATIE;
  const identificare = subsolOrganizatie(org);

  for (const cheie of CHEI_PARCURS) {
    const cfg = config[cheie];
    if (!cfg.activ) continue;
    for (let i = 0; i < cfg.pasi.length; i++) {
      const def = cfg.pasi[i];
      const candidati = (await inOrg((tx) => candidatiPas(tx, org, cheie, cfg, i, acum))).filter((c) => !suprimati.has(hashSuprimare(org.id, c.email)));
      for (const c of candidati) {
        if (rez.trimise >= plafon || Date.now() > deadline) {
          rez.intrerupt = true;
          return rez;
        }
        // Un mesaj cu buton fără nicio pagină de donație activă ar pleca fără nicio acțiune: nu îl trimitem (se încearcă din nou când există o campanie activă).
        const slug = c.slugPagina ?? implicita?.slug ?? null;
        const link = adresaPagina(baseUrl, org.slug, slug, propuneLunar(cheie, def.buton) ? { suma: cheie === "save" ? undefined : sumaLunaraSugerata(c.mediePeDonatie) } : undefined);
        if (def.buton && !link) {
          rez.fara_link++;
          continue;
        }
        // Grupul de control (doar la primul pas): înregistrat ca „control”, fără e-mail; nu mai e ales din nou.
        if (c.pas === 1 && esteInGrupDeControl(c.email, cheie)) {
          const [inregistrat] = await inOrg((tx) =>
            tx.insert(parcursuriTrimiteri).values({ orgId: org.id, cheie, pas: c.pas, email: c.email, donatorId: c.donatorId, stare: "control" }).onConflictDoNothing().returning({ id: parcursuriTrimiteri.id }),
          );
          if (inregistrat) rez.control++;
          continue;
        }
        // Revendicare înainte de trimitere: unicitatea (org, parcurs, pas, adresă) oprește dublura chiar dacă două rulări se suprapun.
        const [revendicat] = await inOrg((tx) =>
          tx
            .insert(parcursuriTrimiteri)
            .values({ orgId: org.id, cheie, pas: c.pas, email: c.email, donatorId: c.donatorId, stare: "in_curs" })
            .onConflictDoNothing()
            .returning({ id: parcursuriTrimiteri.id }),
        );
        if (!revendicat) {
          rez.sarite++;
          continue;
        }
        const elibereaza = () => inOrg((tx) => tx.delete(parcursuriTrimiteri).where(and(eq(parcursuriTrimiteri.id, revendicat.id), eq(parcursuriTrimiteri.orgId, org.id)))).catch(() => {});
        // Plafoane zilnice: pe organizație și pe platformă. La depășire eliberăm revendicarea (nu a plecat nimic) și ne oprim.
        const [inLimitaOrg, inLimitaGlobala] = [await verificaLimitaRata("parcursuri-org", org.id, plafonZi, 1440), await verificaLimitaRata("parcursuri-global", "toate", PLAFON_ZI_GLOBAL, 1440)];
        if (!inLimitaOrg || !inLimitaGlobala) {
          await elibereaza();
          rez.intrerupt = true;
          return rez;
        }
        const linkDez = linkDezabonare(baseUrl, org.id, c.email);
        try {
          await trimiteEmail({
            to: c.email,
            subiect: subiectRandat(def.subiect, c.valori),
            html: htmlParcurs({ orgName: org.name, corp: def.corp, valori: c.valori, buton: def.buton, link, linkDezabonare: linkDez, identificare }),
            headers: anteteDezabonare(linkDez),
            ...(org.emailContact ? { replyTo: org.emailContact } : {}),
          });
        } catch (e) {
          // Respins clar: nu a plecat nimic, eliberăm revendicarea. La timeout o lăsăm (poate a plecat): mai bine un pas lipsă decât un mesaj dublu.
          const respins = esteRespingereClara(e);
          if (respins) await elibereaza();
          raporteazaAvertisment("parcursuri", `trimitere eșuată (${cheie}, pas ${c.pas}, ${respins ? "respins" : "necunoscut"})`, { cod: String((e as { code?: unknown })?.code ?? "") });
          rez.esuate++;
          continue;
        }
        // A plecat. Dacă marcarea eșuează, NU ștergem revendicarea (altfel mesajul ar pleca a doua oară): rămâne „in_curs” și e raportat.
        try {
          await inOrg((tx) => tx.update(parcursuriTrimiteri).set({ stare: "trimis" }).where(and(eq(parcursuriTrimiteri.id, revendicat.id), eq(parcursuriTrimiteri.orgId, org.id))));
        } catch {
          raporteazaAvertisment("parcursuri", `e-mail trimis, dar marcarea a eșuat (${cheie}, pas ${c.pas})`);
        }
        rez.trimise++;
      }
    }
  }
  return rez;
}

// Donatorii care pot primi parcursuri automate, din totalul bazei: acord explicit dat de donator, nedezabonat, nemarcat „nu contactat”, cu adresă de forma unui e-mail.
// „Fără acord” (nu au fost întrebați) și „refuz” sunt separate: primii nu primesc nimic automat, dar pot fi invitați să bifeze la următoarea donație.
export type ContactabiliParcursuri = { total: number; pot: number; faraAcord: number; refuz: number; dezabonati: number; acordDeclarat: number };
export async function contactabiliParcursuri(exec: Exec, orgId: string): Promise<ContactabiliParcursuri> {
  const [r] = (await exec.execute(sql`
    select count(*)::int as total,
      (count(*) filter (where consimtamant_email = true and coalesce(consimtamant_email_sursa, '') <> 'declarat_echipa' and dezabonat_email_la is null and nu_contactat = false and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'))::int as pot,
      (count(*) filter (where consimtamant_email is null))::int as fara_acord,
      (count(*) filter (where consimtamant_email = false))::int as refuz,
      (count(*) filter (where dezabonat_email_la is not null))::int as dezabonati,
      (count(*) filter (where consimtamant_email = true and consimtamant_email_sursa = 'declarat_echipa'))::int as acord_declarat
    from donatori_reali where org_id = ${orgId}`)) as unknown as { total: number; pot: number; fara_acord: number; refuz: number; dezabonati: number; acord_declarat: number }[];
  return { total: r?.total ?? 0, pot: r?.pot ?? 0, faraAcord: r?.fara_acord ?? 0, refuz: r?.refuz ?? 0, dezabonati: r?.dezabonati ?? 0, acordDeclarat: r?.acord_declarat ?? 0 };
}

// Conversiile unui grup: donatorii care au un rând cu starea cerută (trimis sau control) și au donat în FEREASTRA_CONVERSIE_ZILE zile de la primul lui rând.
async function conversii(exec: Exec, orgId: string, cheie: CheieParcurs, stare: "trimis" | "control") {
  const doarLunare = cheie === "upgrade" || cheie === "a_doua_donatie" ? sql`and d.recurenta` : sql``;
  return (await exec.execute(sql`
    with prim as (
      select email, min(creat_la) as prima from parcursuri_trimiteri
      where org_id = ${orgId} and cheie = ${cheie} and stare = ${stare} group by email
    ),
    conv as (
      select p.email, p.prima,
        (select min(d.created_at) from fundraising_donations d where d.org_id = ${orgId} and lower(d.email_donator) = p.email and d.status = 'reusita' ${doarLunare}
          and d.created_at > p.prima and d.created_at <= p.prima + ${FEREASTRA_CONVERSIE_ZILE} * interval '1 day') as la,
        (select coalesce(sum(d.suma), 0) from fundraising_donations d where d.org_id = ${orgId} and lower(d.email_donator) = p.email and d.status = 'reusita' ${doarLunare}
          and d.created_at > p.prima and d.created_at <= p.prima + ${FEREASTRA_CONVERSIE_ZILE} * interval '1 day') as suma
      from prim p
    )
    select c.la is not null as convertit, c.suma::int as suma, extract(epoch from (c.la - c.prima)) / 86400.0 as zile,
      (select max(t.pas) from parcursuri_trimiteri t where t.org_id = ${orgId} and t.cheie = ${cheie} and t.email = c.email and t.stare = 'trimis' and (c.la is null or t.creat_la <= c.la)) as pas_atribuit
    from conv c`)) as unknown as { convertit: boolean; suma: number; zile: number | null; pas_atribuit: number | null }[];
}

// Ce a adus un parcurs: din donatorii care au primit cel puțin un e-mail din serie, câți au donat în FEREASTRA_CONVERSIE_ZILE zile de la primul e-mail (la Upgrade și A doua donație:
// o donație lunară), după cât timp (mediana) și cât au donat. Fiecare conversie se atribuie ultimului pas trimis înainte de donație. Numără donațiile online reușite (nu importurile).
// Unde există grup de control, arată și cât au donat cei care n-au primit mesajul, în aceeași fereastră.
export async function rezultateParcurs(exec: Exec, orgId: string, cheie: CheieParcurs, nrPasi: number): Promise<RezultatParcurs> {
  const randuri = await conversii(exec, orgId, cheie, "trimis");
  const trimisePePas = (await exec.execute(sql`
    select pas, count(*)::int as n from parcursuri_trimiteri where org_id = ${orgId} and cheie = ${cheie} and stare = 'trimis' group by pas`)) as unknown as { pas: number; n: number }[];

  const convertitii = randuri.filter((r) => r.convertit);
  const zile = convertitii.map((r) => Number(r.zile)).filter((z) => Number.isFinite(z)).sort((a, b) => a - b);
  const mediana = zile.length === 0 ? null : zile.length % 2 === 1 ? zile[(zile.length - 1) / 2] : (zile[zile.length / 2 - 1] + zile[zile.length / 2]) / 2;

  let control: RezultatParcurs["control"] = null;
  if ((CONTROL_PROCENT[cheie] ?? 0) > 0) {
    const c = await conversii(exec, orgId, cheie, "control");
    control = { inscrisi: c.length, convertiti: c.filter((r) => r.convertit).length };
  }
  return {
    inscrisi: randuri.length,
    convertiti: convertitii.length,
    medianaZile: mediana === null ? null : Math.round(mediana * 10) / 10,
    venit: convertitii.reduce((s, r) => s + Number(r.suma), 0),
    pasi: Array.from({ length: nrPasi }, (_, i) => ({
      pas: i + 1,
      trimise: trimisePePas.find((x) => x.pas === i + 1)?.n ?? 0,
      convertiti: convertitii.filter((r) => r.pas_atribuit === i + 1).length,
    })),
    control,
  };
}
