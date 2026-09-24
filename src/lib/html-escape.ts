// Escapare pentru HTML în emailuri: text (&, <, >) ȘI atribute (ghilimele).
// Valorile din emailuri vin din date publice (nume donator, titlu de pagină,
// mesaje de beneficiar) — neescapate, un nume ca `<a href="https://phish">…`
// ar ajunge, de pe domeniul organizației, în inboxul oricui.
export function escHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pentru href: doar http(s) sau cale relativă; orice altceva (javascript:, data:)
// se înlocuiește cu "#". Rezultatul e deja escapat pentru atribut.
export function hrefSigur(url: string): string {
  const u = url.trim();
  const ok = /^https?:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"));
  return ok ? escHtml(u) : "#";
}
