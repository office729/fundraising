// Versiunea textelor legale (Termeni, Politica de confidențialitate, Politica
// de cookies) pe care o acceptă utilizatorul la crearea contului — stocată pe
// app_users.terms_version ca dovadă. Se schimbă ODATĂ cu data „Ultima
// actualizare" a textelor, ca să se știe exact ce versiune a fost acceptată.
export const TERMENI_VERSIUNE = "2026-10-02";

// Cookie scurt, first-party, setat de browser când se apasă „Continuă cu
// Google" cu bifa de acceptare bifată: autentificarea Google pleacă din site
// și revine pe pasul de finalizare a organizației, unde caseta de acceptare
// apare PRE-BIFATĂ dacă acest cookie există (userul nu o mai bifează a doua
// oară). Acceptarea se înregistrează pe server din valoarea casetei trimisă de
// formular, nu din cookie. Valoarea e versiunea acceptată; expiră în 30 min.
export const COOKIE_ACCEPTARE_TERMENI = "fa_terms";
