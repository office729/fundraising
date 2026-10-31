// Parcursuri automate pentru donatori: trei serii gata făcute de e-mailuri (Welcome, Save, Upgrade), cu pași simpli și texte editabile de organizație.
// Fișier fără importuri (partea pură: definiții, texte implicite, validare și randare), ca să se poată testa direct. Trimiterea și selecția donatorilor sunt în
// lib/parcursuri-server.ts.
//
// Reguli care nu se negociază (aplicate în selecție, nu aici): primesc doar donatorii care au bifat acordul pentru e-mailuri, nu s-au dezabonat și nu sunt pe lista de
// suprimare; cine a răspuns sau e marcat „nu contactat” iese din serie; un parcurs pornește doar cât timp organizația îl ține activ.

export type CheieParcurs = "welcome" | "save" | "upgrade" | "reactivare" | "a_doua_donatie";
export const CHEI_PARCURS: readonly CheieParcurs[] = ["welcome", "save", "upgrade", "reactivare", "a_doua_donatie"];

export type PasParcurs = {
  // Pasul 1: zile de la evenimentul care pornește seria (prima donație la Welcome, ultima plată recurentă la Save, 0 la Upgrade).
  // Pașii următori: zile după trimiterea pasului anterior.
  zile: number;
  subiect: string;
  corp: string; // text simplu; paragrafele se despart printr-un rând gol; variabilele de mai jos
  buton?: string; // textul butonului spre pagina de donație (lipsă = fără buton)
};

export type DefinitieParcurs = {
  cheie: CheieParcurs;
  nume: string;
  descriere: string; // cui i se trimite și când
  eveniment: string; // ce numără zilele primului pas
  obiectiv: string; // ce socotim „reușită” după ce donatorul a primit un e-mail din serie (vezi lib/parcursuri-server.ts, rezultateParcurs)
  pasi: PasParcurs[];
};

// Variabilele din texte. {link} = pagina de donație (campania ultimei donații, sau cea mai recentă campanie activă).
export const VARIABILE_PARCURS = ["prenume", "organizatie", "suma", "total", "campanie", "link"] as const;
export type VariabilaParcurs = (typeof VARIABILE_PARCURS)[number];
export type ValoriParcurs = Partial<Record<VariabilaParcurs, string>>;

export const LIMITE_PARCURS = { maxPasi: 4, maxSubiect: 140, maxCorp: 4000, maxButon: 40, maxZile: 365 } as const;

