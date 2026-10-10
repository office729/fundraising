// Modelele vizuale ale raportului de impact. Fiecare model e o funcție care citește aceleași date și întoarce un document HTML complet
// (CSS inline, fără fonturi sau scripturi externe), ca să poată fi salvat, trimis pe email sau tipărit ca PDF.
import {
  aplicaPlaceholdere,
  dataLunga,
  esc,
  fraza,
  grupePeAn,
  lei,
  lunaAn,
  perioadaImpact,
  proiecteSortate,
  totalImpact,
  type DateImpact,
  type ModelImpact,
  type ProiectImpact,
} from "./raport-impact";

export type ContextRaport = { organizatie: string; azi: string }; // azi: YYYY-MM-DD

const SANS = `"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
const SERIF = `Georgia,"Times New Roman",serif`;

function doc(titlu: string, d: DateImpact, css: string, corp: string): string {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titlu)}</title><style>
:root{--a:${d.accent};--b:${d.accent2};--c:${d.accent3};--t:#1f2430;--m:#5b6270;--l:#e6e8ec}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--t);font-family:${SANS};font-size:14px;line-height:1.55}
a{color:var(--a)}.pag{max-width:800px;margin:0 auto;padding:36px 32px}.nr{font-variant-numeric:tabular-nums;white-space:nowrap}
.logo{max-height:56px;max-width:200px;object-fit:contain}.nopb{break-inside:avoid;page-break-inside:avoid}
@page{size:A4;margin:12mm}@media print{.pag{max-width:none;padding:0}}
${css}</style></head><body>${corp}</body></html>`;
}

const nume = (p: ProiectImpact) => (p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.nume)}</a>` : esc(p.nume));
const logo = (d: DateImpact) => (d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="">` : "");
const paragrafe = (d: DateImpact) => aplicaPlaceholdere(d.narativ, d).map((p) => `<p>${p}</p>`).join("");
const semnatura = (d: DateImpact, c: ContextRaport) => `<p class="semn">${d.autor ? `<strong>${esc(d.autor)}</strong><br>` : ""}${esc(c.organizatie)}<br><span style="color:var(--m)">${esc(dataLunga(c.azi))}</span></p>`;
const detalii = (p: ProiectImpact) => [p.locatie && esc(p.locatie), p.data && lunaAn(p.data), p.anDirectionare && `direcționare ${p.anDirectionare}`].filter(Boolean).join(" · ");
const observatii = (p: ProiectImpact) => (p.observatii ? `<div style="color:var(--m);font-size:12.5px">${esc(p.observatii)}</div>` : "");
const goalProiecte = `<p style="color:var(--m)">Nu sunt proiecte adăugate încă.</p>`;

// Grafica „puls → inimă”: o linie de puls care se termină într-o inimă. Vectorială, ca să nu se taie la export.
const PULS = (culoare: string, latime = 360) =>
  `<svg viewBox="0 0 360 60" width="${latime}" height="${Math.round(latime / 6)}" role="img" aria-label="Puls care se termină într-o inimă" style="max-width:100%"><path d="M0 34 H92 L106 34 L116 10 L130 54 L142 22 L152 34 H250" fill="none" stroke="${culoare}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M300 52 C270 36 264 22 270 14 C278 5 292 8 300 18 C308 8 322 5 330 14 C336 22 330 36 300 52 Z" fill="${culoare}"/></svg>`;

function tabel(d: DateImpact, cls = "tab"): string {
  const randuri = (ps: ProiectImpact[]) =>
    ps
      .map((p) => `<tr class="nopb"><td>${nume(p)}${detalii(p) ? `<div style="color:var(--m);font-size:12px">${detalii(p)}</div>` : ""}${observatii(p)}</td><td class="nr" style="text-align:right">${p.suma !== null ? lei(p.suma) : "—"}</td></tr>`)
      .join("");
  const corp = d.gruparePeAn
    ? grupePeAn(d).map((g) => `<tr class="an"><td>${esc(g.an)}</td><td class="nr" style="text-align:right">${lei(g.total)}</td></tr>${randuri(g.proiecte)}`).join("")
    : randuri(proiecteSortate(d));
  if (!corp) return goalProiecte;
  return `<table class="${cls}"><thead><tr><th>Proiect</th><th style="text-align:right">Sumă</th></tr></thead><tbody>${corp}</tbody><tfoot><tr><td>Total</td><td class="nr" style="text-align:right">${lei(totalImpact(d))}</td></tr></tfoot></table>`;
}

