// Acordul de e-mail al donatorilor: de unde vine și ce text a bifat. Fără importuri, ca să se poată testa direct.

// Versiunea textului bifei din formularul public de donație (data la care a intrat în vigoare). Se schimbă la fiecare modificare a textului,
// ca din dată și versiune să se vadă ce a acceptat exact fiecare donator (art. 7(1) GDPR: operatorul trebuie să poată dovedi acordul).
export const ACORD_EMAIL_VERSIUNE = "2026-10-24";

// Sursa acordului: „formular_online” = donatorul a bifat singur în formularul public; „declarat_echipa” = o persoană din organizație a declarat că donatorul
// a fost de acord (donație introdusă manual). Pentru parcursurile automate contează doar prima.
export type SursaAcord = "formular_online" | "declarat_echipa";
export const SURSE_ACORD: readonly SursaAcord[] = ["formular_online", "declarat_echipa"];

export function esteSursaAcord(x: unknown): x is SursaAcord {
  return typeof x === "string" && (SURSE_ACORD as readonly string[]).includes(x);
}

// Poate primi donatorul e-mailuri automate de parcurs? Acord explicit, nedezabonat, nemarcat „nu contactat”, iar acordul să nu fie doar declarat de echipă.
export function poatePrimiParcursuri(d: { consimtamantEmail: boolean | null; dezabonat: boolean; nuContactat: boolean; sursaAcord: string | null }): boolean {
  return d.consimtamantEmail === true && !d.dezabonat && !d.nuContactat && d.sursaAcord !== "declarat_echipa";
}
