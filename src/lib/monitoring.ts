import * as Sentry from "@sentry/nextjs";

// Raportare de erori pentru căile care mută bani sau date (webhook-uri Stripe/
// Netopia, cron, Formular 230). Până acum acolo se făcea doar console.error și
// se răspundea 500/200 — Sentry vedea DOAR excepțiile necaptate
// (onRequestError), deci o plată pierdută nu declanșa nicio alertă.

// Erorile Drizzle includ în mesaj interogarea ȘI parametrii ei ("...\nparams: a,b"),
// adică nume, emailuri, CNP criptat, semnături. Păstrăm doar interogarea, scurtată.
export function curataMesajEroare(mesaj: string): string {
  const i = mesaj.search(/\r?\n\s*params:/i);
  return (i >= 0 ? mesaj.slice(0, i) : mesaj).slice(0, 500);
}

type Extra = Record<string, string | number | boolean | null | undefined>;

export function raporteazaEroare(zona: string, e: unknown, extra?: Extra): void {
  const mesaj = e instanceof Error ? curataMesajEroare(e.message) : curataMesajEroare(String(e));
  const cod = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : undefined;
  console.error(`[${zona}] ${mesaj}`, { ...(cod ? { cod } : {}), ...extra });
  Sentry.captureException(e, { tags: { zona }, extra });
}

// Situații anormale fără excepție (ex. sumă Netopia diferită de comandă) — cer
// intervenție manuală, deci ajung în Sentry ca avertisment, nu doar în loguri.
export function raporteazaAvertisment(zona: string, mesaj: string, extra?: Extra): void {
  console.warn(`[${zona}] ${mesaj}`, extra ?? {});
  Sentry.captureMessage(`[${zona}] ${mesaj}`, { level: "warning", tags: { zona }, extra });
}