const nrProiecte = (d: DateImpact) => proiecteSortate(d).length;

// 1. Clasic (și „Fără logo”, care ține doar de culori)
function clasic(d: DateImpact, c: ContextRaport, faraLogo: boolean): string {
  const css = `.pag{font-family:${SERIF}}h1{font-size:30px;margin:0 0 4px;color:var(--b);font-weight:700}.sus{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:3px solid var(--a);padding-bottom:14px;margin-bottom:22px}
.firma{font-size:15px;color:var(--m)}.hero{background:var(--c);border-radius:6px;padding:18px 22px;margin:0 0 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hero b{font-size:26px;color:var(--a)}.hero small{display:block;color:var(--m);font-family:${SANS};font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.tab{width:100%;border-collapse:collapse;margin:8px 0 22px;font-family:${SANS}}.tab th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--m);border-bottom:2px solid var(--a);padding:8px 6px}
.tab td{padding:9px 6px;border-bottom:1px solid var(--l);vertical-align:top}.tab tr.an td{background:var(--c);font-weight:700;color:var(--b)}.tab tfoot td{font-weight:700;font-size:16px;border-top:2px solid var(--a);border-bottom:0}
.semn{margin-top:28px}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div class="sus"><div><h1>Raport de impact</h1><div class="firma">Pentru ${esc(d.firma || "—")}${perioadaImpact(d) ? ` · ${esc(perioadaImpact(d))}` : ""}</div></div>${faraLogo ? "" : logo(d)}</div>
<div class="hero"><div>${PULS(d.accent, 220)}</div><div style="text-align:right"><small>Total susținut</small><b class="nr">${lei(totalImpact(d))}</b></div></div>${paragrafe(d)}${tabel(d)}${semnatura(d, c)}</div>`);
}

// 2. Executiv
function executiv(d: DateImpact, c: ContextRaport): string {
  const css = `.pag{font-family:${SANS}}.cap{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-top:6px solid var(--b);padding-top:16px}h1{font-size:22px;margin:0;color:var(--t);letter-spacing:-.01em}
.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--l);margin:20px 0}.kpi div{padding:14px 16px;border-right:1px solid var(--l)}.kpi div:last-child{border-right:0}.kpi small{display:block;color:var(--m);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.kpi b{font-size:20px}
.tab{width:100%;border-collapse:collapse;margin:10px 0}.tab th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--m);text-align:left;border-bottom:1px solid var(--t);padding:6px 4px}.tab td{padding:7px 4px;border-bottom:1px solid var(--l);vertical-align:top}.tab tr.an td{font-weight:700;background:#f6f7f9}.tab tfoot td{font-weight:700;border-top:1px solid var(--t);border-bottom:0}.semn{margin-top:24px;font-size:13px}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div class="cap"><div><h1>Raport de impact — ${esc(d.firma || "—")}</h1><div style="color:var(--m)">${esc(c.organizatie)}${perioadaImpact(d) ? ` · ${esc(perioadaImpact(d))}` : ""}</div></div>${logo(d)}</div>
<div class="kpi"><div><small>Total susținut</small><b class="nr">${lei(totalImpact(d))}</b></div><div><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div><small>Mecanism</small><b style="font-size:13px">${d.mecanism === "d177" ? "Declarația 177" : "Sponsorizare"}</b></div></div>${paragrafe(d)}${tabel(d)}${semnatura(d, c)}</div>`);
}

