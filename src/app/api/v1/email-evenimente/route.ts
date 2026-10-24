import { esteStareAdresa } from "@/lib/igiena-email";
import { corpJson, raspuns, raspunsEroare, ruta } from "@/lib/api-publica-rute";
import { inOrgApi } from "@/lib/api-publica-server";
import { marcheazaAdresa } from "@/lib/igiena-email-server";

// POST /api/v1/email-evenimente — corp: { "email": "...", "tip": "respins" | "reclamat", "motiv": "…" (opțional) }. Marchează adresa donatorului: „respins” (nu există) sau „reclamat”
// (a marcat un mesaj ca spam; nu mai primește nimic). Pentru sistemele care citesc respingerile (o căsuță de retur, un furnizor de e-mail). Permisiune: email:scriere.
const RE_EMAIL = /^[^\s@<>,"'`?&;:()[\]\\]+@[^\s@<>,"'`?&;:()[\]\\]+\.[^\s@<>,"'`?&;:()[\]\\]{2,}$/;

export const POST = ruta("email:scriere", async (req, cheie) => {
  const corp = await corpJson(req);
  const email = typeof corp?.email === "string" ? corp.email.trim().toLowerCase() : "";
  const tip = corp?.tip;
  if (!RE_EMAIL.test(email) || email.length > 320) return raspunsEroare(400, "email_invalid", "Trimite o adresă de e-mail validă în câmpul „email”.");
  if (tip !== "respins" && tip !== "reclamat") return raspunsEroare(400, "tip_invalid", "Câmpul „tip” trebuie să fie „respins” sau „reclamat”.");
  if (!esteStareAdresa(tip)) return raspunsEroare(400, "tip_invalid", "Tip necunoscut.");
  const motiv = typeof corp?.motiv === "string" ? corp.motiv.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 120) || null : null;
  const actualizati = await inOrgApi(cheie.orgId, (tx) => marcheazaAdresa(tx, cheie.orgId, email, tip, motiv ?? (tip === "respins" ? "Marcat prin API" : "Reclamație raportată prin API")));
  return raspuns({ actualizati });
});
