// Parcursuri automate pentru donatori: trei serii gata făcute de e-mailuri (Welcome, Save, Upgrade), cu pași simpli și texte editabile de organizație.
// Fișier fără importuri (partea pură: definiții, texte implicite, validare și randare), ca să se poată testa direct. Trimiterea și selecția donatorilor sunt în
// lib/parcursuri-server.ts.
//
// Reguli care nu se negociază (aplicate în selecție, nu aici): primesc doar donatorii care au bifat acordul pentru e-mailuri, nu s-au dezabonat și nu sunt pe lista de
// suprimare; cine a răspuns sau e marcat „nu contactat” iese din serie; un parcurs pornește doar cât timp organizația îl ține activ.

export type CheieParcurs = "welcome" | "save" | "upgrade";
export const CHEI_PARCURS: readonly CheieParcurs[] = ["welcome", "save", "upgrade"];

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
    descriere: "Donatorii care au donat prima dată: un mulțumesc după câteva zile și o invitație să rămână aproape. Se oprește dacă donează din nou.",
    eveniment: "prima donație",
    pasi: [
      {
        zile: 3,
        subiect: "Mulțumim încă o dată, {prenume}",
        corp: `Bună, {prenume}!

Acum câteva zile ne-ai fost alături cu {suma} lei, iar noi nu vrem să te lăsăm doar cu un mesaj automat de confirmare. Mulțumim, de la toată echipa {organizatie}.

Donația ta merge direct în proiectul pe care l-ai ales ({campanie}). Îți vom spune ce s-a făcut cu ea.`,
      },
      {
        zile: 11,
        subiect: "Cum poți ajuta mai departe",
        corp: `Bună, {prenume}!

Mulțumim că ai ales să ne susții. Dacă vrei să faci și mai mult, un gest mic repetat în fiecare lună ne ajută să planificăm: poți deveni donator lunar în doar câteva clipe.

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
    pasi: [
      {
        zile: 10,
        subiect: "Ne pare rău că ne-am pierdut, {prenume}",
        corp: `Bună, {prenume}!

Am văzut că donația ta lunară către {organizatie} s-a oprit. Poate ai vrut asta, poate a fost o problemă cu cardul: oricum, vrem să-ți spunem că cei {total} lei donați până acum au contat.

Dacă vrei să reiei, durează un minut. Dacă nu, îți mulțumim din suflet.`,
        buton: "Reiau donația lunară",
      },
      {
        zile: 14,
        subiect: "Un gând de la {organizatie}",
        corp: `Bună, {prenume}!

Nu vrem să insistăm, așa că acesta e ultimul mesaj de acest fel. Dacă te răzgândești, ușa rămâne deschisă oricând, iar dacă nu, rămâne ce ai făcut deja: a contat.

Mulțumim pentru tot ce ai făcut până acum.`,
      },
    ],
  },
  upgrade: {
    cheie: "upgrade",
    nume: "Upgrade: donatori fideli",
    descriere: "Donatorii fideli care nu au donat niciodată lunar (cel puțin 3 donații, ultima în ultimele 90 de zile): o propunere de a deveni donatori lunari. Se trimite o singură dată fiecărui donator.",
    eveniment: "nu există: se trimite când donatorul devine eligibil",
    pasi: [
      {
        zile: 0,
        subiect: "{prenume}, ai fost alături de noi de {total} lei",
        corp: `Bună, {prenume}!

Ai donat de mai multe ori către {organizatie}, iar asta ne arată cât de mult îți pasă. Mulțumim!

Dacă vrei să faci și mai mult fără să te gândești de fiecare dată, poți transforma gestul tău într-o donație lunară, cu o sumă pe care o alegi tu și pe care o poți opri oricând.`,
        buton: "Devin donator lunar",
      },
    ],
  },
};

// ===== Validare =====

export type EroareParcurs = { pas: number | null; mesaj: string };

const RE_VARIABILA = /\{([a-z_]+)\}/g;

// Variabilele necunoscute dintr-un text (o greșeală de scriere, ex. {prenme}, ar apărea ca atare în e-mailul unui donator).
export function variabileNecunoscute(text: string): string[] {
  const gasite = new Set<string>();
  for (const m of text.matchAll(RE_VARIABILA)) if (!(VARIABILE_PARCURS as readonly string[]).includes(m[1])) gasite.add(m[1]);
  return [...gasite];
}

export function valideazaPasi(pasi: unknown, cheie: CheieParcurs): { ok: true; pasi: PasParcurs[] } | { ok: false; erori: EroareParcurs[] } {
  const erori: EroareParcurs[] = [];
  if (!Array.isArray(pasi) || pasi.length === 0) return { ok: false, erori: [{ pas: null, mesaj: "Parcursul are nevoie de cel puțin un pas." }] };
  if (pasi.length > LIMITE_PARCURS.maxPasi) return { ok: false, erori: [{ pas: null, mesaj: `Un parcurs poate avea cel mult ${LIMITE_PARCURS.maxPasi} pași.` }] };
  const curate: PasParcurs[] = [];
  pasi.forEach((brut, i) => {
    const p = (brut ?? {}) as Record<string, unknown>;
    const subiect = typeof p.subiect === "string" ? p.subiect.replace(/[\r\n\u0000-\u001f]+/g, " ").trim() : "";
    const corp = typeof p.corp === "string" ? p.corp.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim() : "";
    const buton = typeof p.buton === "string" ? p.buton.replace(/[\r\n\u0000-\u001f]+/g, " ").trim() : "";
    const zile = typeof p.zile === "number" ? Math.round(p.zile) : Number.NaN;
    if (!subiect) erori.push({ pas: i, mesaj: "Subiectul e obligatoriu." });
    else if (subiect.length > LIMITE_PARCURS.maxSubiect) erori.push({ pas: i, mesaj: `Subiectul e prea lung (maximum ${LIMITE_PARCURS.maxSubiect} de caractere).` });
    if (!corp) erori.push({ pas: i, mesaj: "Textul mesajului e obligatoriu." });
    else if (corp.length > LIMITE_PARCURS.maxCorp) erori.push({ pas: i, mesaj: `Textul e prea lung (maximum ${LIMITE_PARCURS.maxCorp} de caractere).` });
    if (buton.length > LIMITE_PARCURS.maxButon) erori.push({ pas: i, mesaj: `Textul butonului e prea lung (maximum ${LIMITE_PARCURS.maxButon} de caractere).` });
    const minZile = cheie === "upgrade" && i === 0 ? 0 : 1;
    if (!Number.isFinite(zile) || zile < minZile || zile > LIMITE_PARCURS.maxZile) erori.push({ pas: i, mesaj: `Numărul de zile trebuie să fie între ${minZile} și ${LIMITE_PARCURS.maxZile}.` });
    const necunoscute = [...variabileNecunoscute(subiect), ...variabileNecunoscute(corp)];
    if (necunoscute.length) erori.push({ pas: i, mesaj: `Variabile necunoscute: ${[...new Set(necunoscute)].map((v) => `{${v}}`).join(", ")}. Folosește: ${VARIABILE_PARCURS.map((v) => `{${v}}`).join(", ")}.` });
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
  if (!p || /[@\d]/.test(p) || p.length > 40) return "";
  return p.charAt(0).toLocaleUpperCase("ro") + p.slice(1).toLocaleLowerCase("ro");
}

// ===== Termene =====

const ZI_MS = 86_400_000;

// Un pas poate pleca într-o fereastră de la momentul scadent: dacă cron-ul n-a rulat câteva zile, trimite din urmă, dar nu după o lună (mesajul ar suna deplasat).
export const FEREASTRA_ZILE = 14;

export function pasScadent(ancora: Date, zile: number, acum: Date, fereastraZile: number = FEREASTRA_ZILE): boolean {
  const scadent = ancora.getTime() + zile * ZI_MS;
  return acum.getTime() >= scadent && acum.getTime() <= scadent + fereastraZile * ZI_MS;
}