export const PARCURSURI: Record<CheieParcurs, DefinitieParcurs> = {
  welcome: {
    cheie: "welcome",
    nume: "Welcome: după prima donație",
    descriere: "Donatorii care au donat prima dată: un mulțumesc a doua zi, o invitație să urmărească ce se întâmplă mai departe și, mai târziu, propunerea de a dona lunar. Se oprește dacă donează din nou.",
    eveniment: "prima donație",
    obiectiv: "o nouă donație după primul e-mail",
    pasi: [
      {
        zile: 1,
        subiect: "Mulțumim, {prenume}",
        corp: `Bună, {prenume}!

Donația ta de {suma} a ajuns la noi. Voiam să-ți mulțumim noi, nu doar sistemul care trimite confirmarea. Mulțumim, din partea întregii echipe {organizatie}.

Îți mai scriem doar când avem ceva concret de arătat.`,
      },
      {
        zile: 14,
        subiect: "Ce se întâmplă mai departe, {prenume}",
        corp: `Bună, {prenume}!

Te-ai alăturat oamenilor care ne sprijină și vrem să rămânem aproape de tine. Cele mai importante vești le găsești pe pagina de campanie, unde le adăugăm pe măsură ce apar.

Dacă ai o întrebare sau vrei să afli mai mult, răspunde la acest e-mail: îl citește un om.`,
        buton: "Vezi noutățile",
      },
      {
        zile: 21,
        subiect: "Un gest mic, în fiecare lună",
        corp: `Bună, {prenume}!

Mulțumim că ai ales să ne susții. Dacă vrei să faci și mai mult, un gest mic repetat în fiecare lună ne ajută să planificăm: poți deveni donator lunar în doar câteva clipe, cu o sumă mică pe care o poți opri oricând.

Iar dacă nu e momentul, nu e nicio problemă: mulțumim oricum.`,
        buton: "Vreau să donez lunar",
      },
    ],
  },
  save: {
    cheie: "save",
    nume: "Save: o donație lunară s-a oprit",
    descriere: "Donatorii lunari al căror abonament s-a oprit (anulat sau plată eșuată): un mesaj prietenos și o cale simplă de a relua. Se oprește dacă donează din nou.",
    eveniment: "ultima plată lunară",
    obiectiv: "o nouă donație după primul e-mail (donatorul a revenit)",
    pasi: [
      {
        zile: 10,
        subiect: "{prenume}, donația ta lunară s-a oprit",
        corp: `Bună, {prenume}!

Am observat că donația ta lunară către {organizatie} s-a oprit. Dacă ai vrut asta, îți mulțumim pentru tot ce ai făcut până acum. Dacă a fost doar o problemă cu cardul, o poți relua în câteva clipe.

Oricare ar fi motivul, ne-ar ajuta să aflăm ce s-a întâmplat: răspunde la acest e-mail, îl citește un om.`,
        buton: "Reiau donația lunară",
      },
      {
        zile: 14,
        subiect: "Un gând de la {organizatie}",
        corp: `Bună, {prenume}!

Acesta e ultimul mesaj de acest fel. Dacă te răzgândești, poți relua donația oricând, în câteva clipe. Dacă nu, rămâne ce ai făcut deja: a contat, și îți mulțumim.`,
        buton: "Reiau donația lunară",
      },
    ],
  },
  upgrade: {
    cheie: "upgrade",
    nume: "Upgrade: donatori fideli",
    descriere: "Donatorii fideli care nu au donat niciodată lunar (cel puțin 3 donații, ultima în ultimele 90 de zile): o propunere de a deveni donatori lunari. Se trimite o singură dată fiecărui donator. 10% dintre ei nu primesc mesajul, ca să vedem ce aduce el cu adevărat.",
    eveniment: "nu există: se trimite când donatorul devine eligibil",
    obiectiv: "o donație lunară nouă după e-mail",
    pasi: [
      {
        zile: 0,
        subiect: "{prenume}, mulțumim că ești alături de noi",
        corp: `Bună, {prenume}!

Ai donat de mai multe ori către {organizatie}, iar asta ne arată cât de mult îți pasă. Mulțumim!

Dacă vrei să faci și mai mult fără să te gândești de fiecare dată, poți transforma gestul tău într-o donație lunară, cu o sumă mică pe care o alegi tu și pe care o poți opri oricând.`,
        buton: "Devin donator lunar",
      },
    ],
  },
  reactivare: {
    cheie: "reactivare",
    nume: "Reactivare: donatori care au tăcut",
    descriere: "Donatorii a căror ultimă donație a fost acum 12–24 de luni și care nu au o donație lunară activă: un mesaj de reconectare și o amintire după două săptămâni. Se oprește dacă donează. Se trimite o singură dată fiecărui donator. 10% dintre ei nu primesc mesajul, ca să vedem ce aduce el cu adevărat.",
    eveniment: "nu există: se trimite când trec 12 luni de la ultima donație",
    obiectiv: "o nouă donație după primul e-mail",
    pasi: [
      {
        zile: 0,
        subiect: "{prenume}, ce s-a întâmplat de când ne-ai ajutat",
        corp: `Bună, {prenume}!

A trecut ceva timp de când ne-ai fost alături la {organizatie} și nu am vrut să lăsăm lucrurile să treacă fără un gând de mulțumire.

Am adunat pe pagina noastră ce s-a întâmplat între timp. Dacă vrei să vezi sau să fii din nou aproape de noi, ne-ar bucura.`,
        buton: "Vezi ce am făcut",
      },
      {
        zile: 14,
        subiect: "Un ultim gând de la {organizatie}",
        corp: `Bună, {prenume}!

Acesta e ultimul mesaj de acest fel. Dacă îți mai dorești să ne sprijini, ești binevenit oricând; dacă nu, îți mulțumim încă o dată pentru ce ai făcut.`,
        buton: "Vezi cum poți ajuta",
      },
    ],
  },
  a_doua_donatie: {
    cheie: "a_doua_donatie",
    nume: "A doua donație: ai ales să revii",
    descriere: "Donatorii care au donat a doua oară (și nu au donație lunară): un mesaj la două zile după donație și propunerea de a dona lunar, cu o sumă mică. Cine donează a doua oară e cel mai bun candidat la o donație lunară. Se trimite o singură dată fiecărui donator.",
    eveniment: "a doua donație",
    obiectiv: "o donație lunară nouă după e-mail",
    pasi: [
      {
        zile: 2,
        subiect: "{prenume}, ai ales să revii",
        corp: `Bună, {prenume}!

Ai donat a doua oară către {organizatie}. Asta contează mai mult decât orice sumă: înseamnă că ai încredere în noi. Mulțumim!

Dacă vrei să ne sprijini fără să te mai gândești de fiecare dată, poți dona lunar, cu o sumă mică pe care o alegi tu și pe care o poți opri oricând.`,
        buton: "Donez lunar",
      },
    ],
  },
};

