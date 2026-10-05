// Versiunea textelor legale (Termeni, Politica de confidențialitate, Politica
// de cookies) pe care o acceptă utilizatorul la crearea contului — stocată pe
// app_users.terms_version ca dovadă. Se schimbă ODATĂ cu data „Ultima
// actualizare" a textelor, ca să se știe exact ce versiune a fost acceptată.
// Se schimbă la modificări de FOND (declanșează reacceptarea pentru toți utilizatorii) — nu la clarificări în favoarea
// utilizatorului (de ex. precizarea termenului de retenție, 2026-10-05, a schimbat doar data afișată).
export const TERMENI_VERSIUNE = "2026-10-02";

// Acordul de prelucrare a datelor (DPA, art. 28 GDPR) — acceptat de organizație (owner/admin), nu de fiecare utilizator;
// stocat pe organizations.dpa_version / dpa_accepted_at / dpa_accepted_by. Se schimbă la modificări de FOND ale
// textului din i18n/dictionaries/dpa.ts (organizațiile sunt rugate să accepte din nou).
export const DPA_VERSIUNE = "2026-10-05";

// Comutator pentru TOT mecanismul DPA (banner pentru owner/admin, secțiunea din Setări, mențiunea din bifa de la
// înscriere). Pune false dacă vrei să-l ascunzi până textul e verificat juridic; pagina publică /dpa rămâne.
export const DPA_ACTIV = true;

// Cookie scurt, first-party, setat de browser când se apasă „Continuă cu
// Google" cu bifa de acceptare bifată: autentificarea Google pleacă din site
// și revine pe pasul de finalizare a organizației, unde caseta de acceptare
// apare PRE-BIFATĂ dacă acest cookie există (userul nu o mai bifează a doua
// oară). Acceptarea se înregistrează pe server din valoarea casetei trimisă de
// formular, nu din cookie. Valoarea e versiunea acceptată; expiră în 30 min.
export const COOKIE_ACCEPTARE_TERMENI = "fa_terms";
