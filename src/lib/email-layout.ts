import { escHtml } from "./html-escape";

// Cadrul comun al emailurilor tranzacționale Alexandrit: antet cu sigla, carcasă albă pe fundal deschis, titlu, text, buton și subsol.
// Doar tabele și stiluri inline (compatibil cu Outlook și Gmail). `corpHtml` trebuie să vină deja escapat de apelant (vezi `paragraf`); celelalte
// câmpuri de text trec prin escHtml aici.

const bazaSite = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");

// O adresă de email în text: Gmail o transformă în link albastru subliniat, iar dacă „@” e rupt, leagă măcar domeniul (gmail.com). Un caracter invizibil
// după „@” și după fiecare punct oprește asta, fără să schimbe cum arată.
export function emailFaraLink(adresa: string): string {
  return escHtml(adresa).replace(/[@.]/g, (c) => `${c}&#8203;`);
}

export type ParametriLayoutEmail = {
  // Textul scurt afișat de clientul de email lângă subiect (nu apare în corp).
  previzualizare?: string;
  titlu: string;
  // HTML deja escapat de apelant: paragrafe făcute cu `paragraf`.
  corpHtml: string;
  // Butonul principal, cu linkul de rezervă afișat dedesubt.
  buton?: { text: string; url: string };
  // Notă mică sub buton (ex. valabilitate).
  nota?: string;
};

const STIL_PARAGRAF = "margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;";

// Un paragraf în stilul emailului; `htmlDejaEscapat` trebuie să vină din escHtml / emailFaraLink / text fix.
export function paragraf(htmlDejaEscapat: string): string {
  return `<p style="${STIL_PARAGRAF}">${htmlDejaEscapat}</p>`;
}

export function layoutEmail(p: ParametriLayoutEmail): string {
  const baza = bazaSite();
  const buton = p.buton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;"><tr><td style="border-radius:8px;background:#154a85;">
        <a href="${escHtml(p.buton.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escHtml(p.buton.text)}</a>
      </td></tr></table>
      <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#64748b;">Dacă butonul nu se deschide, copiază acest link în browser:<br><a href="${escHtml(p.buton.url)}" style="color:#154a85;word-break:break-all;">${escHtml(p.buton.url)}</a></p>`
    : "";
  const nota = p.nota
    ? `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#64748b;">${escHtml(p.nota)}</p>`
    : "";
  const previzualizare = p.previzualizare
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escHtml(p.previzualizare)}</div>`
    : "";
  return `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(p.titlu)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
${previzualizare}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="padding:0 4px 18px;">
      <a href="${baza}" style="text-decoration:none;"><img src="${baza}/alexandrit-logo-email.png" width="150" alt="Alexandrit" style="display:block;border:0;height:auto;width:150px;"></a>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:30px 30px 26px;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#14213d;">${escHtml(p.titlu)}</h1>
      ${p.corpHtml}
      ${buton}
      ${nota}
    </td></tr>
    <tr><td style="padding:18px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:#94a3b8;">
      Alexandrit · platforma de fundraising pentru ONG-uri<br>
      <a href="${baza}" style="color:#94a3b8;">alexandrit.ro</a> · <a href="${baza}/contact" style="color:#94a3b8;">Contact</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