// Parcursuri la care o parte din donatori (alese stabil, după adresă) NU primesc mesajul: grupul de control. Fără el, „au donat după e-mail” include
// și donațiile care s-ar fi întâmplat oricum, iar parcursul pare mai bun decât e.
export const CONTROL_PROCENT: Partial<Record<CheieParcurs, number>> = { upgrade: 10, reactivare: 10 };

// Împărțire stabilă: aceeași adresă cade mereu în aceeași parte (FNV-1a pe adresă și parcurs), deci un donator nu trece din control în trimis între rulări.
export function esteInGrupDeControl(email: string, cheie: CheieParcurs): boolean {
  const procent = CONTROL_PROCENT[cheie] ?? 0;
  if (procent <= 0) return false;
  let h = 0x811c9dc5;
  for (const c of `${cheie}:${email.trim().toLowerCase()}`) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100 < procent;
}

// ===== Linkuri, subsol, erori de trimitere =====

// Pagina de donație: a campaniei ultimei donații (dacă e încă activă) sau, altfel, a celei mai recente campanii active a organizației.
// Pentru mesajele care propun o donație lunară, linkul deschide formularul cu „lunar” preselectat și o sumă mică propusă.
export function adresaPagina(baseUrl: string, orgSlug: string, slugPagina: string | null, lunar?: { suma?: number }): string | null {
  if (!slugPagina) return null;
  const baza = `${baseUrl}/strangere-fonduri/${encodeURIComponent(orgSlug)}/${encodeURIComponent(slugPagina)}`;
  if (!lunar) return baza;
  const parametri = new URLSearchParams({ lunar: "1" });
  if (lunar.suma) parametri.set("suma", String(lunar.suma));
  return `${baza}?${parametri.toString()}`;
}

// Mesajul propune o donație lunară dacă parcursul e despre asta sau dacă textul butonului o spune.
export function propuneLunar(cheie: CheieParcurs, buton: string | undefined): boolean {
  return cheie === "upgrade" || cheie === "a_doua_donatie" || cheie === "save" || /lunar/i.test(buton ?? "");
}

// Ce se vede în subsol: cine trimite, în numele cui, cum se dezabonează. Identificăm organizația cu datele ei de contact (art. 13 GDPR; comunicările comerciale trebuie să arate expeditorul).
export function subsolOrganizatie(org: { name: string; adresa?: string | null; telefon?: string | null; emailContact?: string | null }): string {
  const contact = [org.adresa, org.telefon, org.emailContact].map((x) => (x ?? "").trim()).filter(Boolean).join(" · ");
  return contact ? `${org.name} (${contact})` : org.name;
}


