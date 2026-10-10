// Modelele vizuale ale raportului de impact. Fiecare model e o funcție care citește aceleași date și întoarce un document HTML complet
// (CSS inline, fără fonturi sau scripturi externe), ca să poată fi salvat, trimis pe email sau tipărit ca PDF.
// Pe ecran documentul stă ca o foaie A4 pe un fundal neutru; la tipărire rămâne doar foaia.
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
const SERIF = `Georgia,"Iowan Old Style","Times New Roman",serif`;
const LUNI_SCURT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
const lunaScurta = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? LUNI_SCURT[Number(iso.slice(5, 7)) - 1] : "");

// --- Grafică ---------------------------------------------------------------------------------------------------------------------------

const icon = (cale: string, marime = 14) => `<svg viewBox="0 0 24 24" width="${marime}" height="${marime}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cale}</svg>`;
const ICON = {
  pin: icon(`<path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>`),
  cal: icon(`<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`),
  inima: icon(`<path d="M12 20.5 4.6 13A4.9 4.9 0 0 1 12 6.7 4.9 4.9 0 0 1 19.4 13z"/>`, 16),
  grup: icon(`<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.3 2.7-5.8 6-5.8s6 2.5 6 5.8"/><path d="M16.5 5.6a3.2 3.2 0 0 1 0 5.8M18.5 14.6c1.6.8 2.7 2.7 2.7 5"/>`, 22),
  moneda: icon(`<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.2 5.8 4.2 0 1.3-1.3 2.1-3 2.1-1.4 0-2.5-.6-3-1.6"/><path d="M12 6.4v1.4M12 16.2v1.4"/>`, 22),
  calendar: icon(`<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M8 17h2"/>`, 22),
  sageata: icon(`<path d="M5 12h14M13 6l6 6-6 6"/>`, 14),
};

