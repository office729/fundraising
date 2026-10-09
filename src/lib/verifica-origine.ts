// Protecție CSRF pentru rutele API apelate din browser cu cookie de sesiune: cererea trebuie să vină de pe același host.
// Browserele trimit mereu `Origin` la POST/PUT/DELETE; lipsa lui sau un host diferit înseamnă cerere respinsă.
export function origineValida(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const permise = [req.headers.get("x-forwarded-host"), req.headers.get("host")].filter((h): h is string => !!h).map((h) => h.split(",")[0]!.trim());
  return permise.includes(host);
}