// Serverul de e-mail a respins clar mesajul (cod SMTP 4xx/5xx sau eroare înainte de conectare): nu a plecat nimic, deci se poate reîncerca. La un timeout nu știm dacă a plecat.
export function esteRespingereClara(e: unknown): boolean {
  const eroare = e as { responseCode?: unknown; code?: unknown } | null;
  if (typeof eroare?.responseCode === "number" && eroare.responseCode >= 400) return true;
  return typeof eroare?.code === "string" && ["EENVELOPE", "EAUTH", "ECONNREFUSED", "ENOTFOUND", "EDNS"].includes(eroare.code);
}

// ===== Plafoane =====

// Un donator nu primește mai mult de atâtea e-mailuri de parcurs la 30 de zile, oricâte parcursuri ar atinge.
export const MAX_EMAILURI_30_ZILE = 3;
// Organizațiile noi (primele 30 de zile) au un plafon zilnic mai mic: un cont nou nu trimite sute de mesaje în numele platformei din prima zi.
export const ORGANIZATIE_NOUA_ZILE = 30;
export const PLAFON_ZI_ORGANIZATIE_NOUA = 20;
export const PLAFON_ZI_ORGANIZATIE = 150;
// Plafon zilnic pentru toate organizațiile la un loc: apără reputația domeniului de trimitere.
export const PLAFON_ZI_GLOBAL = 1500;

// Suma lunară propusă în link, în funcție de ce donează de obicei persoana: un pas mic, nu o creștere bruscă.
export function sumaLunaraSugerata(mediaPeDonatie: number): number {
  if (!Number.isFinite(mediaPeDonatie) || mediaPeDonatie < 50) return 10;
  if (mediaPeDonatie < 200) return 25;
  return 50;
}

// „100 de lei”, „12 lei”, „1 leu”: în română numerele de la 20 în sus (și sutele pline) cer „de”.
export function formatLei(n: number): string {
  const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  if (v === 0) return "0 lei";
  if (v === 1) return "1 leu";
  const rest = v % 100;
  const text = new Intl.NumberFormat("ro-RO").format(v);
  return rest === 0 || rest >= 20 ? `${text} de lei` : `${text} lei`;
}

// ===== Validare =====

export type EroareParcurs = { pas: number | null; mesaj: string };

const RE_VARIABILA = /\{([a-z_]+)\}/g;

// Variabilele necunoscute dintr-un text (o greșeală de scriere, ex. {prenme}, ar apărea ca atare în e-mailul unui donator).
export function variabileNecunoscute(text: string): string[] {
  const gasite = new Set<string>();
  for (const m of text.matchAll(RE_VARIABILA)) if (!(VARIABILE_PARCURS as readonly string[]).includes(m[1])) gasite.add(m[1]);
  return [...gasite];
}

