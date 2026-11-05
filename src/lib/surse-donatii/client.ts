"use client";

import { CONSENT_KEY } from "@/lib/analytics";
import { contextSerializat } from "@/lib/atribuire/client";
import { CONSENT_MARKETING_KEY } from "@/lib/meta-pixel";

import { CHEIE_SURSE_PERSISTENT, CHEIE_SURSE_SESIUNE } from "./chei";
import { actualizeazaMemoria, domeniiIgnorate, parseazaSurse, semnaleDinUrl, serializeazaSurse, SEMNALE_GOALE, TIPURI_CLICK, type SemnaleVizita, type StareSurse, type TipClick } from "./nucleu";

// Memoria „Sursele donațiilor” în browser. Păstrăm prima și ultima sursă EXTERNĂ (cu metadatele lor); o revenire Direct nu schimbă nimic.
//  - Cu acordul pentru statistici SAU marketing (bannerul de cookie-uri): în localStorage, cel mult 90 de zile.
//  - Fără acord: doar în sessionStorage (dispare cu sesiunea), fără persistență între vizite.
//  - La retragerea acordului bannerul șterge cheia persistentă (stergeIdentificatori); sesiunea curentă continuă cu copia din sessionStorage.
// Se stochează doar semnale brute: valorile utm_*, TIPUL identificatorilor de click (nu valoarea lor), hostname-ul referrerului, identificatorul de afiliat și momentul.
// Nicio dată personală, niciun fingerprinting. Categoria o stabilește serverul din nou, din aceleași reguli (nucleu.ts).

const acord = (): boolean => {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted" || window.localStorage.getItem(CONSENT_MARKETING_KEY) === "granted";
  } catch {
    return false;
  }
};

const ignorate = (): string[] => {
  let site: string | null = null;
  try {
    site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://alexandrit.ro").hostname;
  } catch {
    // implicit: doar gazda curentă
  }
  return domeniiIgnorate(process.env.NEXT_PUBLIC_SURSE_DOMENII_IGNORATE, [window.location.hostname, site]);
};

function citeste(depozit: Storage, cheie: string): { stare: StareSurse; persistent: boolean } | null {
  try {
    const brut = depozit.getItem(cheie);
    if (!brut) return null;
    const v = parseazaSurse(brut, Date.now());
    if (!v) {
      depozit.removeItem(cheie); // expirat sau stricat
      return null;
    }
    return v;
  } catch {
    return null;
  }
}
function scrie(depozit: Storage, cheie: string, stare: StareSurse | null, persistent: boolean) {
  try {
    if (stare) depozit.setItem(cheie, serializeazaSurse(stare, persistent));
    else depozit.removeItem(cheie);
  } catch {
    // stocare indisponibilă: contează doar vizita curentă
  }
}

// În widgetul încorporat (iframe pe un site al organizației) referrerul și adresa iframe-ului nu spun nimic despre vizitator: scriptul embed.js trimite
// semnalele paginii gazdă în parametrii x_* (x_v=1 e marcajul). Atunci folosim DOAR acele semnale.
function semnaleVizitaCurenta(): SemnaleVizita {
  const q = new URLSearchParams(window.location.search);
  if (q.get("x_v") === "1") {
    const ids = (q.get("x_click") ?? "").split(",").filter((t): t is TipClick => (TIPURI_CLICK as readonly string[]).includes(t));
    const dinX = semnaleDinUrl((n) => q.get(`x_${n}`), q.get("x_ref") ? `https://${q.get("x_ref")}/` : null);
    return { ...dinX, clickIds: [...new Set([...dinX.clickIds, ...ids])] };
  }
  return semnaleDinUrl((n) => q.get(n), document.referrer || null);
}

let procesatPentru = "";

// Se cheamă la încărcarea paginilor publice (și la citirea formularului de donație): actualizează memoria o singură dată pe încărcare. Nu aruncă niciodată.
export function reinoiesteMemoria(): void {
  try {
    const cheie = `${window.location.href}|${document.referrer}`;
    if (procesatPentru === cheie) return;
    procesatPentru = cheie;
    const cuAcord = acord();
    const local = citeste(window.localStorage, CHEIE_SURSE_PERSISTENT);
    const sesiune = citeste(window.sessionStorage, CHEIE_SURSE_SESIUNE);
    // Acord retras: memoria persistentă a dispărut; sesiunea curentă continuă cu copia ei. Acord nou: sursele din sesiune se păstrează, nu se pierd.
    if (!cuAcord && local) scrie(window.localStorage, CHEIE_SURSE_PERSISTENT, null, true);
    const baza = cuAcord ? (local?.stare ?? sesiune?.stare ?? null) : (sesiune?.stare ?? (local?.stare ?? null));
    const noua = actualizeazaMemoria(baza, semnaleVizitaCurenta(), Date.now(), cuAcord, ignorate());
    scrie(window.sessionStorage, CHEIE_SURSE_SESIUNE, noua, cuAcord);
    if (cuAcord) scrie(window.localStorage, CHEIE_SURSE_PERSISTENT, noua, true);
  } catch {
    // măsurarea nu are voie să strice pagina
  }
}

// Starea de trimis la donație (după reînnoirea memoriei cu vizita curentă).
function stareCurenta(): { stare: StareSurse; persistent: boolean } | null {
  reinoiesteMemoria();
  const cuAcord = acord();
  const local = cuAcord ? citeste(window.localStorage, CHEIE_SURSE_PERSISTENT) : null;
  if (local) return local;
  const sesiune = citeste(window.sessionStorage, CHEIE_SURSE_SESIUNE);
  return sesiune ? { stare: sesiune.stare, persistent: cuAcord } : null;
}

// Valoarea pentru câmpul ascuns al formularului de donație: contextul de atribuire existent + câmpul „x” cu prima/ultima sursă externă. Gol (fără „x”) dacă nu există sursă externă.
export function contextDonatie(): string {
  try {
    const baza = contextSerializat() || '{"w":2}';
    const s = stareCurenta();
    if (!s) return baza;
    const o = JSON.parse(baza) as Record<string, unknown>;
    o.x = JSON.parse(serializeazaSurse(s.stare, s.persistent));
    return JSON.stringify(o);
  } catch {
    return "";
  }
}

export { SEMNALE_GOALE };
