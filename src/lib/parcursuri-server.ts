import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailSuppression, parcursuriDonatori, parcursuriTrimiteri } from "@/lib/db/schema";
import { hashSuprimare, linkDezabonare } from "@/lib/dezabonare";
import { trimiteEmail } from "@/lib/email";
import { anteteDezabonare } from "@/lib/formular230-email-template";
import { escHtml } from "@/lib/html-escape";
import {
  CHEI_PARCURS,
  corpHtml,
  FEREASTRA_ZILE,
  PARCURSURI,
  pasScadent,
  prenumePentruSalut,
  subiectRandat,
  type CheieParcurs,
  type PasParcurs,
  type ValoriParcurs,
} from "@/lib/parcursuri-donatori";

// Selecția donatorilor și trimiterea parcursurilor automate (Welcome, Save, Upgrade). Rulează zilnic din cron (/api/cron/parcursuri-donatori), în contextul
// organizației (app.current_org_id), nu cu o sesiune de utilizator.
//
// Garanții:
//  - primesc doar donatorii cu acord explicit pentru e-mailuri (consimtamant_email = true), nedezabonați, fără „nu contactat” sau „a răspuns”, și care nu sunt pe
//    lista de suprimare (aceeași regulă ca la campania Formular 230);
//  - un pas se revendică în jurnal ÎNAINTE de trimitere (unicitate pe organizație, parcurs, pas, adresă): două rulări simultane nu trimit de două ori; dacă trimiterea
//    eșuează, revendicarea se șterge și pasul se încearcă la rularea următoare;
//  - un donator nu primește mai mult de un e-mail de parcurs la 7 zile (între parcursuri diferite);
//  - plafon de mesaje pe rulare și pe organizație, ca activarea unui parcurs să nu declanșeze un val.

export const MAX_TRIMISE_PE_RULARE = 150;
const PAUZA_INTRE_PARCURSURI_ZILE = 7;
const FEREASTRA_SAVE_ZILE = 50; // un abonament oprit e observat uneori la săptămâni după ultima plată

type Exec = Pick<typeof db, "execute">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type OrganizatieParcursuri = { id: string; slug: string; name: string };

export type ConfigParcurs = { cheie: CheieParcurs; activ: boolean; activDin: Date | null; pasi: PasParcurs[]; esteSalvata: boolean };

export type Candidat = {
  donatorId: string;
  email: string;
  nume: string;
  cheie: CheieParcurs;
  pas: number; // 1-based
  valori: ValoriParcurs;
  slugPagina: string | null;
};

type RandBrut = {
  id: string;
  email: string;
  nume: string;
  total_donat: number;
  ultima_suma: number | null;
  campanie: string | null;
  slug: string | null;
  pagina_activa: boolean | null;
  ancora: Date | string;
};

const lei = (n: number | null | undefined) => new Intl.NumberFormat("ro-RO").format(Math.max(0, Math.round(n ?? 0)));
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

