// Șablonul emailului de mulțumire trimis unui donator după o donație
// confirmată (Stripe sau înregistrată manual/offline) — separat de
// fundraising-credit.ts pentru același motiv ca formular230-email-template.ts:
// funcții simple, fără "use server", folosite atât de webhook cât și de
// acțiunea de donație offline.
import { escHtml } from "@/lib/html-escape";

export function subiectEmailMultumireDonatie(orgName: string): string {
  // Subiect = antet de email, nu HTML: doar fără CR/LF.
  return `Mulțumim pentru donația ta către ${orgName.replace(/[\r\n]+/g, " ")}`;
}

export function htmlEmailMultumireDonatie(params: {
  numeDonator: string;
  suma: number;
  pageTitlu: string;
  orgName: string;
  recurenta: boolean;
  // Pagina unde donatorul lunar își cere accesul ca să-și gestioneze donația (doar la donațiile lunare).
  linkGestionare?: string;
}): string {
  const { suma, recurenta } = params;
  const numeDonator = escHtml(params.numeDonator);
  const pageTitlu = escHtml(params.pageTitlu);
  const orgName = escHtml(params.orgName);
  const sumaText = `${suma.toLocaleString("ro-RO")} lei${recurenta ? " / lună" : ""}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună, ${numeDonator}!</p>
      <p>
        Îți mulțumim din suflet pentru donația ta de <strong>${sumaText}</strong> pentru
        <strong>${pageTitlu}</strong>. Gestul tău contează enorm.
      </p>
      ${
        recurenta
          ? `<p>Donația ta lunară s-a înregistrat cu succes — vei primi câte o confirmare ca aceasta la fiecare reînnoire.</p>${
              params.linkGestionare
                ? `<p>Poți schimba suma, pune donația pe pauză, o poți opri sau îți poți actualiza cardul oricând: <a href="${escHtml(params.linkGestionare)}">gestionează-ți donația lunară</a>.</p>`
                : ""
            }`
          : ""
      }
      <p>Cu recunoștință,<br/>Echipa ${orgName}</p>
    </div>
  `;
}
