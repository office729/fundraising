// Aceeași persoană = același cont de poștă: fără „+eticheta" (toate domeniile) și fără puncte la Gmail, ca
// „nume+1@gmail.com" și „n.ume@gmail.com" să nu treacă drept persoane diferite (registrul anti-resetare a probei).
export function emailNormalizatPentruRegistru(email: string): string {
  const brut = email.trim().toLowerCase();
  const [local0, domeniu0] = brut.split("@");
  if (!domeniu0) return brut;
  let local = local0.split("+")[0];
  let domeniu = domeniu0;
  if (domeniu === "gmail.com" || domeniu === "googlemail.com") {
    local = local.replace(/\./g, "");
    domeniu = "gmail.com";
  }
  return `${local}@${domeniu}`;
}