// Inima cu linia de puls care o străbate: gradient din culorile organizației, strălucire discretă, ECG alb peste.
function inima(marime: number, id = "g"): string {
  return `<svg viewBox="0 0 120 112" width="${marime}" height="${Math.round((marime * 112) / 120)}" role="img" aria-label="Inimă străbătută de o linie de puls"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a)"/><stop offset="1" stop-color="var(--b)"/></linearGradient><radialGradient id="${id}s" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<path d="M60 104 14 58C-2 42 2 16 24 8c14-5 29 1 36 14 7-13 22-19 36-14 22 8 26 34 10 50z" fill="url(#${id})"/><path d="M60 104 14 58C-2 42 2 16 24 8c14-5 29 1 36 14 7-13 22-19 36-14 22 8 26 34 10 50z" fill="url(#${id}s)"/>
<path d="M6 54h30l8-16 12 36 10-28 7 8h41" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Bandă de ECG pentru fundaluri: o linie de bază cu bătăi regulate, pe toată lățimea.
function ecg(culoare = "currentColor", opacitate = 0.22): string {
  const bataie = (x: number) => `L${x + 20} 40 L${x + 30} 14 L${x + 44} 66 L${x + 56} 28 L${x + 66} 40`;
  let cale = "M0 40";
  for (let x = 40; x < 1200; x += 190) cale += ` L${x} 40 ${bataie(x)}`;
  cale += " L1200 40";
  return `<svg viewBox="0 0 1200 80" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true"><path d="${cale}" fill="none" stroke="${culoare}" stroke-opacity="${opacitate}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

const NUANTE = ["var(--a)", "var(--b)", "color-mix(in srgb,var(--a) 62%,#fff)", "color-mix(in srgb,var(--b) 62%,#fff)", "color-mix(in srgb,var(--a) 38%,#fff)", "color-mix(in srgb,var(--b) 40%,#fff)", "color-mix(in srgb,var(--a) 22%,#fff)"];

// Inel cu ponderea fiecărui proiect în total (cele mici se adună la „Altele”).
function inel(d: DateImpact, marime = 170): { svg: string; legenda: { nume: string; suma: number; nuanta: string; procent: number }[] } {
  const ps = proiecteSortate(d).filter((p) => (p.suma ?? 0) > 0).sort((a, b) => (b.suma ?? 0) - (a.suma ?? 0));
  const total = ps.reduce((s, p) => s + (p.suma ?? 0), 0);
  if (total === 0) return { svg: "", legenda: [] };
  const mari = ps.slice(0, 6).map((p) => ({ nume: p.nume, suma: p.suma ?? 0 }));
  const rest = ps.slice(6).reduce((s, p) => s + (p.suma ?? 0), 0);
  if (rest > 0) mari.push({ nume: "Altele", suma: rest });
  const r = 52;
  const C = 2 * Math.PI * r;
  let deplasare = 0;
  const legenda = mari.map((m, i) => ({ ...m, nuanta: NUANTE[i % NUANTE.length], procent: Math.round((m.suma / total) * 100) }));
  const arce = legenda.map((m) => {
    const lung = (m.suma / total) * C;
    const s = `<circle cx="70" cy="70" r="${r}" fill="none" style="stroke:${m.nuanta}" stroke-width="17" stroke-dasharray="${Math.max(0, lung - 1.6).toFixed(2)} ${(C - Math.max(0, lung - 1.6)).toFixed(2)}" stroke-dashoffset="${(-deplasare).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
    deplasare += lung;
    return s;
  });
  return { svg: `<svg viewBox="0 0 140 140" width="${marime}" height="${marime}" role="img" aria-label="Ponderea proiectelor în total"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--l)" stroke-width="17"/>${arce.join("")}<text x="70" y="68" text-anchor="middle" font-family="${SERIF}" font-size="17" font-weight="700" fill="var(--t)">${esc(String(ps.length))}</text><text x="70" y="84" text-anchor="middle" font-size="8.5" fill="var(--m)" letter-spacing=".08em">${ps.length === 1 ? "PROIECT" : "PROIECTE"}</text></svg>`, legenda };
}

// --- Schelet comun ---------------------------------------------------------------------------------------------------------------------

function doc(titlu: string, d: DateImpact, css: string, corp: string): string {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titlu)}</title><style>
:root{--a:${d.accent};--b:${d.accent2};--c:${d.accent3};--t:#231f20;--m:#6a6466;--l:#e9e4e4;--fond:#ece9e9;--ab:color-mix(in srgb,var(--a) 9%,#fff)}
*{box-sizing:border-box}html{background:var(--fond);-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;color:var(--t);font-family:${SANS};font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--a);text-decoration-thickness:1px;text-underline-offset:2px}h1,h2,h3,p{margin:0}
.foaie{max-width:860px;margin:28px auto;background:#fff;box-shadow:0 1px 2px rgba(35,31,32,.08),0 22px 60px rgba(35,31,32,.14);overflow:hidden}
.in{padding:36px 48px}.nr{font-variant-numeric:tabular-nums;white-space:nowrap}.logo{max-height:52px;max-width:190px;object-fit:contain}.nopb{break-inside:avoid;page-break-inside:avoid}
.mt{display:inline-flex;align-items:center;gap:5px;color:var(--m);font-size:12.5px}.mt svg{color:var(--a);flex:none}.mt+.mt{margin-left:14px}
.ey{font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--a)}.lead{font-size:18px;line-height:1.55;color:var(--t)}
.semn{margin-top:30px}.semn b{font-family:${SERIF};font-style:italic;font-size:24px;font-weight:400;color:var(--b);display:block;line-height:1.2}.semn span{color:var(--m);font-size:13px}
@media(max-width:640px){.foaie{margin:0;box-shadow:none}.in{padding:24px 20px}}
@page{size:A4;margin:0}@media print{html{background:#fff}.foaie{margin:0;box-shadow:none;max-width:none}body{font-size:14px}}
${css}</style></head><body>${corp}</body></html>`;
}

const nume = (p: ProiectImpact) => (p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.nume)}</a>` : esc(p.nume));
const logo = (d: DateImpact) => (d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="">` : "");
const paragrafe = (d: DateImpact, cuLead = true) => aplicaPlaceholdere(d.narativ, d).map((p, i) => `<p${cuLead && i === 0 ? ' class="lead"' : ""} style="margin-top:${i ? 12 : 0}px">${p}</p>`).join("");
const semnatura = (d: DateImpact, c: ContextRaport) => `<div class="semn"><b>${esc(d.autor || c.organizatie)}</b><span>${d.autor ? `${esc(c.organizatie)} · ` : ""}${esc(dataLunga(c.azi))}</span></div>`;
const meta = (p: ProiectImpact) => [p.locatie && `<span class="mt">${ICON.pin}${esc(p.locatie)}</span>`, p.data && `<span class="mt">${ICON.cal}${esc(lunaAn(p.data))}</span>`, p.anDirectionare && `<span class="mt">${ICON.inima}Direcționare ${p.anDirectionare}</span>`].filter(Boolean).join("");
const obs = (p: ProiectImpact) => (p.observatii ? `<p style="color:var(--m);font-size:13.5px;margin-top:6px">${esc(p.observatii)}</p>` : "");
const goal = `<p style="color:var(--m);padding:18px 0">Nu sunt proiecte adăugate încă.</p>`;
const nrProiecte = (d: DateImpact) => proiecteSortate(d).length;
const parte = (p: ProiectImpact, total: number) => (total > 0 && p.suma ? Math.max(2, Math.round((p.suma / total) * 100)) : 0);
const procentTxt = (p: ProiectImpact, total: number) => (total > 0 && p.suma ? `${Math.round((p.suma / total) * 100)}% din total` : "");

// Fișa unui proiect: data în margine, numele, detaliile, ponderea și suma.
function fisa(p: ProiectImpact, total: number): string {
  return `<article class="fisa nopb"><div class="dt"><b>${esc(lunaScurta(p.data) || "—")}</b><span>${esc(p.data ? p.data.slice(0, 4) : p.anDirectionare ? String(p.anDirectionare) : "")}</span></div>
<div class="cn"><h3>${nume(p)}</h3><div class="mm">${meta(p)}</div>${obs(p)}${parte(p, total) ? `<div class="sh"><i style="width:${parte(p, total)}%"></i></div>` : ""}</div>
<div class="sm"><span class="nr">${p.suma !== null ? lei(p.suma) : "—"}</span><small>${esc(procentTxt(p, total))}</small></div></article>`;
}
const CSS_FISA = `.fisa{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:18px;padding:18px 0;border-top:1px solid var(--l)}.fisa:first-child{border-top:0}
.dt{text-align:center;background:var(--ab);border-radius:10px;padding:8px 0;align-self:start}.dt b{display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--a)}.dt span{font-family:${SERIF};font-size:17px;font-weight:700}
.cn h3{font-family:${SERIF};font-size:19px;line-height:1.3;font-weight:700}.mm{margin-top:5px}.sh{height:5px;background:var(--l);border-radius:9px;margin-top:11px;overflow:hidden;max-width:340px}.sh i{display:block;height:100%;background:linear-gradient(90deg,var(--a),var(--b));border-radius:9px}
.sm{text-align:right}.sm span{font-family:${SERIF};font-size:21px;font-weight:700;color:var(--b)}.sm small{display:block;color:var(--m);font-size:11.5px}
.an{display:flex;justify-content:space-between;align-items:baseline;margin:26px 0 4px;padding-bottom:8px;border-bottom:2px solid var(--a)}.an span:first-child{font-family:${SERIF};font-size:26px;font-weight:700;color:var(--a)}.an .nr{font-weight:600;color:var(--m)}
@media(max-width:640px){.fisa{grid-template-columns:50px minmax(0,1fr)}.sm{grid-column:2;text-align:left}}`;

function listaFise(d: DateImpact, total: number): string {
  if (d.proiecte.filter((p) => p.nume).length === 0) return goal;
  if (!d.gruparePeAn) return proiecteSortate(d).map((p) => fisa(p, total)).join("");
  return grupePeAn(d).map((g) => `<div class="an nopb"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map((p) => fisa(p, total)).join("")}`).join("");
}

// --- 1. Clasic (și „Fără logo”) ------------------------------------------------------------------------------------------------------

function clasic(d: DateImpact, c: ContextRaport, faraLogo: boolean): string {
  const total = totalImpact(d);
  const css = `.banda{height:10px;background:linear-gradient(90deg,var(--a),var(--b))}.cap{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:20px 48px 0;color:var(--m);font-size:12.5px;letter-spacing:.06em;text-transform:uppercase}
.hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;padding:34px 48px 26px}.hero h1{font-family:${SERIF};font-size:44px;line-height:1.08;letter-spacing:-.02em;color:var(--b);margin-top:10px}.hero p.sub{margin-top:10px;color:var(--m);font-size:16px}
.tot{position:relative;margin:6px 48px 0;border-radius:16px;background:var(--c);padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;overflow:hidden;color:var(--a)}.tot .bg{position:absolute;inset:0;opacity:1}.tot>div{position:relative}
.tot small{display:block;color:var(--m);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}.tot b{font-family:${SERIF};font-size:58px;line-height:1.05;color:var(--a);letter-spacing:-.03em}.tot .r{text-align:right;color:var(--t);font-size:14px}.tot .r strong{display:block;font-family:${SERIF};font-size:30px;color:var(--b)}
.in h2{font-family:${SERIF};font-size:22px;margin:34px 0 4px}${CSS_FISA}
.pic{margin-top:34px;background:var(--b);color:#fff;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:13px}.pic b{font-family:${SERIF};font-size:18px;font-weight:400;font-style:italic}.pic svg{height:34px;width:auto}
@media(max-width:640px){.hero{grid-template-columns:1fr;padding:26px 20px 18px}.hero h1{font-size:32px}.hero .art{display:none}.cap,.pic{padding-left:20px;padding-right:20px}.tot{margin:6px 20px 0;padding:20px}.tot b{font-size:42px}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="banda"></div>
<div class="cap"><span>${faraLogo || !d.logoUrl ? esc(c.organizatie) : logo(d)}</span><span>${esc(perioadaImpact(d))}</span></div>
<section class="hero"><div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1><p class="sub">Ce a făcut sprijinul dumneavoastră</p></div><div class="art">${inima(150, "h1")}</div></section>
<section class="tot"><div class="bg">${ecg("currentColor", 0.11)}</div><div><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div class="r"><strong>${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect" : "proiecte"}</strong>${d.mecanism === "d177" ? "Declarația 177" : "Sponsorizare"}</div></section>
<div class="in">${paragrafe(d)}<h2>Proiectele susținute</h2>${listaFise(d, total)}${semnatura(d, c)}</div>
<footer class="pic"><span>${esc(c.organizatie)}</span><b>Vă mulțumim că ați fost alături de noi</b></footer></main>`);
}

// --- 2. Executiv: grilă sobră, rezumat lateral, tabel cu bare -------------------------------------------------------------------------

function executiv(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const maxim = Math.max(1, ...proiecteSortate(d).map((p) => p.suma ?? 0));
  const rand = (p: ProiectImpact) => `<tr class="nopb"><td><div class="n">${nume(p)}</div><div>${meta(p)}</div>${obs(p)}</td><td class="b"><div><i style="width:${Math.max(3, Math.round(((p.suma ?? 0) / maxim) * 100))}%"></i></div></td><td class="nr s">${p.suma !== null ? lei(p.suma) : "—"}</td></tr>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<tr class="gr"><td colspan="2">${esc(g.an)}</td><td class="nr s">${lei(g.total)}</td></tr>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  const css = `.cap{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:26px 48px 18px;border-bottom:1px solid var(--t)}.cap strong{font-size:12px;letter-spacing:.16em;text-transform:uppercase}.cap span{color:var(--m);font-size:12.5px}
.titlu{padding:30px 48px 10px}.titlu h1{font-size:34px;line-height:1.12;letter-spacing:-.025em;font-weight:700}.titlu p{color:var(--m);margin-top:6px}
.cols{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:34px;padding:10px 48px 40px}.side{border-left:1px solid var(--l);padding-left:26px}.side dl{margin:0}.side dt{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);font-weight:700;margin-top:18px}.side dt:first-child{margin-top:0}.side dd{margin:3px 0 0;font-size:15px}.side dd.k{font-size:34px;font-weight:700;letter-spacing:-.03em;line-height:1.1;color:var(--a)}
.tb{width:100%;border-collapse:collapse;margin-top:22px}.tb th{text-align:left;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);padding:0 0 8px;border-bottom:1px solid var(--t)}.tb td{padding:12px 0;border-bottom:1px solid var(--l);vertical-align:top}.tb .n{font-weight:600}.tb .b{width:22%;padding:18px 12px 0}.tb .b div{height:6px;background:var(--l);border-radius:9px;overflow:hidden}.tb .b i{display:block;height:100%;background:var(--a);border-radius:9px}.tb .s{text-align:right;font-weight:700}.tb tr.gr td{background:var(--ab);font-weight:700;color:var(--b);padding:8px 10px}.tb tfoot td{border-top:2px solid var(--t);border-bottom:0;font-weight:700;font-size:16px}
@media(max-width:700px){.cols{grid-template-columns:1fr;padding:10px 20px 30px}.side{border:0;padding:0}.cap,.titlu{padding-left:20px;padding-right:20px}.tb .b{display:none}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="cap"><strong>${esc(c.organizatie)}</strong>${logo(d) || `<span>${esc(dataLunga(c.azi))}</span>`}</div>
<section class="titlu"><div class="ey">Raport de impact</div><h1 style="margin-top:8px">${esc(d.firma || "—")}</h1></section>
<div class="cols"><div>${paragrafe(d)}<table class="tb"><thead><tr><th>Proiect</th><th></th><th style="text-align:right">Sumă</th></tr></thead><tbody>${corp || ""}</tbody><tfoot><tr><td colspan="2">Total</td><td class="nr s">${lei(total)}</td></tr></tfoot></table>${nrProiecte(d) ? "" : goal}${semnatura(d, c)}</div>
<aside class="side"><dl><dt>Total susținut</dt><dd class="k nr">${lei(total)}</dd><dt>Proiecte</dt><dd>${nrProiecte(d)}</dd><dt>Perioadă</dt><dd>${esc(perioadaImpact(d) || "—")}</dd><dt>Temei</dt><dd style="font-size:13px">${esc(fraza(d))}</dd></dl></aside></div></main>`);
}

// --- 3. Editorial: copertă și poveste -------------------------------------------------------------------------------------------------

function editorial(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.cop{position:relative;min-height:880px;background:linear-gradient(155deg,var(--b) 0%,var(--a) 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:44px 52px;overflow:hidden;break-after:page;page-break-after:always}
.cop .fund{position:absolute;right:-90px;bottom:-60px;opacity:.14}.cop .bandaE{position:absolute;left:0;right:0;top:68%;height:80px;color:#fff}.cop>*{position:relative}.cop .sus{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.92}
.cop .logo{background:#fff;padding:8px 12px;border-radius:6px}.cop h1{font-family:${SERIF};font-size:70px;line-height:.98;letter-spacing:-.03em;margin:14px 0 0;max-width:640px}.cop .ey{color:#fff;opacity:.85}.cop .jos{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}
.cop .jos b{font-family:${SERIF};font-size:54px;line-height:1;display:block;letter-spacing:-.03em}.cop .jos small{font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.85}
.poveste{padding:50px 56px 20px;font-family:${SERIF}}.poveste p{font-size:17.5px;line-height:1.75}.poveste p:first-child::first-letter{float:left;font-size:78px;line-height:.8;padding:8px 12px 0 0;color:var(--a);font-weight:700}
.citat{margin:30px 56px;padding:22px 0;border-top:3px solid var(--a);border-bottom:1px solid var(--l);display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}.citat b{font-family:${SERIF};font-size:46px;color:var(--a);letter-spacing:-.02em}.citat span{color:var(--m);font-size:14px}
.lista{padding:6px 56px 40px}.lista h2{font-family:${SERIF};font-size:26px;margin-bottom:6px}.lista .fisa{grid-template-columns:minmax(0,1fr) auto}.lista .dt{display:none}${CSS_FISA}
@media(max-width:640px){.cop{padding:28px 22px;min-height:620px}.cop h1{font-size:42px}.cop .jos b{font-size:38px}.poveste,.lista{padding-left:22px;padding-right:22px}.citat{margin:24px 22px}}@media print{.cop{min-height:277mm}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><section class="cop"><div class="fund">${inima(520, "e1")}</div><div class="bandaE">${ecg("#fff", 0.38)}</div>
<div class="sus"><span>${logo(d) || esc(c.organizatie)}</span><span>${esc(perioadaImpact(d))}</span></div>
<div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1></div>
<div class="jos"><div><small>Împreună am susținut ${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect" : "proiecte"}</small><b class="nr">${lei(total)}</b></div><div style="text-align:right"><small>${esc(c.organizatie)}</small></div></div></section>
<section class="poveste">${paragrafe(d, false)}</section>
<div class="citat"><b class="nr">${lei(total)}</b><span>${nrProiecte(d)} proiecte · ${d.mecanism === "d177" ? "Declarația 177" : "sponsorizare"}</span></div>
<section class="lista"><h2>Ce am făcut cu ele</h2>${listaFise(d, total)}${semnatura(d, c)}</section></main>`);
}

// --- 4. Carduri ------------------------------------------------------------------------------------------------------------------------

function carduri(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.sus{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:26px 44px 0}.sus .nm{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--m)}
.hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:20px 44px 8px}.hero h1{font-family:${SERIF};font-size:38px;line-height:1.1;letter-spacing:-.02em;color:var(--b);margin-top:8px}
.chips{display:flex;gap:10px;flex-wrap:wrap;padding:6px 44px 6px}.chips span{display:inline-flex;align-items:center;gap:8px;background:var(--ab);color:var(--b);border-radius:99px;padding:8px 16px;font-weight:600;font-size:14px}.chips svg{color:var(--a)}
.txt{padding:14px 44px 4px}.gr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:12px 44px 40px}
.an{grid-column:1/-1;display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--a);padding-bottom:6px;margin-top:10px}.an span:first-child{font-family:${SERIF};font-size:24px;font-weight:700;color:var(--a)}.an .nr{color:var(--m);font-weight:600}
.card{position:relative;border:1px solid var(--l);border-radius:16px;padding:0 20px 18px;background:#fff;overflow:hidden;display:flex;flex-direction:column}.card .top{height:64px;margin:0 -20px 14px;background:var(--c);color:var(--a);position:relative}.card .top svg{position:absolute;inset:0}.card .top .ic{position:absolute;left:20px;bottom:-14px;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--b));color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px #fff}
.card h3{font-family:${SERIF};font-size:18px;line-height:1.3;margin:18px 0 4px}.card .s{font-family:${SERIF};font-size:30px;font-weight:700;color:var(--a);letter-spacing:-.02em;margin:6px 0 6px}.card .mm{display:flex;flex-direction:column;gap:3px}.card .mt+.mt{margin-left:0}.card .lk{margin-top:auto;padding-top:12px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
@media(max-width:640px){.gr{grid-template-columns:1fr;padding:12px 20px 30px}.sus,.hero,.chips,.txt{padding-left:20px;padding-right:20px}.hero{grid-template-columns:1fr}.hero .art{display:none}}`;
  const card = (p: ProiectImpact) => `<article class="card nopb"><div class="top">${ecg("currentColor", 0.35)}<div class="ic">${ICON.inima}</div></div><h3>${esc(p.nume)}</h3><div class="s nr">${p.suma !== null ? lei(p.suma) : "—"}</div><div class="mm">${meta(p)}</div>${obs(p)}${p.link ? `<a class="lk" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">Vezi proiectul ${ICON.sageata}</a>` : ""}</article>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an nopb"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map(card).join("")}`).join("") : proiecteSortate(d).map(card).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="sus"><span class="nm">${logo(d) || esc(c.organizatie)}</span><span class="nm">${esc(perioadaImpact(d))}</span></div>
<section class="hero"><div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1></div><div class="art">${inima(96, "c1")}</div></section>
<div class="chips"><span>${ICON.moneda}${lei(total)}</span><span>${ICON.grup}${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect" : "proiecte"}</span>${perioadaImpact(d) ? `<span>${ICON.calendar}${esc(perioadaImpact(d))}</span>` : ""}</div>
<div class="txt">${paragrafe(d)}</div><div class="gr">${corp}</div>${nrProiecte(d) ? "" : `<div class="in">${goal}</div>`}<div class="in" style="padding-top:0">${semnatura(d, c)}</div></main>`);
}

// --- 6. Scrisoare de mulțumire -------------------------------------------------------------------------------------------------------

function scrisoare(d: DateImpact, c: ContextRaport): string {
  const css = `.foaie{max-width:760px}.banda{height:8px;background:linear-gradient(90deg,var(--a),var(--b))}.hartie{padding:44px 64px 56px;font-family:${SERIF};font-size:17px;line-height:1.75}
.ant{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:20px;border-bottom:1px solid var(--l);margin-bottom:34px;font-family:${SANS}}.ant strong{display:block;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--b)}.ant span{color:var(--m);font-size:13px}
.ant .dr{text-align:right}.hartie p{margin:0 0 14px}.hartie .lead{font-size:17px}
.lst{margin:22px 0 24px;padding:0;list-style:none;font-family:${SANS}}.lst li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:baseline;padding:8px 0;font-size:15px}.lst li:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--a);display:block;align-self:center}.lst .pct{border-bottom:1px dotted #b9b2b3;transform:translateY(-4px);min-width:16px}.lst .su{font-weight:700;color:var(--b)}.lst small{display:block;color:var(--m);font-size:12.5px}
.tot{background:var(--c);border-radius:12px;padding:16px 22px;font-family:${SANS};display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:8px 0 28px}.tot b{font-family:${SERIF};font-size:32px;color:var(--a)}
.semn b{font-size:30px}.puls{margin-top:22px;color:var(--a);width:200px;height:36px}@media(max-width:640px){.hartie{padding:28px 22px 36px;font-size:16px}}`;
  const li = proiecteSortate(d).map((p) => `<li><span>${nume(p)}${p.data || p.locatie ? `<small>${[p.locatie && esc(p.locatie), p.data && esc(lunaAn(p.data))].filter(Boolean).join(" · ")}</small>` : ""}</span><span class="pct"></span><span class="su nr">${p.suma !== null ? lei(p.suma) : ""}</span></li>`).join("");
  return doc(`Mulțumire — ${d.firma}`, d, css, `<main class="foaie"><div class="banda"></div><div class="hartie"><div class="ant"><div>${logo(d) || `<strong>${esc(c.organizatie)}</strong>`}</div><div class="dr"><span>${esc(dataLunga(c.azi))}</span></div></div>
<p>Stimată conducere ${esc(d.firma || "a companiei")},</p>${paragrafe(d)}${li ? `<ul class="lst">${li}</ul>` : ""}<div class="tot"><span>Total susținut</span><b class="nr">${lei(totalImpact(d))}</b></div><p>Cu recunoștință și respect,</p>${semnatura(d, c)}<div class="puls">${ecg("currentColor", 0.9)}</div></div></main>`);
}

// --- 7. Minimal ------------------------------------------------------------------------------------------------------------------------

function minimal(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.in{padding:56px 64px 60px}.sus{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--m)}
h1{font-size:46px;line-height:1.05;font-weight:300;letter-spacing:-.035em;margin:64px 0 6px}.sub{color:var(--m)}.t{font-size:96px;line-height:1;font-weight:200;color:var(--a);letter-spacing:-.05em;margin:44px 0 6px}.mic{color:var(--m);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase}
.txt{margin:46px 0 34px;max-width:560px;font-weight:300;font-size:16px}.txt .lead{font-size:17px}.r{display:grid;grid-template-columns:1fr auto;gap:20px;padding:18px 0;border-top:1px solid var(--l)}.r:last-child{border-bottom:1px solid var(--l)}.r b{font-weight:400;font-size:17px}.r .nr{font-weight:300;font-size:22px}
.an{margin:36px 0 6px;color:var(--a);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;display:flex;justify-content:space-between}.semn b{font-family:${SANS};font-style:normal;font-weight:300;font-size:22px;color:var(--t)}@media(max-width:640px){.in{padding:30px 22px}.t{font-size:58px}h1{font-size:32px;margin-top:40px}}`;
  const rand = (p: ProiectImpact) => `<div class="r nopb"><div><b>${nume(p)}</b><div style="margin-top:3px">${meta(p)}</div>${obs(p)}</div><span class="nr">${p.suma !== null ? lei(p.suma) : ""}</span></div>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="in"><div class="sus"><span>${logo(d) || esc(c.organizatie)}</span><span>${esc(perioadaImpact(d))}</span></div>
<h1>${esc(d.firma || "—")}</h1><div class="sub">Raport de impact</div><div class="t nr">${lei(total)}</div><div class="mic">${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect susținut" : "proiecte susținute"}</div>
<div class="txt">${paragrafe(d)}</div>${corp || goal}${semnatura(d, c)}</div></main>`);
}

// --- 8. Cronologic ---------------------------------------------------------------------------------------------------------------------

function cronologic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.hero{padding:34px 48px 6px;display:flex;justify-content:space-between;align-items:center;gap:16px}.hero h1{font-family:${SERIF};font-size:36px;line-height:1.1;color:var(--b);margin-top:8px;letter-spacing:-.02em}.txt{padding:12px 48px 0}
.tl{position:relative;margin:26px 48px 8px;padding-left:44px}.tl:before{content:"";position:absolute;left:13px;top:8px;bottom:8px;width:3px;border-radius:2px;background:linear-gradient(var(--a),var(--b))}
.an{position:relative;margin:26px 0 12px;font-family:${SERIF};font-size:26px;font-weight:700;color:var(--a);display:flex;justify-content:space-between;align-items:baseline}.an:before{content:"";position:absolute;left:-39px;top:9px;width:19px;height:19px;border-radius:50%;background:var(--a);box-shadow:0 0 0 5px var(--ab)}.an .nr{font-size:14px;color:var(--m);font-weight:600;font-family:${SANS}}
.e{position:relative;margin:0 0 16px}.e:before{content:"";position:absolute;left:-37px;top:20px;width:11px;height:11px;border-radius:50%;background:#fff;border:3px solid var(--a)}.e .k{border:1px solid var(--l);border-radius:14px;padding:14px 18px;background:#fff}.e .z{color:var(--a);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.14em}
.e h3{font-family:${SERIF};font-size:19px;line-height:1.3;margin:3px 0 2px}.e .s{font-family:${SERIF};font-weight:700;font-size:22px;color:var(--b);margin-top:4px}
.tot{margin:10px 48px 0;display:flex;justify-content:space-between;align-items:baseline;gap:12px;background:var(--c);border-radius:14px;padding:18px 24px}.tot b{font-family:${SERIF};font-size:34px;color:var(--a)}@media(max-width:640px){.hero,.txt{padding-left:20px;padding-right:20px}.tl{margin-left:20px;margin-right:20px}.tot{margin:10px 20px 0}}`;
  const ev = (p: ProiectImpact) => `<div class="e nopb"><div class="k"><div class="z">${esc(lunaAn(p.data) || (p.anDirectionare ? String(p.anDirectionare) : "Fără dată"))}</div><h3>${nume(p)}</h3>${p.locatie ? `<div>${meta({ ...p, data: "", anDirectionare: null })}</div>` : ""}${obs(p)}<div class="s nr">${p.suma !== null ? lei(p.suma) : ""}</div></div></div>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map(ev).join("")}`).join("") : proiecteSortate(d).map(ev).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="banda" style="height:10px;background:linear-gradient(90deg,var(--a),var(--b))"></div><section class="hero"><div><div class="ey">Drumul făcut împreună</div><h1>${esc(d.firma || "—")}</h1></div>${logo(d) || inima(78, "t1")}</section>
<div class="txt">${paragrafe(d)}</div><div class="tl">${corp || goal}</div><div class="tot"><span>Total susținut · ${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect" : "proiecte"}</span><b class="nr">${lei(total)}</b></div><div class="in" style="padding-top:0">${semnatura(d, c)}</div></main>`);
}

// --- 9. Infografic ---------------------------------------------------------------------------------------------------------------------

function infografic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const { svg, legenda } = inel(d);
  const css = `.hero{background:linear-gradient(135deg,var(--b),var(--a));color:#fff;padding:34px 48px 30px;position:relative;overflow:hidden}.hero .bg{position:absolute;left:0;right:0;bottom:0;height:70px;color:#fff;opacity:.9}.hero>*{position:relative}.hero .sus{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.9}.hero .logo{background:#fff;padding:6px 10px;border-radius:6px}
.hero h1{font-family:${SERIF};font-size:40px;line-height:1.08;letter-spacing:-.02em;margin:14px 0 40px;max-width:560px}.kp{display:grid;grid-template-columns:1.6fr 1fr 1.2fr;gap:14px;padding:0 48px;margin-top:-34px;position:relative}
.kp>div{background:#fff;border:1px solid var(--l);border-radius:16px;padding:18px 20px;box-shadow:0 10px 26px rgba(35,31,32,.1)}.kp .ic{width:38px;height:38px;border-radius:11px;background:var(--ab);color:var(--a);display:flex;align-items:center;justify-content:center;margin-bottom:10px}.kp small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--m);font-weight:700}.kp b{display:block;font-family:${SERIF};font-size:38px;line-height:1.1;letter-spacing:-.03em;color:var(--a)}.kp b.mic{font-size:19px;line-height:1.3;padding-top:8px;color:var(--b)}
.txt{padding:28px 48px 0}.mix{display:grid;grid-template-columns:auto minmax(0,1fr);gap:30px;align-items:center;padding:30px 48px 6px}.lg{display:grid;gap:9px}.lg div{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:10px;align-items:baseline;font-size:14px}.lg i{width:12px;height:12px;border-radius:4px;display:block;align-self:center}.lg b{font-variant-numeric:tabular-nums}
.sec{padding:8px 48px 6px}.sec h2{font-family:${SERIF};font-size:22px;margin:26px 0 4px}${CSS_FISA}
@media(max-width:640px){.hero{padding:26px 20px 24px}.hero h1{font-size:30px}.kp{grid-template-columns:1fr;padding:0 20px}.txt,.sec,.mix{padding-left:20px;padding-right:20px}.mix{grid-template-columns:1fr;justify-items:center}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><section class="hero"><div class="bg">${ecg("#fff", 0.35)}</div><div class="sus"><span>${logo(d) || esc(c.organizatie)}</span><span>${esc(perioadaImpact(d))}</span></div><h1>Impactul sprijinului ${esc(d.firma || "—")}</h1></section>
<div class="kp"><div><div class="ic">${ICON.moneda}</div><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div><div class="ic">${ICON.grup}</div><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div><div class="ic">${ICON.calendar}</div><small>Perioadă</small><b class="mic">${esc(perioadaImpact(d) || "—")}</b></div></div>
<div class="txt">${paragrafe(d)}</div>${svg ? `<section class="mix">${svg}<div class="lg">${legenda.map((l) => `<div><i style="background:${l.nuanta}"></i><span>${esc(l.nume)}</span><b>${l.procent}%</b></div>`).join("")}</div></section>` : ""}
<section class="sec"><h2>Proiectele, pe rând</h2>${listaFise(d, total)}${semnatura(d, c)}</section></main>`);
}

// --- 10. Corporate ---------------------------------------------------------------------------------------------------------------------

function corporate(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.ant{position:relative;background:var(--b);color:#fff;padding:32px 48px 28px;overflow:hidden}.ant .bg{position:absolute;inset:auto 0 0 0;height:60px;color:#fff}.ant>*{position:relative}.ant .rd{display:flex;justify-content:space-between;align-items:center;gap:16px}.ant small{font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;opacity:.85}.ant h1{font-size:30px;font-weight:600;margin-top:6px;letter-spacing:-.01em}.ant .logo{background:#fff;padding:6px 10px;border-radius:4px}
.ref{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:26px 48px 8px;border:1px solid var(--l);border-radius:10px;overflow:hidden}.ref div{padding:14px 18px;border-bottom:1px solid var(--l)}.ref div:nth-child(odd){border-right:1px solid var(--l)}.ref div:nth-last-child(-n+2){border-bottom:0}.ref span{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);font-weight:700}
.txt{padding:14px 48px 0}.tb{width:calc(100% - 96px);margin:22px 48px 0;border-collapse:collapse;font-size:14px}.tb th{background:var(--b);color:#fff;text-align:left;font-size:11.5px;letter-spacing:.08em;padding:10px 14px;font-weight:600}.tb th:first-child{border-radius:8px 0 0 0}.tb th:last-child{border-radius:0 8px 0 0}.tb td{padding:11px 14px;border-bottom:1px solid var(--l);vertical-align:top}.tb tbody tr:nth-child(even) td{background:#faf8f8}.tb tr.gr td{background:var(--ab)!important;font-weight:700;color:var(--b)}.tb .s{text-align:right;font-weight:700}.tb tfoot td{background:var(--c);font-weight:700;font-size:16px;border-bottom:0}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:30px 48px 38px}.sg div{border-top:1px solid var(--t);padding-top:8px;font-size:13px;color:var(--m)}.sg b{display:block;color:var(--t);font-size:14px}@media(max-width:640px){.ant,.txt{padding-left:20px;padding-right:20px}.ref{margin:20px;grid-template-columns:1fr}.ref div{border-right:0!important;border-bottom:1px solid var(--l)!important}.tb{width:calc(100% - 40px);margin:18px 20px 0}.sg{padding:24px 20px}}`;
  const rand = (p: ProiectImpact) => `<tr class="nopb"><td>${nume(p)}<div style="margin-top:3px">${meta(p)}</div>${obs(p)}</td><td>${esc(lunaAn(p.data) || "—")}</td><td class="s nr">${p.suma !== null ? lei(p.suma) : "—"}</td></tr>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<tr class="gr"><td colspan="2">${esc(g.an)}</td><td class="s nr">${lei(g.total)}</td></tr>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><header class="ant"><div class="bg">${ecg("#fff", 0.28)}</div><div class="rd"><div><small>${esc(c.organizatie)}</small><h1>Raport de impact</h1></div>${logo(d) || inima(52, "k1")}</div></header>
<div class="ref"><div><span>Către</span><strong>${esc(d.firma || "—")}</strong></div><div><span>Data</span>${esc(dataLunga(c.azi))}</div><div><span>Temei</span>${esc(fraza(d))}</div><div><span>Perioadă</span>${esc(perioadaImpact(d) || "—")}</div></div>
<div class="txt">${paragrafe(d)}</div><table class="tb"><thead><tr><th>Proiect</th><th>Alocare</th><th style="text-align:right">Sumă</th></tr></thead><tbody>${corp}</tbody><tfoot><tr><td colspan="2">Total</td><td class="s nr">${lei(total)}</td></tr></tfoot></table>${nrProiecte(d) ? "" : `<div class="in">${goal}</div>`}
<div class="sg"><div><b>${esc(d.autor || "Reprezentant")}</b>${esc(c.organizatie)}</div><div><b>Primit de</b>${esc(d.firma || "—")}</div></div></main>`);
}

// --- 11. O pagină ----------------------------------------------------------------------------------------------------------------------

function oPagina(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.foaie{max-width:900px}.g{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr)}.st{background:var(--b);color:#fff;padding:28px 26px;position:relative;overflow:hidden}.st>*{position:relative}.st .ey{color:#fff;opacity:.85}.st h1{font-family:${SERIF};font-size:27px;line-height:1.12;margin:8px 0 18px;letter-spacing:-.01em}
.st .k{border-top:1px solid rgba(255,255,255,.28);padding:11px 0}.st .k small{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;opacity:.8}.st .k b{font-family:${SERIF};font-size:30px;line-height:1.1;letter-spacing:-.02em}.st p{font-size:13px;line-height:1.55;opacity:.95;margin-top:10px}.st .logo{background:#fff;padding:5px 9px;border-radius:5px;max-height:38px}
.dr{padding:24px 28px}.dr .t{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--m);font-weight:700;border-bottom:2px solid var(--a);padding-bottom:6px;margin-bottom:4px}.r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:9px 0;border-bottom:1px solid var(--l);font-size:13px}.r b{font-size:13.5px}.r .nr{font-weight:700;color:var(--b);font-family:${SERIF};font-size:15px}.r .mm{font-size:11.5px}.r .mt{font-size:11.5px}
.dr .semn{margin-top:18px}.dr .semn b{font-size:19px}@media(max-width:700px){.g{grid-template-columns:1fr}}`;
  const r = proiecteSortate(d).map((p) => `<div class="r nopb"><div><b>${nume(p)}</b><div class="mm">${meta(p)}</div></div><span class="nr">${p.suma !== null ? lei(p.suma) : ""}</span></div>`).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="g"><aside class="st"><div style="position:absolute;inset:auto 0 0 0;height:60px;color:#fff;opacity:.9">${ecg("#fff", 0.25)}</div><div>${logo(d) || `<div class="ey">${esc(c.organizatie)}</div>`}</div><h1 style="margin-top:20px">${esc(d.firma || "—")}</h1><div class="ey" style="margin:-8px 0 14px">Raport de impact</div>
<div class="k"><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div class="k"><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div class="k"><small>Perioadă</small><b style="font-size:17px;line-height:1.3">${esc(perioadaImpact(d) || "—")}</b></div>${aplicaPlaceholdere(d.narativ, d).slice(0, 1).map((p) => `<p>${p}</p>`).join("")}</aside>
<section class="dr"><div class="t">Proiectele susținute</div>${r || goal}${semnatura(d, c)}</section></div></main>`);
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
