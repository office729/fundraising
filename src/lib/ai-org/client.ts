import "server-only";

import { raporteazaEroare } from "@/lib/monitoring";

import { anteteCerere, codDinHttp, corpCerere, mesajEroare, parseazaRaspuns, URL_MESAJE, URL_MODELE, type CerereClaude, type CodEroare, type Loc, type MesajClaude, type Sursa } from "./protocol";
import { adunaUtilizare, costUsd, UTILIZARE_GOALA, type Utilizare } from "./pret";

// Clientul Claude al ORGANIZAȚIEI: folosește exclusiv cheia ei (criptată în baza de date), niciodată o cheie a platformei.
// Nu atinge baza de date (apelul poate dura minute): cheia se citește înainte (consum-server.ts), consumul se scrie după.
// Fiecare rezultat, și cel eșuat, poartă utilizarea reală (dacă un tur a reușit înainte de eroare) ca să fie înregistrată.

const MAX_TURE = 4; // continuări după pause_turn (căutarea web poate cere mai multe ture)

export type RezultatClaude =
  | { ok: true; text: string; surse: Sursa[]; model: string; oprire: string; trunchiat: boolean; utilizare: Utilizare; costUsd: number }
  | { ok: false; cod: CodEroare; eroare: string; model: string; utilizare: Utilizare; costUsd: number };

type Brut = { ok: true; corp: unknown } | { ok: false; status: number; corp: unknown } | { ok: false; status: 0; corp: null };

async function trimite(c: CerereClaude, mesaje: MesajClaude[], fallback: boolean): Promise<Brut> {
  try {
    const r = await fetch(URL_MESAJE, {
      method: "POST",
      headers: anteteCerere(c.cheie, fallback),
      body: JSON.stringify(corpCerere(c, mesaje, fallback)),
      signal: AbortSignal.timeout(c.timeoutMs ?? 120_000),
      cache: "no-store",
    });
    const corp = await r.json().catch(() => null);
    return r.ok ? { ok: true, corp } : { ok: false, status: r.status, corp };
  } catch {
    return { ok: false, status: 0, corp: null };
  }
}

export async function apeleazaClaude(c: CerereClaude): Promise<RezultatClaude> {
  const locale: Loc = c.locale ?? "ro";
  let mesaje = c.mesaje;
  let utilizare = UTILIZARE_GOALA;
  let model = c.model;
  let fallback = c.fallback !== false;
  const surse = new Map<string, Sursa>();
  let costTotal = 0;
  const cost = (u: Utilizare, m: string) => costUsd(m, u, c.model);

  const ture = Math.max(1, Math.min(MAX_TURE, c.maxTure ?? MAX_TURE));
  for (let tura = 0; tura < ture; tura++) {
    let r = await trimite(c, mesaje, fallback);
    // Dacă API-ul nu acceptă parametrul de rezervă pentru această cerere, reluăm o singură dată fără el (nu pierdem generarea).
    if (!r.ok && fallback && r.status === 400 && /fallback/i.test(JSON.stringify(r.corp ?? ""))) {
      fallback = false;
      r = await trimite(c, mesaje, false);
    }
    if (!r.ok) {
      if (r.status === 0) return { ok: false, cod: "retea", eroare: mesajEroare("retea", locale), model, utilizare, costUsd: costTotal };
      const { cod, detaliu } = codDinHttp(r.status, r.corp);
      if (cod === "cerere" || cod === "necunoscut") raporteazaEroare("ai-org-cerere", new Error(`Anthropic ${r.status}: ${detaliu.slice(0, 200)}`), { status: r.status });
      return { ok: false, cod, eroare: mesajEroare(cod, locale, detaliu), model, utilizare, costUsd: costTotal };
    }
    const p = parseazaRaspuns(r.corp, c.model);
    model = p.model;
    utilizare = adunaUtilizare(utilizare, p.utilizare);
    costTotal += cost(p.utilizare, p.model);
    for (const s of p.surse) surse.set(s.url, s);

    if (p.oprire === "pause_turn") {
      // Tura întreruptă (căutări lungi): reluăm cu răspunsul parțial ca ultim mesaj al asistentului.
      mesaje = [...mesaje, { role: "assistant", content: p.continut }];
      continue;
    }
    const total = Math.round(costTotal * 1e6) / 1e6;
    if (p.oprire === "refusal") return { ok: false, cod: "refuz", eroare: mesajEroare("refuz", locale), model, utilizare, costUsd: total };
    return { ok: true, text: p.text, surse: [...surse.values()], model, oprire: p.oprire, trunchiat: p.oprire === "max_tokens", utilizare, costUsd: total };
  }
  return { ok: false, cod: "temporar", eroare: mesajEroare("temporar", locale), model, utilizare, costUsd: Math.round(costTotal * 1e6) / 1e6 };
}

// Verificarea unei chei fără să consume tokeni: lista de modele (gratuită). Nu verifică și creditele — acelea se văd la prima generare.
export async function verificaCheieAnthropic(cheie: string, locale: Loc = "ro"): Promise<{ ok: true } | { ok: false; cod: CodEroare; eroare: string }> {
  try {
    const r = await fetch(URL_MODELE, { headers: anteteCerere(cheie, false), signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (r.ok) return { ok: true };
    const { cod, detaliu } = codDinHttp(r.status, await r.json().catch(() => null));
    return { ok: false, cod, eroare: mesajEroare(cod, locale, cod === "cerere" ? detaliu : undefined) };
  } catch {
    return { ok: false, cod: "retea", eroare: mesajEroare("retea", locale) };
  }
}
