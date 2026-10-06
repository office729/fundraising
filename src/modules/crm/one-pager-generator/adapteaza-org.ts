// Formularul One-pager vine cu valorile organizației-pilot (nume, cifre de impact, text, linkul și emailul ei). Pentru ORICE
// altă organizație, un one-pager printat fără editare ar purta identitatea, cifrele și datele de contact ale altcuiva —
// prospecții ar scrie la adresa greșită. Aici: numele organizației curente, fără link/email/site implicite și un avertisment
// vizibil că restul textelor sunt exemple. Organizația-pilot rămâne neatinsă.
export const ORG_PILOT_SLUG = "salveaza-o-inima";

const curataText = (s: string) => s.replace(/[<>&"'\\]/g, "").trim();

const AVERTISMENT =
  '<div style="margin:10px 0 14px;padding:10px 12px;border-radius:8px;background:#fff4d6;border:1px solid #f0d58a;color:#5a4300;font-size:13px;line-height:1.45">' +
  "<strong>Exemplu de completare.</strong> Textele, cifrele de impact și datele de mai jos sunt un exemplu. Înlocuiește-le cu datele reale ale organizației tale înainte de a printa sau trimite prezentarea." +
  "</div>";

export function adapteazaOnePagerPentruOrg(html: string, orgSlug: string, orgName: string): string {
  if (orgSlug === ORG_PILOT_SLUG) return html;
  const nume = curataText(orgName);
  let out = html;
  if (nume) out = out.replace('id="ORG_NUME" value="Asociația Salvează o Inimă"', `id="ORG_NUME" value="${nume}"`);
  for (const id of ["LINK", "CONTACT_EMAIL", "CONTACT_WEB"]) {
    out = out.replace(new RegExp(`(id="${id}" value=")[^"]*(")`), "$1$2");
  }
  out = out.replace("<label>Numele organizației</label>", `${AVERTISMENT}<label>Numele organizației</label>`);
  return out;
}