// 3. Editorial: copertă pe pagina întâi, apoi narativul și proiectele
function editorial(d: DateImpact, c: ContextRaport): string {
  const css = `.cop{min-height:92vh;background:var(--b);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:48px 44px;page-break-after:always;break-after:page}
.cop h1{font-family:${SERIF};font-size:54px;line-height:1.02;margin:0;font-weight:700;letter-spacing:-.02em}.cop .suma{font-family:${SERIF};font-size:40px;color:var(--c)}.cop small{letter-spacing:.14em;text-transform:uppercase;opacity:.8}
.cop .logo{background:#fff;padding:8px 12px;border-radius:4px}.pag{font-family:${SERIF}}.pag p:first-of-type::first-letter{float:left;font-size:60px;line-height:.85;padding:6px 8px 0 0;color:var(--a);font-weight:700}
.lista{margin:26px 0;display:grid;gap:0}.lista .r{display:grid;grid-template-columns:1fr auto;gap:16px;padding:14px 0;border-top:1px solid var(--l)}.lista .r b{font-size:20px;color:var(--a);font-family:${SERIF}}.lista h3{margin:0;font-size:17px}.tot{border-top:3px solid var(--a);padding-top:12px;display:flex;justify-content:space-between;font-size:20px;font-weight:700}.semn{margin-top:28px}`;
  const r = proiecteSortate(d).map((p) => `<div class="r nopb"><div><h3>${nume(p)}</h3><div style="color:var(--m);font-size:13px;font-family:${SANS}">${detalii(p)}</div>${observatii(p)}</div><b class="nr">${p.suma !== null ? lei(p.suma) : ""}</b></div>`).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<section class="cop"><div style="display:flex;justify-content:space-between;align-items:flex-start">${logo(d) || `<small>${esc(c.organizatie)}</small>`}<small>${esc(perioadaImpact(d))}</small></div>
<div><small>Raport de impact</small><h1>${esc(d.firma || "—")}</h1></div><div><small>Împreună am susținut ${nrProiecte(d)} proiecte</small><div class="suma nr">${lei(totalImpact(d))}</div></div></section>
<div class="pag">${paragrafe(d)}<div class="lista">${r || goalProiecte}</div><div class="tot"><span>Total</span><span class="nr">${lei(totalImpact(d))}</span></div>${semnatura(d, c)}</div>`);
}

// 4. Carduri
function carduri(d: DateImpact, c: ContextRaport): string {
  const css = `.sus{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px}h1{margin:0;font-size:26px;color:var(--b)}.rez{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}.rez span{background:var(--c);color:var(--b);border-radius:99px;padding:5px 14px;font-weight:600}
.gr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0}.card{border:1px solid var(--l);border-top:5px solid var(--a);border-radius:8px;padding:14px 16px;background:#fff}.card h3{margin:0 0 6px;font-size:16px}.card .s{font-size:22px;font-weight:700;color:var(--a)}.card .m{color:var(--m);font-size:12.5px}
.an{grid-column:1/-1;font-weight:700;color:var(--b);border-bottom:2px solid var(--a);padding-bottom:4px;margin-top:6px;display:flex;justify-content:space-between}@media(max-width:560px){.gr{grid-template-columns:1fr}}`;
  const card = (p: ProiectImpact) => `<div class="card nopb"><h3>${nume(p)}</h3><div class="s nr">${p.suma !== null ? lei(p.suma) : "—"}</div><div class="m">${detalii(p)}</div>${observatii(p)}</div>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map(card).join("")}`).join("") : proiecteSortate(d).map(card).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div class="sus"><h1>${esc(d.firma || "—")}<br><span style="font-size:15px;font-weight:400;color:var(--m)">Raport de impact</span></h1>${logo(d)}</div>
<div class="rez"><span class="nr">${lei(totalImpact(d))}</span><span>${nrProiecte(d)} proiecte</span>${perioadaImpact(d) ? `<span>${esc(perioadaImpact(d))}</span>` : ""}</div>${paragrafe(d)}<div class="gr">${corp}</div>${nrProiecte(d) ? "" : goalProiecte}${semnatura(d, c)}</div>`);
}

// 6. Scrisoare de mulțumire
function scrisoare(d: DateImpact, c: ContextRaport): string {
  const css = `.pag{max-width:680px;font-family:${SERIF};font-size:15.5px;line-height:1.7}.ant{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid var(--a);padding-bottom:12px;margin-bottom:26px}.ant small{color:var(--m);font-family:${SANS}}
ul{padding-left:20px}li{margin:4px 0}.semn{margin-top:32px}.puls{margin:22px 0 0}`;
  const li = proiecteSortate(d).map((p) => `<li>${nume(p)}${p.suma !== null ? ` — <span class="nr">${lei(p.suma)}</span>` : ""}${p.data ? ` (${esc(lunaAn(p.data))})` : ""}</li>`).join("");
  return doc(`Mulțumire — ${d.firma}`, d, css, `<div class="pag"><div class="ant"><div><strong>${esc(c.organizatie)}</strong><br><small>${esc(dataLunga(c.azi))}</small></div>${logo(d)}</div>
<p>Stimată conducere ${esc(d.firma || "a companiei")},</p>${paragrafe(d)}${li ? `<p>Proiectele pe care le-ați făcut posibile:</p><ul>${li}</ul>` : ""}<p>Total susținut: <strong class="nr">${lei(totalImpact(d))}</strong>.</p>
<p>Cu recunoștință,</p>${semnatura(d, c)}<div class="puls">${PULS(d.accent, 160)}</div></div>`);
}

