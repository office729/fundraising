import { emailFaraLink, layoutEmail, paragraf } from "./email-layout";
import { escHtml } from "./html-escape";

// Emailul trimis automat către cel invitat într-o organizație (vezi
// [orgSlug]/echipa/actions.ts) — linkul e valabil 7 zile. Cadrul vizual e în lib/email-layout.ts.

export function subiectInvitatie(orgName: string): string {
  return `Invitație în ${orgName} pe Alexandrit`;
}

export function htmlInvitatie(params: { orgName: string; invitatDe: string | null; rol: "admin" | "member"; link: string }): string {
  const orgName = escHtml(params.orgName);
  // Fără nume la cel care invită, rămâne adresa lui de email; o afișăm fără să devină link albastru în clientul de email.
  const numeInvitator = params.invitatDe ? (params.invitatDe.includes("@") ? emailFaraLink(params.invitatDe) : escHtml(params.invitatDe)) : null;
  const cine = numeInvitator ? `<strong>${numeInvitator}</strong> te-a invitat` : "Ai fost invitat(ă)";
  const esteAdmin = params.rol === "admin";
  const rol = esteAdmin ? "administrator" : "membru";
  const ce = esteAdmin
    ? "Ca administrator, lucrezi alături de echipă și poți gestiona și echipa, abonamentul și datele organizației."
    : "Ca membru, lucrezi alături de echipă în platformă; facturarea și datele sensibile ale donatorilor rămân la administratori.";
  return layoutEmail({
    previzualizare: `Ești invitat(ă) în ${params.orgName} pe Alexandrit, ca ${rol}.`,
    titlu: `Ai fost invitat în ${params.orgName}`,
    corpHtml:
      paragraf(`Bună! ${cine} să te alături organizației <strong>${orgName}</strong> pe Alexandrit, ca <strong>${rol}</strong>.`) +
      paragraf("Alexandrit este platforma în care ONG-ul își ține la un loc donatorii, campaniile de strângere de fonduri, Formularul 230 și rapoartele.") +
      paragraf(escHtml(ce)),
    buton: { text: "Acceptă invitația", url: params.link },
    nota: "Linkul e valabil 7 zile. Dacă nu te așteptai la această invitație, poți ignora acest email; nu se întâmplă nimic fără să apeși pe buton.",
  });
}
