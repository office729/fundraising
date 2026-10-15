// Conținutul e-mailului către echipa platformei când vine feedback nou. Funcții pure (fără importuri), ca să poată fi testate.

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const linii = (s: string): string => esc(s).replace(/\n/g, "<br>");

export type SugestieNoua = { orgNume: string; categorie: string; titlu: string; mesaj: string; contact: string | null };
export type ChestionarNou = { orgNume: string; nps: number; satisfactie: number; cePlace: string | null; ceLipseste: string | null; contact: string | null };

// Chestionarele se anunță pe e-mail doar când semnalează o problemă: detractor (NPS 0–6) sau satisfacție de cel mult 2 din 5.
// Restul se citesc în panou, ca să nu fie un e-mail la fiecare răspuns.
export const chestionarulCerePrompt = (nps: number, satisfactie: number): boolean => nps <= 6 || satisfactie <= 2;

const cadru = (titlu: string, corp: string, link: string): string =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2b45">
<h2 style="font-size:18px;margin:0 0 12px">${esc(titlu)}</h2>
${corp}
<p style="margin:20px 0 0"><a href="${esc(link)}" style="background:#154a85;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">Deschide în panou</a></p>
<p style="color:#6b7a90;font-size:12px;margin:16px 0 0">Mesaj automat din Alexandrit. Adresa de contact apare doar dacă autorul a bifat că poate fi contactat.</p>
</div>`;

const rand = (eticheta: string, valoare: string | null): string =>
  valoare ? `<p style="margin:6px 0;font-size:14px"><strong>${esc(eticheta)}:</strong> ${linii(valoare)}</p>` : "";

export function compuneSugestie(s: SugestieNoua, linkPanou: string): { subiect: string; html: string } {
  const subiect = `Sugestie nouă de la ${s.orgNume}: ${s.titlu}`.slice(0, 200);
  const corp = rand("Organizație", s.orgNume) + rand("Tip", s.categorie) + rand("Titlu", s.titlu) + rand("Descriere", s.mesaj) + rand("Contact", s.contact);
  return { subiect, html: cadru("Sugestie nouă de la un utilizator", corp, linkPanou) };
}

export function compuneChestionarCuProblema(c: ChestionarNou, linkPanou: string): { subiect: string; html: string } {
  const subiect = `Chestionar cu scor scăzut de la ${c.orgNume} (NPS ${c.nps}, satisfacție ${c.satisfactie}/5)`.slice(0, 200);
  const corp =
    rand("Organizație", c.orgNume) + rand("NPS", String(c.nps)) + rand("Satisfacție", `${c.satisfactie} din 5`) + rand("Ce îi place", c.cePlace) + rand("Ce îi lipsește", c.ceLipseste) + rand("Contact", c.contact);
  return { subiect, html: cadru("Un utilizator a dat un scor scăzut", corp, linkPanou) };
}