// Mesajele de eroare sunt în limba cerută prin `locale` (implicit română); textele pașilor (subiect, corp) sunt scrise de utilizator.
export function valideazaPasi(pasi: unknown, cheie: CheieParcurs, locale: "ro" | "en" = "ro"): { ok: true; pasi: PasParcurs[] } | { ok: false; erori: EroareParcurs[] } {
  const en = locale === "en";
  const erori: EroareParcurs[] = [];
  if (!Array.isArray(pasi) || pasi.length === 0) return { ok: false, erori: [{ pas: null, mesaj: en ? "The journey needs at least one step." : "Parcursul are nevoie de cel puțin un pas." }] };
  if (pasi.length > LIMITE_PARCURS.maxPasi) return { ok: false, erori: [{ pas: null, mesaj: en ? `A journey can have at most ${LIMITE_PARCURS.maxPasi} steps.` : `Un parcurs poate avea cel mult ${LIMITE_PARCURS.maxPasi} pași.` }] };
  const curate: PasParcurs[] = [];
  pasi.forEach((brut, i) => {
    const p = (brut ?? {}) as Record<string, unknown>;
    const subiect = typeof p.subiect === "string" ? p.subiect.replace(/[\r\n\u0000-\u001f]+/g, " ").trim() : "";
    const corp = typeof p.corp === "string" ? p.corp.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim() : "";
    const buton = typeof p.buton === "string" ? p.buton.replace(/[\r\n\u0000-\u001f]+/g, " ").trim() : "";
    const zile = typeof p.zile === "number" ? Math.round(p.zile) : Number.NaN;
    if (!subiect) erori.push({ pas: i, mesaj: en ? "The subject is required." : "Subiectul e obligatoriu." });
    else if (subiect.length > LIMITE_PARCURS.maxSubiect) erori.push({ pas: i, mesaj: en ? `The subject is too long (maximum ${LIMITE_PARCURS.maxSubiect} characters).` : `Subiectul e prea lung (maximum ${LIMITE_PARCURS.maxSubiect} de caractere).` });
    if (!corp) erori.push({ pas: i, mesaj: en ? "The message text is required." : "Textul mesajului e obligatoriu." });
    else if (corp.length > LIMITE_PARCURS.maxCorp) erori.push({ pas: i, mesaj: en ? `The text is too long (maximum ${LIMITE_PARCURS.maxCorp} characters).` : `Textul e prea lung (maximum ${LIMITE_PARCURS.maxCorp} de caractere).` });
    if (buton.length > LIMITE_PARCURS.maxButon) erori.push({ pas: i, mesaj: en ? `The button text is too long (maximum ${LIMITE_PARCURS.maxButon} characters).` : `Textul butonului e prea lung (maximum ${LIMITE_PARCURS.maxButon} de caractere).` });
    const minZile = (cheie === "upgrade" || cheie === "reactivare") && i === 0 ? 0 : 1;
    const areLink = /https?:\/\/|www\./i;
    if (areLink.test(subiect) || areLink.test(corp)) erori.push({ pas: i, mesaj: en ? "Do not put web addresses in the text: use the button or the {link} variable, so the address is always the correct one." : "Nu pune adrese web în text: folosește butonul sau variabila {link}, ca adresa să fie mereu cea corectă." });
    if (/\{(suma|total|campanie)\}/.test(subiect)) erori.push({ pas: i, mesaj: en ? "Do not put {suma}, {total} or {campanie} in the subject: the subject shows on the phone's lock screen and would show others what the person donated. You can use them in the text." : "Nu pune {suma}, {total} sau {campanie} în subiect: subiectul se vede pe ecranul blocat al telefonului și ar arăta altora ce a donat persoana. Le poți folosi în text." });
    if (!Number.isFinite(zile) || zile < minZile || zile > LIMITE_PARCURS.maxZile) erori.push({ pas: i, mesaj: en ? `The number of days must be between ${minZile} and ${LIMITE_PARCURS.maxZile}.` : `Numărul de zile trebuie să fie între ${minZile} și ${LIMITE_PARCURS.maxZile}.` });
    const necunoscute = [...variabileNecunoscute(subiect), ...variabileNecunoscute(corp)];
    if (necunoscute.length) erori.push({ pas: i, mesaj: en ? `Unknown variables: ${[...new Set(necunoscute)].map((v) => `{${v}}`).join(", ")}. Use: ${VARIABILE_PARCURS.map((v) => `{${v}}`).join(", ")}.` : `Variabile necunoscute: ${[...new Set(necunoscute)].map((v) => `{${v}}`).join(", ")}. Folosește: ${VARIABILE_PARCURS.map((v) => `{${v}}`).join(", ")}.` });
    curate.push({ zile, subiect, corp, ...(buton ? { buton } : {}) });
  });
  return erori.length ? { ok: false, erori } : { ok: true, pasi: curate };
}

// ===== Randare =====