// Filtrele comune: acord de e-mail, nedezabonat, nu „nu contactat”, nu „a răspuns”, nu primit alt parcurs recent.
function filtreComune(orgId: string, cheie: CheieParcurs, pas: number, acum: Date) {
  const limitaPauza = new Date(acum.getTime() - PAUZA_INTRE_PARCURSURI_ZILE * 86_400_000);
  // Pasul 1 respectă pauza față de ORICE parcurs; pașii următori doar față de ALTE parcursuri (pasul anterior din același parcurs e, prin definiție, mai devreme).
  const pauza =
    pas === 1
      ? sql`not exists (select 1 from parcursuri_trimiteri x where x.org_id = ${orgId} and x.email = lower(dr.email) and x.creat_la > ${dataIso(limitaPauza)}::timestamptz)`
      : sql`not exists (select 1 from parcursuri_trimiteri x where x.org_id = ${orgId} and x.email = lower(dr.email) and x.cheie <> ${cheie} and x.creat_la > ${dataIso(limitaPauza)}::timestamptz)`;
  return sql`dr.org_id = ${orgId} and dr.consimtamant_email = true and dr.dezabonat_email_la is null and dr.nu_contactat = false and dr.a_raspuns = false
    and not exists (select 1 from parcursuri_trimiteri y where y.org_id = ${orgId} and y.cheie = ${cheie} and y.pas = ${pas} and y.email = lower(dr.email))
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

const COLOANE = sql`dr.id, dr.email, dr.nume, dr.total_donat, u.suma as ultima_suma, u.campanie, u.slug, u.pagina_activa`;

// Donatorii eligibili pentru un pas al unui parcurs, la momentul `acum`. Doar citește; folosit și de cron, și pentru estimarea din interfață.
export async function candidatiPas(exec: Exec, org: OrganizatieParcursuri, cheie: CheieParcurs, config: ConfigParcurs, indexPas: number, acum: Date): Promise<Candidat[]> {
  const pas = indexPas + 1;
  const def = config.pasi[indexPas];
  if (!def) return [];
  const comune = filtreComune(org.id, cheie, pas, acum);
  let randuri: RandBrut[] = [];
  // Cât de târziu mai poate pleca pasul după ce a devenit scadent.
  let fereastra = FEREASTRA_ZILE;

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
  } else {
    // Upgrade: donatori fideli care n-au donat niciodată lunar (cei care au avut o donație lunară, activă sau oprită, țin de Save); se trimite o singură dată fiecăruia.
    const limita = new Date(acum.getTime() - 90 * 86_400_000);
    randuri = (await exec.execute(sql`
      with ${ULTIMA(org.id)}
      select ${COLOANE}, ${dataIso(acum)}::timestamptz as ancora from donatori_reali dr left join ultima u on u.email = lower(dr.email)
      where ${comune} and dr.numar_donatii >= 3 and dr.ultima_donatie_la >= ${dataIso(limita)}::timestamptz
        and not exists (select 1 from fundraising_donations f where f.org_id = ${org.id} and lower(f.email_donator) = lower(dr.email) and f.recurenta)
      order by dr.total_donat desc limit 500`)) as unknown as RandBrut[];
  }

  return randuri
    .filter((r) => {
      const ancora = new Date(r.ancora);
      return pas === 1 && cheie === "upgrade" ? true : pasScadent(ancora, def.zile, acum, fereastra);
    })
    .map((r) => ({
      donatorId: r.id,
      email: r.email.toLowerCase(),
      nume: r.nume,
      cheie,
      pas,
      slugPagina: r.slug && r.pagina_activa ? r.slug : null,
      valori: {
        prenume: prenumePentruSalut(r.nume),
        organizatie: org.name,
        suma: lei(r.ultima_suma),
        total: lei(r.total_donat),
        campanie: r.campanie ?? "",
      },
    }));
}

export function adresaPagina(baseUrl: string, orgSlug: string, slugPagina: string | null): string | null {
  return slugPagina ? `${baseUrl}/strangere-fonduri/${encodeURIComponent(orgSlug)}/${encodeURIComponent(slugPagina)}` : null;
}

// HTML-ul e-mailului: același stil simplu ca la campania Formular 230, cu mulțumirea, butonul (dacă pasul are unul și există o pagină) și dezabonarea.
export function htmlParcurs(p: { orgName: string; corp: string; valori: ValoriParcurs; buton?: string; link: string | null; linkDezabonare: string }): string {
  const orgName = escHtml(p.orgName);
  const butonHtml =
    p.buton && p.link
      ? `<p style="text-align:center;margin:24px 0;"><a href="${escHtml(p.link)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${escHtml(p.buton)}</a></p>`
      : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #14213d;">
      ${corpHtml(p.corp, { ...p.valori, link: p.link ?? "" })}
      ${butonHtml}
      <p style="color:#94a3b8;font-size:12px;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:14px;">
        Primești acest e-mail pentru că ai donat către ${orgName} și ai acceptat să primești mesaje de la ei.
        <a href="${escHtml(p.linkDezabonare)}" style="color:#94a3b8;">Nu mai vreau e-mailuri</a>.
      </p>
    </div>`;
}

export type RezultatRulare = { trimise: number; esuate: number; sarite: number; intrerupt: boolean };

// O rulare pentru o organizație: pentru fiecare parcurs activ și fiecare pas, trimite donatorilor eligibili (în limita plafonului și a termenului).
export async function ruleazaParcursuriOrg(params: { org: OrganizatieParcursuri; baseUrl: string; deadline: number; acum?: Date; plafon?: number }): Promise<RezultatRulare> {
  const { org, baseUrl, deadline } = params;
  const acum = params.acum ?? new Date();
  const plafon = params.plafon ?? MAX_TRIMISE_PE_RULARE;
  const rez: RezultatRulare = { trimise: 0, esuate: 0, sarite: 0, intrerupt: false };

  const inOrg = async <T>(f: (tx: Tx) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
      return f(tx);
    });

  const config = await inOrg((tx) => citesteConfig(tx, org.id));
  if (!CHEI_PARCURS.some((c) => config[c].activ)) return rez;
  const suprimati = new Set(await inOrg(async (tx) => (await tx.select({ h: emailSuppression.emailHash }).from(emailSuppression).where(eq(emailSuppression.orgId, org.id))).map((r) => r.h)));

  for (const cheie of CHEI_PARCURS) {
    const cfg = config[cheie];
    if (!cfg.activ) continue;
    for (let i = 0; i < cfg.pasi.length; i++) {
      const candidati = (await inOrg((tx) => candidatiPas(tx, org, cheie, cfg, i, acum))).filter((c) => !suprimati.has(hashSuprimare(org.id, c.email)));
      for (const c of candidati) {
        if (rez.trimise >= plafon || Date.now() > deadline) {
          rez.intrerupt = true;
          return rez;
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
        const def = cfg.pasi[i];
        const link = adresaPagina(baseUrl, org.slug, c.slugPagina);
        const linkDez = linkDezabonare(baseUrl, org.id, c.email);
        try {
          await trimiteEmail({
            to: c.email,
            subiect: subiectRandat(def.subiect, c.valori),
            html: htmlParcurs({ orgName: org.name, corp: def.corp, valori: c.valori, buton: def.buton, link, linkDezabonare: linkDez }),
            headers: anteteDezabonare(linkDez),
          });
          await inOrg((tx) => tx.update(parcursuriTrimiteri).set({ stare: "trimis" }).where(and(eq(parcursuriTrimiteri.id, revendicat.id), eq(parcursuriTrimiteri.orgId, org.id))));
          rez.trimise++;
        } catch {
          // Nu a plecat nimic: eliberăm revendicarea ca pasul să fie reîncercat la rularea următoare.
          await inOrg((tx) => tx.delete(parcursuriTrimiteri).where(and(eq(parcursuriTrimiteri.id, revendicat.id), eq(parcursuriTrimiteri.orgId, org.id)))).catch(() => {});
          rez.esuate++;
        }
      }
    }
  }
  return rez;
}
