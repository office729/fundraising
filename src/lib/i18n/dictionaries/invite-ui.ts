import type { Locale } from "../config";

// Invitațiile: mesajele de eroare ale acțiunilor de acceptare (echipă și beneficiar) și pagina /invite-beneficiar/[token].
// Textele paginii /invite/[token] sunt deja în ABONAMENT_DICT.invitatie.
export const INVITE_UI_DICT = {
  ro: {
    erori: {
      inexistenta: "Invitație inexistentă sau expirată.",
      folosita: "Invitația a fost deja folosită.",
      expirata: "Invitația a expirat.",
      altEmail: (email: string) => `Invitația e pentru ${email} — ești logat cu alt email. Deconectează-te și intră cu adresa corectă.`,
      limitaUtilizatori: (n: number) => `Organizația a atins limita de ${n} utilizatori a pachetului ei — nu mai poate primi membri noi momentan.`,
      acceptareEsuata: "Acceptarea a eșuat.",
    },
    beneficiar: {
      inexistentaTitlu: "Invitație inexistentă",
      inexistentaDesc: "Linkul nu mai e valid.",
      folositaTitlu: "Invitație deja folosită",
      folositaDesc: "Ai deja acces la panoul tău — ",
      autentificaTe: "autentifică-te",
      expiratTitlu: "Invitație expirată",
      expiratDesc: "Cere echipei asociației să trimită una nouă.",
      titlu: "Ai fost invitat(ă)",
      panou: "Panoul tău dedicat pentru campania ",
      sustinutaDe: ", susținută de ",
      altCont: (cont: string, email: string) => `Ești logat cu alt cont (${cont}). Deconectează-te și intră cu ${email}.`,
      creeazaCont: "Creează cont",
      autentificare: "Autentificare",
      accepta: "Acceptă și intră în panoul tău",
      seAccepta: "Se acceptă...",
    },
  },
  en: {
    erori: {
      inexistenta: "Invitation not found or expired.",
      folosita: "The invitation has already been used.",
      expirata: "The invitation has expired.",
      altEmail: (email: string) => `The invitation is for ${email} — you are signed in with another email. Sign out and sign in with the right address.`,
      limitaUtilizatori: (n: number) => `The organization has reached its plan's limit of ${n} users — it cannot take on new members right now.`,
      acceptareEsuata: "Accepting the invitation failed.",
    },
    beneficiar: {
      inexistentaTitlu: "Invitation not found",
      inexistentaDesc: "The link is no longer valid.",
      folositaTitlu: "Invitation already used",
      folositaDesc: "You already have access to your panel — ",
      autentificaTe: "sign in",
      expiratTitlu: "Invitation expired",
      expiratDesc: "Ask the organization's team to send a new one.",
      titlu: "You've been invited",
      panou: "Your dedicated panel for the campaign ",
      sustinutaDe: ", supported by ",
      altCont: (cont: string, email: string) => `You're signed in with another account (${cont}). Sign out and sign in with ${email}.`,
      creeazaCont: "Create account",
      autentificare: "Sign in",
      accepta: "Accept and enter your panel",
      seAccepta: "Accepting...",
    },
  },
} satisfies Record<Locale, unknown>;
