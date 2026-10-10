import { escHtml } from "@/lib/html-escape";

// Emailurile către voluntari (confirmare, reminder, mulțumire, invitație). Aceeași formă pentru toate: scurte, cu un singur buton,
// iar jos o frază despre cum își șterge emailul sau oprește mesajele.

const FUS = "Europe/Bucharest";
const dataLunga = (d: Date) => d.toLocaleString("ro-RO", { timeZone: FUS, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function cadru(continut: string, buton: { text: string; href: string } | null, subsol: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d; line-height: 1.5;">
      ${continut}
      ${
        buton
          ? `<p style="text-align:center;margin:24px 0;"><a href="${escHtml(buton.href)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${escHtml(buton.text)}</a></p>`
          : ""
      }
      <p style="color:#64748b;font-size:12.5px;">${subsol}</p>
    </div>`;
}

const subsolPagina = (link: string | null) =>
  link
    ? `Ți-am scris pentru că ți-ai lăsat adresa ca voluntar. Îți poți șterge adresa sau opri mesajele oricând din <a href="${escHtml(link)}" style="color:#154a85;">pagina ta de voluntar</a>.`
    : "Ți-am scris pentru că ți-ai lăsat adresa ca voluntar.";

export function emailConfirmare(p: { org: string; titlu: string; locatie: string; inceputLa: Date; rol: string; link: string | null }) {
  return {
    subiect: `Ești confirmat(ă): ${p.titlu}`,
    html: cadru(
      `<p>Ești confirmat(ă) la <strong>${escHtml(p.titlu)}</strong>.</p>
       <p>${escHtml(dataLunga(p.inceputLa))}<br>${escHtml(p.locatie)}<br>Rolul tău: ${escHtml(p.rol)}</p>
       <p>Dacă nu mai poți veni, anulează din pagina ta de voluntar, ca să dăm locul mai departe.</p>
       <p>Mulțumim, ${escHtml(p.org)}</p>`,
      p.link ? { text: "Vezi detaliile", href: p.link } : null,
      subsolPagina(p.link),
    ),
  };
}

export function emailReminder(p: { org: string; titlu: string; locatie: string; inceputLa: Date; rol: string; contact: string; link: string | null }) {
  return {
    subiect: `Mâine ne vedem: ${p.titlu}`,
    html: cadru(
      `<p>Ne vedem la <strong>${escHtml(p.titlu)}</strong>.</p>
       <p>${escHtml(dataLunga(p.inceputLa))}<br>${escHtml(p.locatie)}<br>Rolul tău: ${escHtml(p.rol)}</p>
       ${p.contact ? `<p>Contact în ziua activității: ${escHtml(p.contact)}</p>` : ""}
       <p>Nu mai poți ajunge? Anulează din pagina ta, ca să dăm locul mai departe.</p>
       <p>Mulțumim că vii, ${escHtml(p.org)}</p>`,
      p.link ? { text: "Anulează sau vezi detaliile", href: p.link } : null,
      subsolPagina(p.link),
    ),
  };
}

export function emailMultumire(p: { org: string; prenume: string; titlu: string; ore: number; rezultat: string | null; link: string | null }) {
  return {
    subiect: `Mulțumim pentru „${p.titlu}”`,
    html: cadru(
      `<p>Mulțumim, ${escHtml(p.prenume)}!</p>
       <p>Ai fost cu noi la <strong>${escHtml(p.titlu)}</strong> și ai contribuit cu <strong>${escHtml(p.ore.toLocaleString("ro-RO"))} ${p.ore === 1 ? "oră" : "ore"}</strong>.${p.rezultat ? ` Împreună: ${escHtml(p.rezultat)}.` : ""}</p>
       <p>Orele tale sunt confirmate și apar în pagina ta de voluntar. Dacă ai nevoie de o adeverință de voluntariat, cere-o celor de la ${escHtml(p.org)}.</p>`,
      p.link ? { text: "Vezi activitatea ta", href: p.link } : null,
      subsolPagina(p.link),
    ),
  };
}

export function emailInvitatie(p: { org: string; prenume: string; titlu: string; locatie: string; inceputLa: Date; link: string }) {
  return {
    subiect: `Te invităm la „${p.titlu}”`,
    html: cadru(
      `<p>Bună, ${escHtml(p.prenume)}!</p>
       <p>Ai mai fost alături de ${escHtml(p.org)}. Organizăm <strong>${escHtml(p.titlu)}</strong>:</p>
       <p>${escHtml(dataLunga(p.inceputLa))}<br>${escHtml(p.locatie)}</p>
       <p>Dacă te interesează, te poți înscrie din pagina ta de voluntar. Nu e nicio obligație.</p>`,
      { text: "Vezi activitatea", href: p.link },
      `Primești acest mesaj pentru că ai bifat că vrei invitații la activități. Le poți opri oricând din <a href="${escHtml(p.link)}" style="color:#154a85;">pagina ta de voluntar</a>, la „Ale mele”.`,
    ),
  };
}