// 7. Minimal
function minimal(d: DateImpact, c: ContextRaport): string {
  const css = `.pag{max-width:700px;padding:64px 32px;font-weight:300}h1{font-weight:300;font-size:34px;letter-spacing:-.02em;margin:0 0 8px}.t{font-size:56px;font-weight:200;color:var(--a);letter-spacing:-.03em;margin:28px 0 4px}.mic{color:var(--m);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.r{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--l)}.r:first-of-type{border-top:1px solid var(--l)}.r b{font-weight:500}.an{margin-top:26px;color:var(--a);font-size:12px;letter-spacing:.12em;text-transform:uppercase}.semn{margin-top:46px}`;
  const rand = (p: ProiectImpact) => `<div class="r nopb"><div>${nume(p)}<div style="color:var(--m);font-size:12.5px">${detalii(p)}</div>${observatii(p)}</div><b class="nr">${p.suma !== null ? lei(p.suma) : ""}</b></div>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an">${esc(g.an)} · ${lei(g.total)}</div>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div style="display:flex;justify-content:space-between;align-items:center">${logo(d) || `<span class="mic">${esc(c.organizatie)}</span>`}<span class="mic">${esc(perioadaImpact(d))}</span></div>
<h1 style="margin-top:56px">${esc(d.firma || "—")}</h1><div class="mic">Raport de impact</div><div class="t nr">${lei(totalImpact(d))}</div><div class="mic" style="margin-bottom:34px">${nrProiecte(d)} proiecte susținute</div>${paragrafe(d)}<div style="margin-top:30px">${corp || goalProiecte}</div>${semnatura(d, c)}</div>`);
}

// 8. Cronologic
function cronologic(d: DateImpact, c: ContextRaport): string {
  const css = `h1{margin:0;font-size:26px;color:var(--b)}.tl{position:relative;margin:26px 0 10px;padding-left:30px}.tl:before{content:"";position:absolute;left:8px;top:6px;bottom:6px;width:3px;background:var(--l);border-radius:2px}
.e{position:relative;margin:0 0 16px}.e:before{content:"";position:absolute;left:-29px;top:14px;width:15px;height:15px;border-radius:50%;background:var(--a);border:3px solid #fff;box-shadow:0 0 0 2px var(--a)}.e .k{border:1px solid var(--l);border-radius:8px;padding:11px 14px}.e .z{color:var(--a);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.e h3{margin:2px 0 2px;font-size:16px}.e .s{font-weight:700}.tot{display:flex;justify-content:space-between;border-top:3px solid var(--a);padding-top:10px;font-size:18px;font-weight:700}.semn{margin-top:24px}`;
  const e = proiecteSortate(d).map((p) => `<div class="e nopb"><div class="k"><div class="z">${esc(lunaAn(p.data) || (p.anDirectionare ? String(p.anDirectionare) : "Fără dată"))}</div><h3>${nume(p)}</h3><div class="s nr">${p.suma !== null ? lei(p.suma) : ""}</div><div style="color:var(--m);font-size:12.5px">${[p.locatie && esc(p.locatie)].filter(Boolean).join("")}</div>${observatii(p)}</div></div>`).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h1>Drumul împreună cu ${esc(d.firma || "—")}</h1>${logo(d)}</div>${paragrafe(d)}<div class="tl">${e || goalProiecte}</div><div class="tot"><span>Total</span><span class="nr">${lei(totalImpact(d))}</span></div>${semnatura(d, c)}</div>`);
}

// 9. Infografic
function infografic(d: DateImpact, c: ContextRaport): string {
  const ps = proiecteSortate(d);
  const maxim = Math.max(1, ...ps.map((p) => p.suma ?? 0));
  const css = `.sus{display:flex;justify-content:space-between;align-items:center;gap:12px}h1{margin:0;font-size:24px;color:var(--b)}.kp{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:18px 0}.kp div{background:var(--c);border-radius:10px;padding:18px}.kp b{display:block;font-size:40px;line-height:1.05;color:var(--a);letter-spacing:-.02em}.kp small{color:var(--m);text-transform:uppercase;letter-spacing:.08em;font-size:11px}
.r{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--l)}.bar{height:10px;border-radius:99px;background:var(--l);overflow:hidden}.bar i{display:block;height:100%;background:var(--a);border-radius:99px}.semn{margin-top:22px}@media(max-width:560px){.kp{grid-template-columns:1fr}}`;
  const r = ps.map((p) => `<div class="r nopb"><div>${nume(p)}</div><div class="bar"><i style="width:${Math.max(2, Math.round(((p.suma ?? 0) / maxim) * 100))}%"></i></div><b class="nr">${p.suma !== null ? lei(p.suma) : "—"}</b></div>`).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div class="sus"><h1>Impactul ${esc(d.firma || "—")}</h1>${logo(d)}</div>
<div class="kp"><div><small>Total susținut</small><b class="nr">${lei(totalImpact(d))}</b></div><div><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div><small>Perioadă</small><b style="font-size:17px;line-height:1.3">${esc(perioadaImpact(d) || "—")}</b></div></div>${paragrafe(d)}<div>${r || goalProiecte}</div>${semnatura(d, c)}</div>`);
}

