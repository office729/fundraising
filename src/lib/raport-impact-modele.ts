// Modelele vizuale ale raportului de impact. Fiecare model e o funcție care citește aceleași date și întoarce un document HTML complet
// (CSS inline, fără fonturi sau scripturi externe), ca să poată fi salvat, trimis pe email sau tipărit ca PDF.
// Pe ecran documentul stă ca o foaie pe un fundal neutru; la tipărire rămâne doar foaia. Logoul organizației și al firmei apar împreună (co-branding).
import {
  aplicaPlaceholdere,
  DISCLAIMER_IMPLICIT,
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

import { monograma, motivCurent, seteazaMotiv } from "./motiv";

export type ContextRaport = { organizatie: string; azi: string; identificare?: string }; // azi: YYYY-MM-DD; identificare: denumire, CIF și sediu, sub avertismentul de la final

const SANS = `"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
const SERIF = `Georgia,"Iowan Old Style","Times New Roman",serif`;
// Lista de fonturi fără ghilimele duble, pentru atribute HTML/SVG (cele duble ar închide atributul).
const SANS_ATR = SANS.replace(/"/g, "'");
const SERIF_SVG = SERIF.replace(/"/g, "'");
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
  media: icon(`<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>`, 22),
};

// Inima cu linia de puls care o străbate: gradient din culorile organizației, strălucire discretă, ECG alb peste.
function inima(marime: number, id = "g"): string {
  if (motivCurent() === "niciunul") return "";
  if (motivCurent() === "monograma") return monograma(marime, id);
  return `<svg viewBox="0 0 120 112" width="${marime}" height="${Math.round((marime * 112) / 120)}" role="img" aria-label="Inimă străbătută de o linie de puls"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a)"/><stop offset="1" stop-color="var(--b)"/></linearGradient><radialGradient id="${id}s" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<path d="M60 104 14 58C-2 42 2 16 24 8c14-5 29 1 36 14 7-13 22-19 36-14 22 8 26 34 10 50z" fill="url(#${id})"/><path d="M60 104 14 58C-2 42 2 16 24 8c14-5 29 1 36 14 7-13 22-19 36-14 22 8 26 34 10 50z" fill="url(#${id}s)"/>
<path d="M6 54h30l8-16 12 36 10-28 7 8h41" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Bandă de ECG pentru fundaluri: o linie de bază cu bătăi regulate, pe toată lățimea.
function ecg(culoare = "currentColor", opacitate = 0.22): string {
  if (motivCurent() !== "inima") return "";
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
  return { svg: `<svg viewBox="0 0 140 140" width="${marime}" height="${marime}" role="img" aria-label="Ponderea proiectelor în total"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--l)" stroke-width="17"/>${arce.join("")}<text x="70" y="68" text-anchor="middle" font-family="${SERIF_SVG}" font-size="17" font-weight="700" fill="var(--t)">${esc(String(ps.length))}</text><text x="70" y="84" text-anchor="middle" font-size="8.5" fill="var(--m)" letter-spacing=".08em">${ps.length === 1 ? "PROIECT" : "PROIECTE"}</text></svg>`, legenda };
}

const legendaInel = (l: ReturnType<typeof inel>["legenda"]) => `<div class="lg">${l.map((x) => `<div><i style="background:${x.nuanta}"></i><span>${esc(x.nume)}</span><b>${x.procent}%</b></div>`).join("")}</div>`;
const CSS_LEGENDA = `.lg{display:grid;gap:9px}.lg div{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:10px;align-items:baseline;font-size:14px}.lg i{width:12px;height:12px;border-radius:4px;display:block;align-self:center}.lg b{font-variant-numeric:tabular-nums}`;

// Evoluția cumulată în timp: linie cu arie și puncte, pe proiectele care au dată.
function cumulativ(d: DateImpact): string {
  const pts = proiecteSortate(d).filter((p) => p.data && (p.suma ?? 0) > 0);
  if (pts.length < 2) return "";
  let cum = 0;
  const serie = pts.map((p) => ({ t: Date.parse(`${p.data}T12:00:00Z`), v: (cum += p.suma ?? 0), e: lunaScurta(p.data) + " " + p.data.slice(2, 4) }));
  const W = 560, H = 220, L = 46, R = 22, T = 18, B = 34;
  const t0 = serie[0].t, t1 = serie[serie.length - 1].t;
  const x = (i: number) => (t1 === t0 ? L + ((W - L - R) * i) / (serie.length - 1) : L + ((W - L - R) * (serie[i].t - t0)) / (t1 - t0));
  const maxim = serie[serie.length - 1].v;
  const pas = maxim <= 5000 ? 1000 : maxim <= 20000 ? 5000 : maxim <= 60000 ? 10000 : maxim <= 150000 ? 25000 : 50000;
  const sus = Math.ceil(maxim / pas) * pas;
  const y = (v: number) => T + (H - T - B) * (1 - v / sus);
  const grila: string[] = [];
  for (let v = 0; v <= sus; v += pas) grila.push(`<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--l)" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10.5" fill="var(--m)">${v >= 1000 ? `${v / 1000}k` : v}</text>`);
  const linie = serie.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(s.v).toFixed(1)}`).join(" ");
  const arie = `${linie} L${x(serie.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const puncte = serie.map((s, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(s.v).toFixed(1)}" r="4.5" fill="#fff" stroke="var(--a)" stroke-width="2.5"/>`).join("");
  const et = serie.map((s, i) => (i === 0 || i === serie.length - 1 || serie.length <= 6 ? `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="10.5" fill="var(--m)">${esc(s.e)}</text>` : "")).join("");
  const final = `<text x="${(x(serie.length - 1) - 6).toFixed(1)}" y="${(y(maxim) - 12).toFixed(1)}" text-anchor="end" font-size="12.5" font-weight="700" fill="var(--b)">${esc(lei(maxim))}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evoluția cumulată a sumelor în timp"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a)" stop-opacity=".28"/><stop offset="1" stop-color="var(--a)" stop-opacity="0"/></linearGradient></defs>${grila.join("")}<path d="${arie}" fill="url(#ar)"/><path d="${linie}" fill="none" stroke="var(--a)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${puncte}${et}${final}</svg>`;
}

// Bare verticale pe ani (sau pe proiecte, dacă e un singur an).
function bare(d: DateImpact): string {
  const date = d.gruparePeAn || grupePeAn(d).length > 1 ? grupePeAn(d).map((g) => ({ e: g.an, v: g.total })) : proiecteSortate(d).map((p) => ({ e: p.nume.length > 14 ? `${p.nume.slice(0, 13)}…` : p.nume, v: p.suma ?? 0 }));
  if (date.length < 2) return "";
  const W = 560, H = 220, L = 12, T = 26, B = 36;
  const maxim = Math.max(1, ...date.map((x) => x.v));
  const lat = (W - L * 2) / date.length;
  const b = Math.min(64, lat * 0.62);
  const bari = date.map((x, i) => {
    const h = ((H - T - B) * x.v) / maxim;
    const cx = L + lat * i + lat / 2;
    return `<rect x="${(cx - b / 2).toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}" rx="7" fill="${i % 2 ? "var(--b)" : "var(--a)"}"/><text x="${cx.toFixed(1)}" y="${(H - B - h - 8).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--t)">${esc(lei(x.v))}</text><text x="${cx.toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="11" fill="var(--m)">${esc(x.e)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Sume comparate">${bari.join("")}<line x1="${L}" x2="${W - L}" y1="${H - B}" y2="${H - B}" stroke="var(--l)"/></svg>`;
}

// --- Schelet comun ---------------------------------------------------------------------------------------------------------------------

function doc(titlu: string, d: DateImpact, css: string, corp: string, pagina = "A4"): string {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titlu)}</title><style>
:root{--a:${d.accent};--b:${d.accent2};--c:${d.accent3};--t:#231f20;--m:#6a6466;--l:#e9e4e4;--fond:#ece9e9;--ab:color-mix(in srgb,var(--a) 9%,#fff)}
*{box-sizing:border-box}html{background:var(--fond);-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;color:var(--t);font-family:${SANS};font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--a);text-decoration-thickness:1px;text-underline-offset:2px}h1,h2,h3,p{margin:0}
.foaie{max-width:860px;margin:28px auto;background:#fff;box-shadow:0 1px 2px rgba(35,31,32,.08),0 22px 60px rgba(35,31,32,.14);overflow:hidden}
.in{padding:36px 48px}.nr{font-variant-numeric:tabular-nums;white-space:nowrap}.nopb{break-inside:avoid;page-break-inside:avoid}
.cb{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.cx{opacity:.45;font-size:20px;line-height:1}.onm{font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}
.lgo img{display:block;height:42px;width:auto;max-width:180px;object-fit:contain}.lgo.ch{background:#fff;border-radius:9px;padding:6px 11px}
.mt{display:inline-flex;align-items:center;gap:5px;color:var(--m);font-size:12.5px}.mt svg{color:var(--a);flex:none}.mt+.mt{margin-left:14px}
.ey{font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--a)}.lead{font-size:18px;line-height:1.55;color:var(--t)}
.semn{margin-top:30px}.semn b{font-family:${SERIF};font-style:italic;font-size:24px;font-weight:400;color:var(--b);display:block;line-height:1.2}.semn span{color:var(--m);font-size:13px}
.cit-f{margin:26px 0 0;padding:16px 20px;border-left:4px solid var(--a);background:var(--ab);font-family:${SERIF};font-style:italic;font-size:1.05em;break-inside:avoid}.cit-f cite{display:block;margin-top:6px;font-style:normal;font-size:12.5px;color:var(--m)}
.cu{margin-top:24px;break-inside:avoid}.cu b{display:block;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--a);margin-bottom:4px}.cta{margin-top:12px}.cta a,.cta strong{display:inline-block;padding:10px 18px;border-radius:10px;background:var(--a);color:#fff;text-decoration:none;font-weight:700}
.ctc{margin-top:16px;font-size:13px;color:var(--m)}.ctc a{color:var(--m)}.disc{margin-top:18px;padding-top:10px;border-top:1px solid var(--l);font-size:11.5px;color:var(--m);line-height:1.5}
.stare{display:inline-block;padding:1px 9px;border-radius:99px;font-size:11.5px;font-weight:700;line-height:1.6;border:1px solid var(--a);color:var(--a)}.stare.finalizat{background:var(--a);color:#fff}.stare.partial{border-style:dashed}
@media(max-width:640px){.foaie{margin:0;box-shadow:none}.in{padding:24px 20px}}
@page{size:${pagina};margin:0}@media print{html{background:#fff}.foaie{margin:0;box-shadow:none;max-width:none}body{font-size:14px}}
${css}</style></head><body>${corp}</body></html>`;
}

const nume = (p: ProiectImpact) => (p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.nume)}</a>` : esc(p.nume));
// Logoul organizației și al firmei, unul lângă altul. Pe fundal închis apar în plăcuțe albe; fără logo, organizația apare cu numele.
function cobrand(d: DateImpact, c: ContextRaport, inchis = false): string {
  const img = (src: string, alt: string) => `<span class="lgo${inchis ? " ch" : ""}"><img src="${esc(src)}" alt="${esc(alt)}"></span>`;
  const o = d.logoOng ? img(d.logoOng, c.organizatie) : `<span class="onm">${esc(c.organizatie)}</span>`;
  const f = d.logoFirma ? `<span class="cx" aria-hidden="true">×</span>${img(d.logoFirma, d.firma)}` : "";
  return `<div class="cb">${o}${f}</div>`;
}
const paragrafe = (d: DateImpact, cuLead = true) => aplicaPlaceholdere(d.narativ, d).map((p, i) => `<p${cuLead && i === 0 ? ' class="lead"' : ""} style="margin-top:${i ? 12 : 0}px">${p}</p>`).join("");
const semnaturaSimpla = (d: DateImpact, c: ContextRaport) => `<div class="semn"><b>${esc(d.autor || c.organizatie)}</b><span>${d.autor ? `${esc(c.organizatie)} · ` : ""}${esc(dataLunga(c.azi))}</span></div>`;
// Încheierea raportului, comună tuturor modelelor: citat, ce urmează, apel la acțiune, contact, transparență și avertismentul că nu e document fiscal.
function blocFinal(d: DateImpact, simplu = false): string {
  const contact = [d.contactNume && esc(d.contactNume), d.contactTelefon && esc(d.contactTelefon), d.contactEmail && `<a href="mailto:${esc(d.contactEmail)}">${esc(d.contactEmail)}</a>`].filter(Boolean).join(" · ");
  const cta = d.ctaText ? (d.ctaLink ? `<p class="cta"><a href="${esc(d.ctaLink)}" target="_blank" rel="noopener noreferrer">${esc(d.ctaText)} →</a></p>` : `<p class="cta"><strong>${esc(d.ctaText)}</strong></p>`) : "";
  const transp = d.transparentaLink ? `<a href="${esc(d.transparentaLink)}" target="_blank" rel="noopener noreferrer">Raportul anual și situațiile financiare</a>` : "";
  if (simplu) return `<p class="disc">${esc(DISCLAIMER_IMPLICIT)}</p>`;
  const sumaProiecte = d.proiecte.reduce((t, p) => t + (p.suma ?? 0), 0);
  const diferenta = d.totalManual !== null && d.totalManual > sumaProiecte ? `<p class="disc" style="border-top:0;margin-top:14px;padding-top:0">Din totalul de ${esc(lei(d.totalManual))}, ${esc(lei(d.totalManual - sumaProiecte))} nu sunt încă detaliați pe proiecte în lista de mai sus.</p>` : "";
  const comparatie = d.totalAnterior && d.totalAnterior > 0 ? `<p class="disc" style="border-top:0;margin-top:14px;padding-top:0">Anul anterior: ${esc(lei(d.totalAnterior))}. ${(() => { const t = d.totalManual ?? sumaProiecte; const dif = Math.round(((t - d.totalAnterior) / d.totalAnterior) * 100); return dif === 0 ? "Nivel egal cu anul anterior." : `${dif > 0 ? "Creștere" : "Scădere"} de ${Math.abs(dif)}% față de anul anterior.`; })()}</p>` : "";
  return `${diferenta}${comparatie}${d.citat ? `<blockquote class="cit-f">„${esc(d.citat)}”${d.citatAutor ? `<cite>— ${esc(d.citatAutor)}</cite>` : ""}</blockquote>` : ""}${d.ceUrmeaza ? `<div class="cu"><b>Ce urmează</b><p>${esc(d.ceUrmeaza).replace(/\n/g, "<br>")}</p></div>` : ""}${d.optiuniViitor.trim() ? `<div class="cu"><b>Variante pentru anul următor</b><ul style="margin:6px 0 0;padding-left:20px">${d.optiuniViitor.split(/\n/).map((r) => r.trim()).filter(Boolean).map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}${cta}${contact || transp ? `<p class="ctc">${[contact && `Contact: ${contact}`, transp].filter(Boolean).join(" · ")}</p>` : ""}`;
}
const disclaimer = `<p class="disc">${esc(DISCLAIMER_IMPLICIT)}</p>`;
const semnatura = (d: DateImpact, c: ContextRaport) => `${blocFinal(d)}${semnaturaSimpla(d, c)}${disclaimer}`;
const ETICHETE_MECANISM: Record<string, string> = { d177: "Declarația 177", sponsorizare: "Sponsorizare", donatie: "Donație" };
const ETICHETE_STARE: Record<string, string> = { finalizat: "Finalizat", in_desfasurare: "În desfășurare", partial: "Parțial finanțat" };
const meta = (p: ProiectImpact) => [p.stare && `<span class="mt"><span class="stare ${p.stare}">${ETICHETE_STARE[p.stare]}</span></span>`, p.locatie && `<span class="mt">${ICON.pin}${esc(p.locatie)}</span>`, p.data && `<span class="mt">${ICON.cal}${esc(lunaAn(p.data))}</span>`, p.anDirectionare && `<span class="mt">${ICON.inima}Direcționare ${p.anDirectionare}</span>`, p.nrBeneficiari && `<span class="mt">${p.nrBeneficiari} ${p.nrBeneficiari === 1 ? "beneficiar" : "beneficiari"}</span>`, p.mecanism && `<span class="mt">${ETICHETE_MECANISM[p.mecanism]}</span>`, p.referintaContract && `<span class="mt">${esc(p.referintaContract)}</span>`, p.linkDovada && `<span class="mt"><a href="${esc(p.linkDovada)}" target="_blank" rel="noopener noreferrer">Dovadă</a></span>`].filter(Boolean).join("");
const obs = (p: ProiectImpact) => (p.observatii ? `<p style="color:var(--m);font-size:13.5px;margin-top:6px">${esc(p.observatii)}</p>` : "");
const goal = `<p style="color:var(--m);padding:18px 0">Nu sunt proiecte adăugate încă.</p>`;
const nrProiecte = (d: DateImpact) => proiecteSortate(d).filter((p) => !p.nealocat).length;
const textProiecte = (d: DateImpact) => `${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect" : "proiecte"}`;
const parte = (p: ProiectImpact, total: number) => (total > 0 && p.suma ? Math.max(2, Math.round((p.suma / total) * 100)) : 0);
const procentTxt = (p: ProiectImpact, total: number) => (total > 0 && p.suma ? `${Math.round((p.suma / total) * 100)}% din total` : "");
const mecanismScurt = (d: DateImpact) => (d.mecanism === "d177" ? "Declarația 177" : d.mecanism === "sponsorizare" ? "Sponsorizare" : "Sprijin");

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

// --- 1. Clasic ------------------------------------------------------------------------------------------------------------------------

function clasic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.banda{height:10px;background:linear-gradient(90deg,var(--a),var(--b))}.cap{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:22px 48px 0;color:var(--m);font-size:12.5px;letter-spacing:.06em;text-transform:uppercase}
.hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;padding:30px 48px 26px}.hero h1{font-family:${SERIF};font-size:44px;line-height:1.08;letter-spacing:-.02em;color:var(--b);margin-top:10px}.hero p.sub{margin-top:10px;color:var(--m);font-size:16px}
.tot{position:relative;margin:6px 48px 0;border-radius:16px;background:var(--c);padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;overflow:hidden;color:var(--a)}.tot .bg{position:absolute;inset:0}.tot>div{position:relative}
.tot small{display:block;color:var(--m);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}.tot b{font-family:${SERIF};font-size:58px;line-height:1.05;color:var(--a);letter-spacing:-.03em}.tot .r{text-align:right;color:var(--t);font-size:14px}.tot .r strong{display:block;font-family:${SERIF};font-size:30px;color:var(--b)}
.in h2{font-family:${SERIF};font-size:22px;margin:34px 0 4px}${CSS_FISA}
.pic{margin-top:34px;background:var(--b);color:#fff;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:13px}.pic b{font-family:${SERIF};font-size:18px;font-weight:400;font-style:italic}
@media(max-width:640px){.hero{grid-template-columns:1fr;padding:26px 20px 18px}.hero h1{font-size:32px}.hero .art{display:none}.cap,.pic{padding-left:20px;padding-right:20px}.tot{margin:6px 20px 0;padding:20px}.tot b{font-size:42px}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="banda"></div>
<div class="cap">${cobrand(d, c)}<span>${esc(perioadaImpact(d))}</span></div>
<section class="hero"><div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1><p class="sub">Ce a făcut sprijinul dumneavoastră</p></div><div class="art">${inima(150, "h1")}</div></section>
<section class="tot"><div class="bg">${ecg("currentColor", 0.11)}</div><div><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div class="r"><strong>${textProiecte(d)}</strong>${mecanismScurt(d)}</div></section>
<div class="in">${paragrafe(d)}<h2>Proiectele susținute</h2>${listaFise(d, total)}${semnatura(d, c)}</div>
<footer class="pic"><span>${esc(c.organizatie)}</span><b>Vă mulțumim că sunteți alături de noi</b></footer></main>`);
}

// --- 2. Executiv ----------------------------------------------------------------------------------------------------------------------

function executiv(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const maxim = Math.max(1, ...proiecteSortate(d).map((p) => p.suma ?? 0));
  const rand = (p: ProiectImpact) => `<tr class="nopb"><td><div class="n">${nume(p)}</div><div>${meta(p)}</div>${obs(p)}</td><td class="b"><div><i style="width:${Math.max(3, Math.round(((p.suma ?? 0) / maxim) * 100))}%"></i></div></td><td class="nr s">${p.suma !== null ? lei(p.suma) : "—"}</td></tr>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<tr class="gr"><td colspan="2">${esc(g.an)}</td><td class="nr s">${lei(g.total)}</td></tr>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  const css = `.cap{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:24px 48px 18px;border-bottom:1px solid var(--t)}.cap span{color:var(--m);font-size:12.5px}
.titlu{padding:30px 48px 10px}.titlu h1{font-size:34px;line-height:1.12;letter-spacing:-.025em;font-weight:700}
.cols{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:34px;padding:10px 48px 40px}.side{border-left:1px solid var(--l);padding-left:26px}.side dl{margin:0}.side dt{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);font-weight:700;margin-top:18px}.side dt:first-child{margin-top:0}.side dd{margin:3px 0 0;font-size:15px}.side dd.k{font-size:34px;font-weight:700;letter-spacing:-.03em;line-height:1.1;color:var(--a)}
.tb{width:100%;border-collapse:collapse;margin-top:22px}.tb th{text-align:left;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);padding:0 0 8px;border-bottom:1px solid var(--t)}.tb td{padding:12px 0;border-bottom:1px solid var(--l);vertical-align:top}.tb .n{font-weight:600}.tb .b{width:22%;padding:18px 12px 0}.tb .b div{height:6px;background:var(--l);border-radius:9px;overflow:hidden}.tb .b i{display:block;height:100%;background:var(--a);border-radius:9px}.tb .s{text-align:right;font-weight:700}.tb tr.gr td{background:var(--ab);font-weight:700;color:var(--b);padding:8px 10px}.tb tfoot td{border-top:2px solid var(--t);border-bottom:0;font-weight:700;font-size:16px}
@media(max-width:700px){.cols{grid-template-columns:1fr;padding:10px 20px 30px}.side{border:0;padding:0}.cap,.titlu{padding-left:20px;padding-right:20px}.tb .b{display:none}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="cap">${cobrand(d, c)}<span>${esc(dataLunga(c.azi))}</span></div>
<section class="titlu"><div class="ey">Raport de impact</div><h1 style="margin-top:8px">${esc(d.firma || "—")}</h1></section>
<div class="cols"><div>${paragrafe(d)}<table class="tb"><thead><tr><th>Proiect</th><th></th><th style="text-align:right">Sumă</th></tr></thead><tbody>${corp}</tbody><tfoot><tr><td colspan="2">Total</td><td class="nr s">${lei(total)}</td></tr></tfoot></table>${nrProiecte(d) ? "" : goal}${semnatura(d, c)}</div>
<aside class="side"><dl><dt>Total susținut</dt><dd class="k nr">${lei(total)}</dd><dt>Proiecte</dt><dd>${nrProiecte(d)}</dd><dt>Perioadă</dt><dd>${esc(perioadaImpact(d) || "—")}</dd><dt>Temei</dt><dd style="font-size:13px">${esc(fraza(d))}</dd></dl></aside></div></main>`);
}

// --- 3. Editorial ---------------------------------------------------------------------------------------------------------------------

function editorial(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.cop{position:relative;min-height:880px;background:linear-gradient(155deg,var(--b) 0%,var(--a) 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:44px 52px;overflow:hidden;break-after:page;page-break-after:always}
.cop .fund{position:absolute;right:-90px;bottom:-60px;opacity:.14}.cop .bandaE{position:absolute;left:0;right:0;top:68%;height:80px;color:#fff}.cop>*{position:relative}.cop .sus{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:12px;letter-spacing:.18em;text-transform:uppercase}
.cop h1{font-family:${SERIF};font-size:70px;line-height:.98;letter-spacing:-.03em;margin:14px 0 0;max-width:640px}.cop .ey{color:#fff;opacity:.85}.cop .jos{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}
.cop .jos b{font-family:${SERIF};font-size:54px;line-height:1;display:block;letter-spacing:-.03em}.cop .jos small{font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.85}
.poveste{padding:50px 56px 20px;font-family:${SERIF}}.poveste p{font-size:17.5px;line-height:1.75}.poveste p:first-child::first-letter{float:left;font-size:78px;line-height:.8;padding:8px 12px 0 0;color:var(--a);font-weight:700}
.citat{margin:30px 56px;padding:22px 0;border-top:3px solid var(--a);border-bottom:1px solid var(--l);display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}.citat b{font-family:${SERIF};font-size:46px;color:var(--a);letter-spacing:-.02em}.citat span{color:var(--m);font-size:14px}
.lista{padding:6px 56px 40px}.lista h2{font-family:${SERIF};font-size:26px;margin-bottom:6px}.lista .fisa{grid-template-columns:minmax(0,1fr) auto}.lista .dt{display:none}${CSS_FISA}
@media(max-width:640px){.cop{padding:28px 22px;min-height:620px}.cop h1{font-size:42px}.cop .jos b{font-size:38px}.poveste,.lista{padding-left:22px;padding-right:22px}.citat{margin:24px 22px}}@media print{.cop{min-height:277mm}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><section class="cop"><div class="fund">${inima(520, "e1")}</div><div class="bandaE">${ecg("#fff", 0.38)}</div>
<div class="sus">${cobrand(d, c, true)}<span>${esc(perioadaImpact(d))}</span></div>
<div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1></div>
<div class="jos"><div><small>Împreună am susținut ${textProiecte(d)}</small><b class="nr">${lei(total)}</b></div><div style="text-align:right"><small>${esc(c.organizatie)}</small></div></div></section>
<section class="poveste">${paragrafe(d, false)}</section>
<div class="citat"><b class="nr">${lei(total)}</b><span>${textProiecte(d)} · ${mecanismScurt(d).toLowerCase()}</span></div>
<section class="lista"><h2>Ce am făcut cu ele</h2>${listaFise(d, total)}${semnatura(d, c)}</section></main>`);
}

// --- 4. Carduri -----------------------------------------------------------------------------------------------------------------------

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
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="sus">${cobrand(d, c)}<span class="nm">${esc(perioadaImpact(d))}</span></div>
<section class="hero"><div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1></div><div class="art">${inima(96, "c1")}</div></section>
<div class="chips"><span>${ICON.moneda}${lei(total)}</span><span>${ICON.grup}${textProiecte(d)}</span>${perioadaImpact(d) ? `<span>${ICON.calendar}${esc(perioadaImpact(d))}</span>` : ""}</div>
<div class="txt">${paragrafe(d)}</div><div class="gr">${corp}</div>${nrProiecte(d) ? "" : `<div class="in">${goal}</div>`}<div class="in" style="padding-top:0">${semnatura(d, c)}</div></main>`);
}

// --- 5. Scrisoare de mulțumire --------------------------------------------------------------------------------------------------------

function minimal(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.in{padding:56px 64px 60px}.sus{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--m)}
h1{font-size:46px;line-height:1.05;font-weight:400;letter-spacing:-.035em;margin:64px 0 6px}.sub{color:var(--m)}.t{font-size:96px;line-height:1;font-weight:200;color:var(--a);letter-spacing:-.05em;margin:44px 0 6px}.mic{color:var(--m);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase}
.txt{margin:46px 0 34px;max-width:560px;font-weight:400;font-size:16px}.txt .lead{font-size:17px}.r{display:grid;grid-template-columns:1fr auto;gap:20px;padding:18px 0;border-top:1px solid var(--l)}.r:last-child{border-bottom:1px solid var(--l)}.r b{font-weight:400;font-size:17px}.r .nr{font-weight:400;font-size:22px}
.an{margin:36px 0 6px;color:var(--a);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;display:flex;justify-content:space-between}.semn b{font-family:${SANS};font-style:normal;font-weight:300;font-size:22px;color:var(--t)}@media(max-width:640px){.in{padding:30px 22px}.t{font-size:58px}h1{font-size:32px;margin-top:40px}}`;
  const rand = (p: ProiectImpact) => `<div class="r nopb"><div><b>${nume(p)}</b><div style="margin-top:3px">${meta(p)}</div>${obs(p)}</div><span class="nr">${p.suma !== null ? lei(p.suma) : ""}</span></div>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="in"><div class="sus">${cobrand(d, c)}<span>${esc(perioadaImpact(d))}</span></div>
<h1>${esc(d.firma || "—")}</h1><div class="sub">Raport de impact</div><div class="t nr">${lei(total)}</div><div class="mic">${nrProiecte(d)} ${nrProiecte(d) === 1 ? "proiect susținut" : "proiecte susținute"}</div>
<div class="txt">${paragrafe(d)}</div>${corp || goal}${semnatura(d, c)}</div></main>`);
}

// --- 7. Cronologic --------------------------------------------------------------------------------------------------------------------

function cronologic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.cap{padding:22px 48px 0}.hero{padding:22px 48px 6px;display:flex;justify-content:space-between;align-items:center;gap:16px}.hero h1{font-family:${SERIF};font-size:36px;line-height:1.1;color:var(--b);margin-top:8px;letter-spacing:-.02em}.txt{padding:12px 48px 0}
.tl{position:relative;margin:26px 48px 8px;padding-left:44px}.tl:before{content:"";position:absolute;left:13px;top:8px;bottom:8px;width:3px;border-radius:2px;background:linear-gradient(var(--a),var(--b))}
.an{position:relative;margin:26px 0 12px;font-family:${SERIF};font-size:26px;font-weight:700;color:var(--a);display:flex;justify-content:space-between;align-items:baseline}.an:before{content:"";position:absolute;left:-39px;top:9px;width:19px;height:19px;border-radius:50%;background:var(--a);box-shadow:0 0 0 5px var(--ab)}.an .nr{font-size:14px;color:var(--m);font-weight:600;font-family:${SANS}}
.e{position:relative;margin:0 0 16px}.e:before{content:"";position:absolute;left:-37px;top:20px;width:11px;height:11px;border-radius:50%;background:#fff;border:3px solid var(--a)}.e .k{border:1px solid var(--l);border-radius:14px;padding:14px 18px;background:#fff}.e .z{color:var(--a);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.14em}
.e h3{font-family:${SERIF};font-size:19px;line-height:1.3;margin:3px 0 2px}.e .s{font-family:${SERIF};font-weight:700;font-size:22px;color:var(--b);margin-top:4px}
.tot{margin:10px 48px 0;display:flex;justify-content:space-between;align-items:baseline;gap:12px;background:var(--c);border-radius:14px;padding:18px 24px}.tot b{font-family:${SERIF};font-size:34px;color:var(--a)}@media(max-width:640px){.cap,.hero,.txt{padding-left:20px;padding-right:20px}.tl{margin-left:20px;margin-right:20px}.tot{margin:10px 20px 0}}`;
  const ev = (p: ProiectImpact) => `<div class="e nopb"><div class="k"><div class="z">${esc(lunaAn(p.data) || (p.anDirectionare ? String(p.anDirectionare) : "Fără dată"))}</div><h3>${nume(p)}</h3>${p.locatie ? `<div>${meta({ ...p, data: "", anDirectionare: null })}</div>` : ""}${obs(p)}<div class="s nr">${p.suma !== null ? lei(p.suma) : ""}</div></div></div>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<div class="an"><span>${esc(g.an)}</span><span class="nr">${lei(g.total)}</span></div>${g.proiecte.map(ev).join("")}`).join("") : proiecteSortate(d).map(ev).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div style="height:10px;background:linear-gradient(90deg,var(--a),var(--b))"></div><div class="cap">${cobrand(d, c)}</div><section class="hero"><div><div class="ey">Drumul făcut împreună</div><h1>${esc(d.firma || "—")}</h1></div>${inima(78, "t1")}</section>
<div class="txt">${paragrafe(d)}</div><div class="tl">${corp || goal}</div><div class="tot"><span>Total susținut · ${textProiecte(d)}</span><b class="nr">${lei(total)}</b></div><div class="in" style="padding-top:0">${semnatura(d, c)}</div></main>`);
}

// --- 8. Infografic --------------------------------------------------------------------------------------------------------------------

function infografic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const { svg, legenda } = inel(d);
  const css = `.hero{background:linear-gradient(135deg,var(--b),var(--a));color:#fff;padding:30px 48px 30px;position:relative;overflow:hidden}.hero .bg{position:absolute;left:0;right:0;bottom:0;height:70px;color:#fff}.hero>*{position:relative}.hero .sus{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:12px;letter-spacing:.18em;text-transform:uppercase}
.hero h1{font-family:${SERIF};font-size:40px;line-height:1.08;letter-spacing:-.02em;margin:18px 0 40px;max-width:560px}.kp{display:grid;grid-template-columns:1.6fr 1fr 1.2fr;gap:14px;padding:0 48px;margin-top:-34px;position:relative}
.kp>div{background:#fff;border:1px solid var(--l);border-radius:16px;padding:18px 20px;box-shadow:0 10px 26px rgba(35,31,32,.1)}.kp .ic{width:38px;height:38px;border-radius:11px;background:var(--ab);color:var(--a);display:flex;align-items:center;justify-content:center;margin-bottom:10px}.kp small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--m);font-weight:700}.kp b{display:block;font-family:${SERIF};font-size:38px;line-height:1.1;letter-spacing:-.03em;color:var(--a)}.kp b.mic{font-size:19px;line-height:1.3;padding-top:8px;color:var(--b)}
.txt{padding:28px 48px 0}.mix{display:grid;grid-template-columns:auto minmax(0,1fr);gap:30px;align-items:center;padding:30px 48px 6px}${CSS_LEGENDA}
.sec{padding:8px 48px 6px}.sec h2{font-family:${SERIF};font-size:22px;margin:26px 0 4px}${CSS_FISA}
@media(max-width:640px){.hero{padding:26px 20px 24px}.hero h1{font-size:30px}.kp{grid-template-columns:1fr;padding:0 20px}.txt,.sec,.mix{padding-left:20px;padding-right:20px}.mix{grid-template-columns:1fr;justify-items:center}}`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><section class="hero"><div class="bg">${ecg("#fff", 0.35)}</div><div class="sus">${cobrand(d, c, true)}<span>${esc(perioadaImpact(d))}</span></div><h1>Impactul sprijinului ${esc(d.firma || "—")}</h1></section>
<div class="kp"><div><div class="ic">${ICON.moneda}</div><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div><div class="ic">${ICON.grup}</div><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div><div class="ic">${ICON.calendar}</div><small>Perioadă</small><b class="mic">${esc(perioadaImpact(d) || "—")}</b></div></div>
<div class="txt">${paragrafe(d)}</div>${svg ? `<section class="mix">${svg}${legendaInel(legenda)}</section>` : ""}
<section class="sec"><h2>Proiectele, pe rând</h2>${listaFise(d, total)}${semnatura(d, c)}</section></main>`);
}

// --- 9. Corporate ---------------------------------------------------------------------------------------------------------------------

function corporate(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.ant{position:relative;background:var(--b);color:#fff;padding:28px 48px 30px;overflow:hidden}.ant .bg{position:absolute;inset:auto 0 0 0;height:60px;color:#fff}.ant>*{position:relative}.ant .rd{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.ant h1{font-size:30px;font-weight:600;margin-top:18px;letter-spacing:-.01em}
.ref{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:26px 48px 8px;border:1px solid var(--l);border-radius:10px;overflow:hidden}.ref div{padding:14px 18px;border-bottom:1px solid var(--l)}.ref div:nth-child(odd){border-right:1px solid var(--l)}.ref div:nth-last-child(-n+2){border-bottom:0}.ref span{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);font-weight:700}
.txt{padding:14px 48px 0}.tb{width:calc(100% - 96px);margin:22px 48px 0;border-collapse:collapse;font-size:14px}.tb th{background:var(--b);color:#fff;text-align:left;font-size:11.5px;letter-spacing:.08em;padding:10px 14px;font-weight:600}.tb th:first-child{border-radius:8px 0 0 0}.tb th:last-child{border-radius:0 8px 0 0}.tb td{padding:11px 14px;border-bottom:1px solid var(--l);vertical-align:top}.tb tbody tr:nth-child(even) td{background:#faf8f8}.tb tr.gr td{background:var(--ab)!important;font-weight:700;color:var(--b)}.tb .s{text-align:right;font-weight:700}.tb tfoot td{background:var(--c);font-weight:700;font-size:16px;border-bottom:0}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:30px 48px 38px}.sg div{border-top:1px solid var(--t);padding-top:8px;font-size:13px;color:var(--m)}.sg b{display:block;color:var(--t);font-size:14px}@media(max-width:640px){.ant,.txt{padding-left:20px;padding-right:20px}.ref{margin:20px;grid-template-columns:1fr}.ref div{border-right:0!important;border-bottom:1px solid var(--l)!important}.tb{width:calc(100% - 40px);margin:18px 20px 0}.sg{padding:24px 20px}}`;
  const rand = (p: ProiectImpact) => `<tr class="nopb"><td>${nume(p)}<div style="margin-top:3px">${meta(p)}</div>${obs(p)}</td><td>${esc(lunaAn(p.data) || "—")}</td><td class="s nr">${p.suma !== null ? lei(p.suma) : "—"}</td></tr>`;
  const corp = d.gruparePeAn ? grupePeAn(d).map((g) => `<tr class="gr"><td colspan="2">${esc(g.an)}</td><td class="s nr">${lei(g.total)}</td></tr>${g.proiecte.map(rand).join("")}`).join("") : proiecteSortate(d).map(rand).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><header class="ant"><div class="bg">${ecg("#fff", 0.28)}</div><div class="rd">${cobrand(d, c, true)}<span class="ey" style="color:#fff;opacity:.85">${esc(dataLunga(c.azi))}</span></div><h1>Raport de impact</h1></header>
<div class="ref"><div><span>Către</span><strong>${esc(d.firma || "—")}</strong></div><div><span>Din partea</span>${esc(c.organizatie)}</div><div><span>Temei</span>${esc(fraza(d))}</div><div><span>Perioadă</span>${esc(perioadaImpact(d) || "—")}</div></div>
<div class="txt">${paragrafe(d)}</div><table class="tb"><thead><tr><th>Proiect</th><th>Alocare</th><th style="text-align:right">Sumă</th></tr></thead><tbody>${corp}</tbody><tfoot><tr><td colspan="2">Total</td><td class="s nr">${lei(total)}</td></tr></tfoot></table>${nrProiecte(d) ? "" : `<div class="in">${goal}</div>`}
<div class="txt">${blocFinal(d)}${disclaimer}</div><div class="sg"><div><b>${esc(d.autor || "Reprezentant")}</b>${esc(c.organizatie)}</div><div><b>Luat la cunoștință</b>${esc(d.firma || "—")}</div></div></main>`);
}

// --- 10. O pagină ---------------------------------------------------------------------------------------------------------------------

function oPagina(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.foaie{max-width:900px}.g{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr)}.st{background:var(--b);color:#fff;padding:28px 26px;position:relative;overflow:hidden}.st>*{position:relative}.st .ey{color:#fff;opacity:.85}.st h1{font-family:${SERIF};font-size:27px;line-height:1.12;margin:22px 0 6px;letter-spacing:-.01em}
.st .k{border-top:1px solid rgba(255,255,255,.28);padding:11px 0}.st .k small{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;opacity:.8}.st .k b{font-family:${SERIF};font-size:30px;line-height:1.1;letter-spacing:-.02em}.st p{font-size:13px;line-height:1.55;opacity:.95;margin-top:10px}.st .cb{flex-direction:column;align-items:flex-start;gap:8px}
.dr{padding:24px 28px}.dr .t{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--m);font-weight:700;border-bottom:2px solid var(--a);padding-bottom:6px;margin-bottom:4px}.r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:9px 0;border-bottom:1px solid var(--l);font-size:13px}.r b{font-size:13.5px}.r .nr{font-weight:700;color:var(--b);font-family:${SERIF};font-size:15px}.r .mt{font-size:11.5px}
.dr .semn{margin-top:18px}.dr .semn b{font-size:19px}@media(max-width:700px){.g{grid-template-columns:1fr}}`;
  const r = proiecteSortate(d).map((p) => `<div class="r nopb"><div><b>${nume(p)}</b><div>${meta(p)}</div></div><span class="nr">${p.suma !== null ? lei(p.suma) : ""}</span></div>`).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="g"><aside class="st"><div style="position:absolute;inset:auto 0 0 0;height:60px;color:#fff">${ecg("#fff", 0.25)}</div>${cobrand(d, c, true)}<h1>${esc(d.firma || "—")}</h1><div class="ey" style="margin:0 0 16px">Raport de impact</div>
<div class="k"><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div class="k"><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div class="k"><small>Perioadă</small><b style="font-size:17px;line-height:1.3">${esc(perioadaImpact(d) || "—")}</b></div>${aplicaPlaceholdere(d.narativ, d).slice(0, 1).map((p) => `<p>${p}</p>`).join("")}</aside>
<section class="dr"><div class="t">Proiectele susținute</div>${r || goal}${semnatura(d, c)}</section></div></main>`);
}

// --- 11. Afiș -------------------------------------------------------------------------------------------------------------------------

function afis(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.afs{position:relative;min-height:1130px;background:linear-gradient(160deg,var(--a) 0%,var(--b) 100%);color:#fff;padding:48px 56px 44px;display:flex;flex-direction:column;overflow:hidden}.afs>*{position:relative}.afs .fund{position:absolute;right:-120px;top:120px;opacity:.1}.afs .ecgb{position:absolute;left:0;right:0;bottom:150px;height:90px;color:#fff}
.afs .sus{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:12px;letter-spacing:.18em;text-transform:uppercase}.afs h1{font-family:${SERIF};font-size:128px;line-height:.9;letter-spacing:-.04em;margin:90px 0 0;font-weight:700}.afs h2{font-family:${SERIF};font-style:italic;font-weight:400;font-size:38px;margin-top:22px;opacity:.95}
.afs .pila{margin-top:48px;display:inline-flex;align-items:baseline;gap:16px;background:#fff;color:var(--b);border-radius:22px;padding:18px 30px;align-self:flex-start;box-shadow:0 18px 40px rgba(0,0,0,.25)}.afs .pila b{font-family:${SERIF};font-size:56px;line-height:1;letter-spacing:-.03em;color:var(--a)}.afs .pila span{font-size:14px;color:var(--m)}
.afs .tag{margin-top:34px;display:flex;flex-wrap:wrap;gap:9px;max-width:660px}.afs .tag span{border:1px solid rgba(255,255,255,.5);border-radius:99px;padding:6px 14px;font-size:13.5px;background:rgba(255,255,255,.1)}.afs .jos{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:13px}.afs .jos b{font-family:${SERIF};font-style:italic;font-weight:400;font-size:26px;display:block}
@media(max-width:640px){.afs{padding:28px 22px;min-height:760px}.afs h1{font-size:68px;margin-top:50px}.afs h2{font-size:26px}.afs .pila b{font-size:38px}}@media print{.afs{min-height:297mm}}`;
  const etichete = proiecteSortate(d).slice(0, 8).map((p) => `<span>${esc(p.nume)}</span>`).join("");
  return doc(`Mulțumim — ${d.firma}`, d, css, `<main class="foaie"><section class="afs"><div class="fund">${inima(560, "a1")}</div><div class="ecgb">${ecg("#fff", 0.3)}</div>
<div class="sus">${cobrand(d, c, true)}<span>${esc(perioadaImpact(d))}</span></div><h1>Mulțumim</h1><h2>${esc(d.firma || "—")}</h2>
<div class="pila"><b class="nr">${lei(total)}</b><span>${textProiecte(d)} · ${mecanismScurt(d).toLowerCase()}</span></div><div class="tag">${etichete}</div>
<div class="jos"><div><b>${esc(d.autor || c.organizatie)}</b>${d.autor ? esc(c.organizatie) : ""}</div><span>${esc(dataLunga(c.azi))}</span></div><p style="font-size:11px;opacity:.7;margin-top:14px">${esc(DISCLAIMER_IMPLICIT)}</p></section></main>`);
}

// --- 12. Mozaic -----------------------------------------------------------------------------------------------------------------------

function mozaic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const ps = proiecteSortate(d);
  const css = `.foaie{background:#f6f4f4}.mz{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;padding:14px}.t{border-radius:22px;padding:22px 24px;background:#fff;border:1px solid var(--l);position:relative;overflow:hidden}
.t.g{background:linear-gradient(140deg,var(--a),var(--b));color:#fff;border:0}.t.c{background:var(--c);border:0}.t.d{background:var(--b);color:#fff;border:0}.t small{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;opacity:.75}
.s7{grid-column:span 7}.s5{grid-column:span 5}.s4{grid-column:span 4}.s6{grid-column:span 6}.s12{grid-column:span 12}.s8{grid-column:span 8}
.t h1{font-family:${SERIF};font-size:36px;line-height:1.08;letter-spacing:-.02em;margin:10px 0 18px}.t .mare{font-family:${SERIF};font-size:64px;line-height:1;letter-spacing:-.04em}.t .med{font-family:${SERIF};font-size:44px;line-height:1.05;letter-spacing:-.03em;margin-top:8px}.t .mic{font-size:18px;line-height:1.3;margin-top:10px;font-weight:600}
.t.g .bg{position:absolute;left:0;right:0;bottom:0;height:60px;color:#fff}.t.g>*{position:relative}.t.g>.bg{position:absolute}.t.h{display:flex;align-items:center;justify-content:center;min-height:190px}
.pr h3{font-family:${SERIF};font-size:18px;line-height:1.3;margin:8px 0 2px}.pr .sm{font-family:${SERIF};font-size:30px;font-weight:700;color:var(--a);letter-spacing:-.02em;margin-top:8px}.pr.d .sm{color:#fff}.pr.d a{color:#fff}.pr .mt{color:inherit;opacity:.8;display:flex;margin:2px 0 0}.pr .mt+.mt{margin-left:0}.pr .mt svg{color:inherit}.pr .sh{height:5px;background:rgba(0,0,0,.08);border-radius:9px;margin-top:12px;overflow:hidden}.pr .sh i{display:block;height:100%;background:var(--a);border-radius:9px}.pr.d .sh{background:rgba(255,255,255,.25)}.pr.d .sh i{background:#fff}
.f{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}.f .semn{margin:0}.f .semn b{font-size:26px}@media(max-width:700px){.s7,.s5,.s4,.s6,.s8{grid-column:span 12}.t .mare{font-size:46px}}`;
  const marime = (i: number) => (ps.length === 1 ? "s12" : ps.length > 2 && i === 0 ? "s8" : ps.length > 2 && i === 1 ? "s4" : "s6");
  const placa = (p: ProiectImpact, i: number) => `<article class="t pr ${i === 0 ? "d" : i % 3 === 1 ? "c" : ""} ${marime(i)} nopb"><small>${esc(lunaAn(p.data) || "Proiect")}</small><h3>${nume(p)}</h3>${meta({ ...p, data: "" })}<div class="sm nr">${p.suma !== null ? lei(p.suma) : "—"}</div>${parte(p, total) ? `<div class="sh"><i style="width:${parte(p, total)}%"></i></div>` : ""}</article>`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="mz">
<section class="t g s7"><div class="bg">${ecg("#fff", 0.28)}</div><small>Raport de impact</small><h1>${esc(d.firma || "—")}</h1><small>Total susținut</small><div class="mare nr">${lei(total)}</div></section>
<section class="t c h s5">${inima(150, "m1")}</section>
<section class="t s4"><small>Proiecte</small><div class="med nr" style="color:var(--a)">${nrProiecte(d)}</div></section>
<section class="t s4"><small>Perioadă</small><div class="mic" style="color:var(--b)">${esc(perioadaImpact(d) || "—")}</div></section>
<section class="t s4"><small>Temei</small><div class="mic" style="font-size:14px;font-weight:500">${esc(fraza(d))}</div></section>
<section class="t s12">${paragrafe(d)}</section>${ps.map(placa).join("") || `<section class="t s12">${goal}</section>`}
<section class="t s12 f">${cobrand(d, c)}${semnaturaSimpla(d, c)}</section><section class="t s12">${blocFinal(d)}${disclaimer}</section></div></main>`);
}

// --- 13. Certificat -------------------------------------------------------------------------------------------------------------------

function prezentare(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const ps = proiecteSortate(d);
  const { svg, legenda } = inel(d, 210);
  const css = `.foaie{background:transparent;box-shadow:none;max-width:1040px}.deck{display:grid;gap:22px;padding:6px 0}.sw{container-type:inline-size;break-after:page;page-break-after:always}
.sl{position:relative;aspect-ratio:16/9;background:#fff;border-radius:14px;box-shadow:0 14px 40px rgba(35,31,32,.16);overflow:hidden;padding:5cqw 5.4cqw;display:flex;flex-direction:column;font-size:1.55cqw;line-height:1.5}
.sl .tp{display:flex;justify-content:space-between;align-items:center;gap:2cqw;font-size:1.15cqw;letter-spacing:.18em;text-transform:uppercase;color:var(--m)}.sl h2{font-family:${SERIF};font-size:3.3cqw;line-height:1.1;letter-spacing:-.02em;color:var(--b);margin-top:2.2cqw}.sl .ey{font-size:1.1cqw}
.sl.cop{background:linear-gradient(135deg,var(--a),var(--b));color:#fff;justify-content:space-between}.sl.cop .tp{color:#fff}.sl.cop h1{font-family:${SERIF};font-size:6.4cqw;line-height:1;letter-spacing:-.03em}.sl.cop .ey{color:#fff;opacity:.85}.sl.cop .tt{font-family:${SERIF};font-size:3.4cqw;margin-top:1.4cqw}.sl.cop .bg{position:absolute;left:0;right:0;bottom:12%;height:9%;color:#fff}.sl.cop>*{position:relative}.sl.cop>.bg{position:absolute}
.sl .kp{display:grid;grid-template-columns:1.5fr 1fr 1.3fr;gap:1.6cqw;margin-top:2.4cqw}.sl .kp div{background:var(--ab);border-radius:1.4cqw;padding:1.6cqw 1.8cqw}.sl .kp small{display:block;font-size:1cqw;letter-spacing:.14em;text-transform:uppercase;color:var(--m);font-weight:700}.sl .kp b{display:block;font-family:${SERIF};font-size:3.8cqw;line-height:1.1;color:var(--a);letter-spacing:-.03em}.sl .kp b.mic{font-size:1.9cqw;padding-top:.8cqw;color:var(--b)}
.sl .doi{display:grid;grid-template-columns:1.1fr 1fr;gap:3cqw;align-items:center;margin-top:2cqw;flex:1}.sl .doi p.lead{font-size:1.9cqw;line-height:1.55}.sl .doi svg{width:15cqw;height:15cqw}.sl .mix{display:flex;gap:2cqw;align-items:center}${CSS_LEGENDA}.sl .lg{gap:.8cqw}.sl .lg div{font-size:1.25cqw;gap:.8cqw}
.sl .cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.8cqw;margin-top:2cqw;flex:1}.sl .pc{border:1px solid var(--l);border-radius:1.4cqw;padding:1.8cqw;display:flex;flex-direction:column;background:#fff}.sl .pc small{font-size:1cqw;letter-spacing:.14em;text-transform:uppercase;color:var(--a);font-weight:700}.sl .pc h3{font-family:${SERIF};font-size:1.85cqw;line-height:1.25;margin-top:.7cqw}.sl .pc .sm{font-family:${SERIF};font-size:3.1cqw;font-weight:700;color:var(--b);margin-top:auto;letter-spacing:-.02em}.sl .pc .mt{font-size:1.1cqw;margin-top:.5cqw}.sl .pc .mt svg{width:1.3cqw;height:1.3cqw}.sl .pc p{font-size:1.2cqw!important;margin-top:.6cqw!important}
.sl.fin{background:var(--b);color:#fff;justify-content:center;align-items:center;text-align:center;gap:1.6cqw}.sl.fin h2{color:#fff;font-size:6cqw;margin-top:0}.sl.fin .tp{position:absolute;left:5.4cqw;right:5.4cqw;top:5cqw;color:#fff}.sl.fin .semn b{color:#fff;font-size:2.6cqw}.sl.fin .semn span{color:#fff;opacity:.8;font-size:1.3cqw}.sl.fin .semn{margin:0}.sl.fin .bg{position:absolute;left:0;right:0;bottom:8%;height:10%;color:#fff}
@media print{.foaie{max-width:none}.deck{gap:0;padding:0}.sw{width:297mm}.sl{border-radius:0;box-shadow:none}}`;
  const grupe: ProiectImpact[][] = [];
  for (let i = 0; i < ps.length; i += 3) grupe.push(ps.slice(i, i + 3));
  const diapo = (clasa: string, corp: string) => `<div class="sw"><section class="sl ${clasa}">${corp}</section></div>`;
  const slideProiecte = grupe.map((g, i) => diapo("", `<div class="tp"><span>${esc(c.organizatie)}</span><span>${esc(d.firma)}</span></div><h2>Proiectele susținute${grupe.length > 1 ? ` (${i + 1}/${grupe.length})` : ""}</h2><div class="cols">${g.map((p) => `<article class="pc"><small>${esc(lunaAn(p.data) || "Proiect")}</small><h3>${nume(p)}</h3>${meta({ ...p, data: "", anDirectionare: null })}${obs(p)}<div class="sm nr">${p.suma !== null ? lei(p.suma) : "—"}</div></article>`).join("")}</div>`)).join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="deck">
${diapo("cop", `<div class="bg">${ecg("#fff", 0.3)}</div><div class="tp">${cobrand(d, c, true)}<span>${esc(perioadaImpact(d))}</span></div><div><div class="ey">Raport de impact</div><h1>${esc(d.firma || "—")}</h1><div class="tt nr">${lei(total)} · ${textProiecte(d)}</div></div><div class="tp"><span>${esc(c.organizatie)}</span><span>${esc(dataLunga(c.azi))}</span></div>`)}
${diapo("", `<div class="tp"><span>${esc(c.organizatie)}</span><span>${esc(d.firma)}</span></div><h2>Ce am făcut împreună</h2><div class="kp"><div><small>Total susținut</small><b class="nr">${lei(total)}</b></div><div><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div><small>Perioadă</small><b class="mic">${esc(perioadaImpact(d) || "—")}</b></div></div><div class="doi"><div>${aplicaPlaceholdere(d.narativ, d).slice(0, 1).map((p) => `<p class="lead">${p}</p>`).join("")}</div>${svg ? `<div class="mix">${svg}${legendaInel(legenda)}</div>` : ""}</div>`)}
${slideProiecte}
${diapo("fin", `<div class="bg">${ecg("#fff", 0.25)}</div><div class="tp">${cobrand(d, c, true)}<span></span></div><h2>Vă mulțumim</h2>${semnaturaSimpla(d, c)}<p style="font-size:1.1cqw;opacity:.75">${esc(DISCLAIMER_IMPLICIT)}</p>`)}
</div></main>`, "A4 landscape");
}

// --- 15. Analitic ---------------------------------------------------------------------------------------------------------------------

function analitic(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const ps = proiecteSortate(d);
  const beneficiari = ps.reduce((t, p) => t + (p.nrBeneficiari ?? 0), 0);
  const cuBen = ps.filter((p) => (p.nrBeneficiari ?? 0) > 0 && (p.suma ?? 0) > 0);
  const sumaCuBen = cuBen.reduce((t, p) => t + (p.suma ?? 0), 0);
  const kpi4 = beneficiari > 0 && sumaCuBen > 0 ? { e: `Contribuție per beneficiar (${cuBen.length} din ${nrProiecte(d)} proiecte)`, v: lei(sumaCuBen / beneficiari) } : { e: "Proiecte finalizate", v: `${ps.filter((p) => p.stare === "finalizat").length} din ${ps.length}` };
  const { svg, legenda } = inel(d, 170);
  const graf = cumulativ(d);
  const br = bare(d);
  const maxim = Math.max(1, ...ps.map((p) => p.suma ?? 0));
  const css = `.foaie{max-width:940px;background:#f7f5f5}.cap{background:#fff;padding:20px 32px;display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:1px solid var(--l);flex-wrap:wrap}.cap span{color:var(--m);font-size:12.5px}
.tit{padding:26px 32px 4px}.tit h1{font-size:30px;line-height:1.15;letter-spacing:-.02em}.tit p{color:var(--m);margin-top:4px}.kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:16px 32px}
.kp>div{background:#fff;border:1px solid var(--l);border-radius:16px;padding:16px 18px}.kp .ic{width:34px;height:34px;border-radius:10px;background:var(--ab);color:var(--a);display:flex;align-items:center;justify-content:center;margin-bottom:8px}.kp small{display:block;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--m);font-weight:700}.kp b{display:block;font-size:26px;line-height:1.15;letter-spacing:-.03em;color:var(--t)}.kp b.mic{font-size:15px;padding-top:6px}
.gr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 32px 12px}.pn{background:#fff;border:1px solid var(--l);border-radius:16px;padding:18px 20px}.pn.l{grid-column:1/-1}.pn h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--m);margin-bottom:12px}
.mix{display:flex;gap:22px;align-items:center;flex-wrap:wrap}${CSS_LEGENDA}.txt{padding:6px 32px 8px}.txt p{max-width:680px}
.tb{width:100%;border-collapse:collapse;font-size:13.5px}.tb th{text-align:left;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--m);padding:0 0 8px;border-bottom:1px solid var(--l)}.tb td{padding:10px 0;border-bottom:1px solid var(--l);vertical-align:top}.tb .s{text-align:right;font-weight:700}.tb .b{width:26%;padding:16px 12px 0}.tb .b div{height:6px;background:var(--l);border-radius:9px;overflow:hidden}.tb .b i{display:block;height:100%;background:linear-gradient(90deg,var(--a),var(--b))}
.pie{padding:6px 32px 30px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}.pie .semn{margin:0}@media(max-width:700px){.kp{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px 16px}.gr{grid-template-columns:1fr;padding:0 16px 12px}.tit,.txt,.pie{padding-left:16px;padding-right:16px}.cap{padding:16px}}`;
  const rand = (p: ProiectImpact) => `<tr class="nopb"><td>${nume(p)}<div>${meta(p)}</div></td><td class="b"><div><i style="width:${Math.max(3, Math.round(((p.suma ?? 0) / maxim) * 100))}%"></i></div></td><td class="s nr">${p.suma !== null ? lei(p.suma) : "—"}</td></tr>`;
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="cap">${cobrand(d, c)}<span>${esc(perioadaImpact(d))}</span></div>
<section class="tit"><div class="ey">Raport de impact</div><h1 style="margin-top:6px">${esc(d.firma || "—")}</h1><p>${esc(fraza(d))}</p></section>
<div class="kp"><div><div class="ic">${ICON.moneda}</div><small>Total susținut</small><b class="nr" style="color:var(--a)">${lei(total)}</b></div><div><div class="ic">${ICON.grup}</div><small>Proiecte</small><b class="nr">${nrProiecte(d)}</b></div><div><div class="ic">${ICON.media}</div><small>${kpi4.e}</small><b class="nr">${kpi4.v}</b></div><div><div class="ic">${ICON.calendar}</div><small>Perioadă</small><b class="mic">${esc(perioadaImpact(d) || "—")}</b></div></div>
<div class="txt">${paragrafe(d, false)}</div>
<div class="gr">${graf ? `<section class="pn l"><h2>Evoluția sumelor, cumulat</h2>${graf}</section>` : ""}${br ? `<section class="pn"><h2>${d.gruparePeAn || grupePeAn(d).length > 1 ? "Pe ani" : "Pe proiecte"}</h2>${br}</section>` : ""}${svg ? `<section class="pn"><h2>Ponderea proiectelor</h2><div class="mix">${svg}${legendaInel(legenda)}</div></section>` : ""}
<section class="pn l"><h2>Proiectele, în detaliu</h2><table class="tb"><thead><tr><th>Proiect</th><th></th><th style="text-align:right">Sumă</th></tr></thead><tbody>${ps.map(rand).join("")}</tbody></table>${ps.length ? "" : goal}</section></div>
<div class="pie">${semnatura(d, c)}${inima(54, "n1")}</div></main>`);
}

// --- O cifră pe pagină ----------------------------------------------------------------------------------------------------------------

function oCifra(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.cv{padding:60px 64px 52px;background:linear-gradient(165deg,var(--c),#fff 70%)}.cv .sus{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--m)}
.cv h1{font-size:28px;line-height:1.15;margin-top:54px;color:var(--b)}.cv .t{font-family:${SERIF};font-size:124px;line-height:.95;font-weight:700;color:var(--a);letter-spacing:-.045em;margin:26px 0 8px}.cv .mic{color:var(--m);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase}.cv .txt{margin-top:38px;max-width:560px}
.bx{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:36px;align-items:center;padding:46px 64px;border-top:1px solid var(--l)}.bx:nth-of-type(even){background:var(--ab)}.bx .s{font-family:${SERIF};font-size:52px;font-weight:700;color:var(--b);letter-spacing:-.03em;line-height:1}.bx .s small{display:block;font-family:${SANS};font-size:11.5px;font-weight:400;letter-spacing:.16em;text-transform:uppercase;color:var(--m);margin-top:10px}.bx h3{font-family:${SERIF};font-size:21px;line-height:1.3}.bx .mm{margin-top:6px}
.cf{padding:34px 64px 44px}@media(max-width:640px){.cv{padding:30px 22px}.cv .t{font-size:70px}.bx{grid-template-columns:1fr;gap:12px;padding:30px 22px}.cf{padding:26px 22px}}`;
  const fise = proiecteSortate(d)
    .map((p) => `<section class="bx nopb"><div class="s nr">${p.suma !== null ? lei(p.suma) : "—"}<small>${esc(procentTxt(p, total))}</small></div><div><h3>${nume(p)}</h3><div class="mm">${meta(p)}</div>${obs(p)}</div></section>`)
    .join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><section class="cv"><div class="sus">${cobrand(d, c)}<span>${esc(perioadaImpact(d))}</span></div><h1>${esc(d.firma || "—")}</h1><div class="t nr">${lei(total)}</div><div class="mic">${textProiecte(d)} susținute</div><div class="txt">${paragrafe(d)}</div></section>${fise || `<div class="cf">${goal}</div>`}<div class="cf">${semnatura(d, c)}</div></main>`);
}

// --- Gazetă ---------------------------------------------------------------------------------------------------------------------------

function gazeta(d: DateImpact, c: ContextRaport): string {
  const total = totalImpact(d);
  const css = `.gz{padding:34px 48px 44px;font-family:${SERIF}}.gz .mh{border-top:6px solid var(--t);border-bottom:1px solid var(--t);padding:12px 0;display:flex;justify-content:space-between;align-items:center;gap:14px;position:relative}.gz .mh:after{content:"";position:absolute;left:0;right:0;bottom:-5px;border-bottom:1px solid var(--t)}.gz .ed{display:flex;justify-content:space-between;gap:14px;font-family:${SANS};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--m);padding:14px 0 8px}
.gz h1{font-size:50px;line-height:1.02;font-weight:700;letter-spacing:-.025em;color:var(--b);margin:6px 0 8px}.gz .dec{font-style:italic;font-size:18px;color:var(--m);border-bottom:1px solid var(--l);padding-bottom:16px}.gz .col{column-count:2;column-gap:34px;column-rule:1px solid var(--l);margin-top:18px;text-align:justify;hyphens:auto}.gz .col p{margin:0 0 10px}.gz .cifre{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:22px 0;border-top:2px solid var(--t);border-bottom:2px solid var(--t)}.gz .cifre div{padding:14px 16px;border-left:1px solid var(--l)}.gz .cifre div:first-child{border-left:0;padding-left:0}.gz .cifre b{display:block;font-size:34px;line-height:1.05;color:var(--a)}.gz .cifre small{font-family:${SANS};font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m)}
.gz .st{column-count:2;column-gap:34px;column-rule:1px solid var(--l)}.gz .st article{break-inside:avoid;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--l)}.gz .st h3{font-size:19px;line-height:1.25}.gz .st .sm{font-family:${SANS};font-size:12px;font-weight:700;color:var(--a);margin-top:3px}.gz .st .mm{margin-top:4px}@media(max-width:640px){.gz{padding:22px 20px}.gz h1{font-size:34px}.gz .col,.gz .st{column-count:1}}`;
  const stiri = proiecteSortate(d)
    .map((p) => `<article class="nopb"><h3>${nume(p)}</h3><div class="sm nr">${p.suma !== null ? lei(p.suma) : ""}</div><div class="mm">${meta(p)}</div>${obs(p)}</article>`)
    .join("");
  return doc(`Raport de impact — ${d.firma}`, d, css, `<main class="foaie"><div class="gz"><div class="mh">${cobrand(d, c)}<span style="font-family:${SANS_ATR};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--m)">Raport de impact</span></div><div class="ed"><span>${esc(dataLunga(c.azi))}</span><span>${esc(perioadaImpact(d))}</span></div>
<h1>${esc(d.firma || "—")}</h1><div class="dec">Ce a făcut sprijinul dumneavoastră: ${esc(textProiecte(d))}, ${esc(lei(total))}.</div>
<div class="col">${aplicaPlaceholdere(d.narativ, d).map((p) => `<p>${p}</p>`).join("")}</div>
<div class="cifre"><div><b class="nr">${lei(total)}</b><small>Total susținut</small></div><div><b class="nr">${nrProiecte(d)}</b><small>${nrProiecte(d) === 1 ? "Proiect" : "Proiecte"}</small></div><div><b style="font-size:20px;line-height:1.25">${esc(perioadaImpact(d) || "—")}</b><small>Perioadă</small></div></div>
<div class="st">${stiri || goal}</div>${semnatura(d, c)}</div></main>`);
}

export function randeazaRaportImpact(d: DateImpact, c: ContextRaport, model: ModelImpact = d.model): string {
  seteazaMotiv(d.motivGrafic, c.organizatie);
  const html = randeazaModel(d, c, model);
  if (!c.identificare) return html;
  const disc = esc(DISCLAIMER_IMPLICIT);
  return html.split(disc).join(`${disc}<br>${esc(c.identificare)}`);
}

function randeazaModel(d: DateImpact, c: ContextRaport, model: ModelImpact): string {
  switch (model) {
    case "executiv": return executiv(d, c);
    case "editorial": return editorial(d, c);
    case "carduri": return carduri(d, c);
    case "o-cifra": return oCifra(d, c);
    case "minimal": return minimal(d, c);
    case "cronologic": return cronologic(d, c);
    case "infografic": return infografic(d, c);
    case "corporate": return corporate(d, c);
    case "o-pagina": return oPagina(d, c);
    case "afis": return afis(d, c);
    case "mozaic": return mozaic(d, c);
    case "gazeta": return gazeta(d, c);
    case "prezentare": return prezentare(d, c);
    case "analitic": return analitic(d, c);
    default: return clasic(d, c);
  }
}