const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Înlocuiește {variabilele}; o variabilă fără valoare dispare (cu spațiul din jur dublu strâns), ca să nu apară „{campanie}” în e-mail.
export function aplicaVariabile(text: string, valori: ValoriParcurs): string {
  return text
    .replace(RE_VARIABILA, (_, v: string) => valori[v as VariabilaParcurs] ?? "")
    .replace(/\b(lei|leu)\s+(lei|leu)\b/gi, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,!?;:])/g, "$1")
    .trim();
}

// Textul pasului devine HTML simplu (paragrafe, linkuri http(s) clicabile), cu valorile donatorului deja puse. Totul trece prin escapare: numele unui donator nu poate
// introduce HTML în e-mail.
export function corpHtml(corp: string, valori: ValoriParcurs): string {
  const text = aplicaVariabile(corp, valori);
  const paragrafe = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragrafe
    .map((p) => {
      const sigur = escapeHtml(p).replace(/\n/g, "<br>");
      const cuLinkuri = sigur.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#154a85;">${u}</a>`);
      return `<p style="margin:0 0 14px;line-height:1.6;">${cuLinkuri}</p>`;
    })
    .join("\n");
}

export function subiectRandat(subiect: string, valori: ValoriParcurs): string {
  return aplicaVariabile(subiect, valori).replace(/[\r\n]+/g, " ").slice(0, 200);
}

// Prenumele pentru salut: primul cuvânt al numelui, cu inițială mare; gol dacă numele nu arată a nume.
export function prenumePentruSalut(nume: string | null | undefined): string {
  const p = (nume ?? "").trim().split(/\s+/)[0] ?? "";
  if (!p || /[@\d./\\:]/.test(p) || p.length > 40) return "";
  return p.charAt(0).toLocaleUpperCase("ro") + p.slice(1).toLocaleLowerCase("ro");
}

// ===== Rezultate =====

// Un donator „a convertit” dacă a făcut o donație (de tipul cerut de obiectivul parcursului) în cel mult atâtea zile de la primul e-mail din serie.
export const FEREASTRA_CONVERSIE_ZILE = 30;

export type RezultatPas = { pas: number; trimise: number; convertiti: number };
export type RezultatParcurs = {
  inscrisi: number; // donatori care au primit cel puțin un e-mail din serie
  convertiti: number;
  medianaZile: number | null; // zile de la primul e-mail până la donație, mediana celor convertiți
  venit: number; // lei donați de cei înscriși, în fereastra de conversie
  pasi: RezultatPas[];
  // Grup de control (doar la parcursurile care au): donatori eligibili care NU au primit mesajul, cu aceeași definiție a donației după; null unde nu există control.
  control: { inscrisi: number; convertiti: number } | null;
};

// Procent întreg, fără împărțire la zero (null când nu există nimic de împărțit).
export function procentConversie(convertiti: number, inscrisi: number): number | null {
  if (!Number.isFinite(convertiti) || !Number.isFinite(inscrisi) || inscrisi <= 0) return null;
  return Math.round((convertiti / inscrisi) * 100);
}

// ===== Ore de liniște =====

export const ORA_START_TRIMITERE = 9;
export const ORA_SFARSIT_TRIMITERE = 19;

// E-mailurile pleacă doar între 9:00 și 19:00, ora României: un mesaj de mulțumire primit noaptea sună automat.
export function inIntervalDeTrimitere(acum: Date): boolean {
  const ora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hour12: false }).format(acum));
  return ora >= ORA_START_TRIMITERE && ora < ORA_SFARSIT_TRIMITERE;
}

// ===== Termene =====

const ZI_MS = 86_400_000;

// Un pas poate pleca într-o fereastră de la momentul scadent: dacă cron-ul n-a rulat câteva zile, trimite din urmă, dar nu după o lună (mesajul ar suna deplasat).
export const FEREASTRA_ZILE = 14;

export function pasScadent(ancora: Date, zile: number, acum: Date, fereastraZile: number = FEREASTRA_ZILE): boolean {
  const scadent = ancora.getTime() + zile * ZI_MS;
  return acum.getTime() >= scadent && acum.getTime() <= scadent + fereastraZile * ZI_MS;
}