// 10. Corporate
function corporate(d: DateImpact, c: ContextRaport): string {
  const css = `.pag{padding-top:0}.ant{background:var(--b);color:#fff;margin:0 -32px 24px;padding:26px 32px;display:flex;justify-content:space-between;align-items:center;gap:16px}.ant h1{margin:0;font-size:22px;font-weight:600}.ant small{opacity:.8;letter-spacing:.1em;text-transform:uppercase}.ant .logo{background:#fff;padding:6px 10px;border-radius:3px}
.ref{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;border:1px solid var(--l);padding:12px 16px;margin-bottom:18px;font-size:13px}.ref span{color:var(--m)}
.tab{width:100%;border-collapse:collapse;margin:12px 0}.tab th{background:var(--b);color:#fff;text-align:left;font-size:12px;padding:8px 10px}.tab td{padding:8px 10px;border:1px solid var(--l);vertical-align:top}.tab tr.an td{background:var(--c);font-weight:700}.tab tfoot td{font-weight:700;background:#f6f7f9}.semn{margin-top:26px}@media print{.ant{margin:0 0 20px}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div class="ant"><div><small>${esc(c.organizatie)}</small><h1>Raport de impact</h1></div>${logo(d)}</div>
<div class="ref"><div><span>Către</span><br><strong>${esc(d.firma || "—")}</strong></div><div><span>Data</span><br>${esc(dataLunga(c.azi))}</div><div><span>Temei</span><br>${esc(fraza(d))}</div><div><span>Perioadă</span><br>${esc(perioadaImpact(d) || "—")}</div></div>${paragrafe(d)}${tabel(d, "tab")}${semnatura(d, c)}</div>`);
}

// 11. O pagină
function oPagina(d: DateImpact, c: ContextRaport): string {
  const css = `.pag{padding:20px 22px;font-size:12.5px;line-height:1.45}.sus{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:3px solid var(--a);padding-bottom:8px;margin-bottom:12px}h1{margin:0;font-size:20px;color:var(--b)}
.g{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:20px}.k{background:var(--c);border-radius:8px;padding:10px 12px;margin-bottom:10px}.k b{display:block;font-size:24px;color:var(--a)}.k small{color:var(--m);text-transform:uppercase;letter-spacing:.06em;font-size:10.5px}
.r{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid var(--l)}.semn{margin-top:10px;font-size:12px}.logo{max-height:38px}@media(max-width:600px){.g{grid-template-columns:1fr}}`;
  const r = proiecteSortate(d).map((p) => `<div class="r nopb"><span>${nume(p)}${p.data ? ` <span style="color:var(--m)">· ${esc(lunaAn(p.data))}</span>` : ""}</span><b class="nr">${p.suma !== null ? lei(p.suma) : ""}</b></div>`).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<div class="pag"><div class="sus"><h1>${esc(d.firma || "—")} · Raport de impact</h1>${logo(d)}</div><div class="g"><div><div class="k"><small>Total susținut</small><b class="nr">${lei(totalImpact(d))}</b></div><div class="k"><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div>${paragrafe(d)}</div><div>${r || goalProiecte}</div></div>${semnatura(d, c)}</div>`);
}

export function randeazaRaportImpact(d: DateImpact, c: ContextRaport, model: ModelImpact = d.model): string {
  switch (model) {
    case "executiv": return executiv(d, c);
    case "editorial": return editorial(d, c);
    case "carduri": return carduri(d, c);
    case "fara-logo": return clasic(d, c, true);
    case "scrisoare": return scrisoare(d, c);
    case "minimal": return minimal(d, c);
    case "cronologic": return cronologic(d, c);
    case "infografic": return infografic(d, c);
    case "corporate": return corporate(d, c);
    case "o-pagina": return oPagina(d, c);
    default: return clasic(d, c, false);
  }
}
