// Cele 15 modele de scrisoare. Fiecare întoarce un document HTML complet (A4 portret), cu dimensiuni în cqw ca să se micșoreze fără deformare.
import { A4_PORTRET, docShell, esc, inimaPuls, linieEcg, logoImg, SANS, SERIF } from "./documente-comun";
import { corpScrisoare, liniiScrisoare, type DateScrisoare, type ModelScrisoare } from "./scrisori";
import { dataLunga } from "./raport-impact";

// Bucățile scrisorii, deja escapate, pe care modelele le aranjează după nevoie.
function bucati(d: DateScrisoare) {
  const linii = d.destAdresa.split("\n").map((x) => x.trim()).filter(Boolean);
  const dest = [d.destNume && `<b>${esc(d.destNume)}</b>`, d.destFunctie && esc(d.destFunctie), d.destFirma && esc(d.destFirma), ...linii.map(esc)].filter(Boolean).join("<br>");
  const locData = `${d.loc ? `${esc(d.loc)}, ` : ""}${esc(dataLunga(d.data))}`;
  const detalii = d.antetLinii.split("\n").map((x) => x.trim()).filter(Boolean).map(esc);
  const ongNume = esc(d.antetNume || "Organizația");
  return {
    dest,
    locData,
    detalii,
    ongNume,
    nr: d.nrInregistrare ? esc(d.nrInregistrare) : "",
    subiect: d.subiect ? `<p class="sub">${liniiScrisoare(d.subiect, d)}</p>` : "",
    sal: d.formulaAdresare ? `<p class="sal">${liniiScrisoare(d.formulaAdresare, d)}</p>` : "",
    corp: `<div class="corp">${corpScrisoare(d).map((p) => `<p>${p}</p>`).join("")}</div>`,
    fin: d.formulaFinala ? `<p class="fin">${esc(d.formulaFinala)}</p>` : "",
    semn: d.semnNume || d.semnFunctie ? `<div class="semn">${d.semnNume ? `<b>${esc(d.semnNume)}</b>` : ""}${d.semnFunctie ? `<span>${esc(d.semnFunctie)}</span>` : ""}<span>${ongNume}</span></div>` : "",
    ps: d.ps ? `<p class="ps"><b>P.S.</b> ${liniiScrisoare(d.ps, d)}</p>` : "",
    anexe: d.anexe ? `<p class="anx"><b>Anexe:</b> ${esc(d.anexe).replace(/\n/g, ", ")}</p>` : "",
    logoOng: (h: string) => logoImg(d.logoOng, d.antetNume, h),
    logoDest: (h: string) => logoImg(d.logoDestinatar, d.destFirma, h),
  };
}
type B = ReturnType<typeof bucati>;

// Stilul comun al textului scrisorii (în em, față de mărimea foii).
const COMUN = `.pag{display:flex;flex-direction:column;min-height:141.4cqw}.ft{flex:1}
.dr{display:flex;justify-content:space-between;gap:2cqw;color:var(--m);font-size:.92em;margin-bottom:2.4em}
.dest{margin-bottom:1.7em;line-height:1.5}.dest b{display:block;font-size:1.04em}
.sub{font-weight:700;margin:0 0 1.2em;font-size:1.04em}.sal{margin-bottom:1em}
.corp p{margin:0 0 .95em;text-align:justify;hyphens:auto}.fin{margin-top:1.3em}
.semn{margin-top:2.4em}.semn b{display:block;font-family:${SERIF};font-style:italic;font-weight:400;font-size:1.75em;color:var(--b);line-height:1.15}.semn span{display:block;font-size:.92em;color:var(--m)}
.ps{margin-top:1.8em;font-size:.92em}.anx{margin-top:1.1em;font-size:.88em;color:var(--m)}
.onm{font-weight:700;letter-spacing:.04em}.det{font-size:.8em;color:var(--m);line-height:1.5}`;

const trupul = (b: B, cuLocData = true) =>
  `${cuLocData ? `<div class="dr"><span>${b.locData}</span><span class="nr">${b.nr}</span></div>` : ""}${b.dest ? `<div class="dest">${b.dest}</div>` : ""}${b.subiect}${b.sal}${b.corp}${b.fin}${b.semn}${b.ps}${b.anexe}`;

const S = (d: DateScrisoare, css: string, corp: string) => docShell(`Scrisoare — ${d.destFirma || d.destNume || "document"}`, d, COMUN + css, corp, A4_PORTRET);
const detaliiSir = (b: B, sep = " · ") => b.detalii.join(sep);

function clasic(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.cl{padding:7cqw 9cqw 5cqw;font-family:${SERIF}}.cl .cap{display:flex;justify-content:space-between;align-items:flex-end;gap:3cqw;padding-bottom:2.2cqw;border-bottom:.25cqw solid var(--a);margin-bottom:5cqw}.cl .nm{font-size:2.5em;line-height:1.1;color:var(--b);font-weight:700}.cl .det{text-align:right}.cl .pie{margin-top:3cqw;border-top:.12cqw solid var(--l);padding-top:1.6cqw;text-align:center;font-size:.78em;color:var(--m)}`;
  return S(d, css, `<div class="pag cl"><div class="cap"><div>${d.logoOng ? b.logoOng("5.4cqw") : `<div class="nm">${b.ongNume}</div>`}</div><div class="det">${b.detalii.join("<br>")}</div></div><div class="ft">${trupul(b)}</div><div class="pie">${b.ongNume}${b.detalii.length ? ` · ${detaliiSir(b)}` : ""}</div></div>`);
}

function modern(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.md{padding:8cqw 9cqw 6cqw 11cqw;font-family:${SANS}}.md:before{content:"";position:absolute;left:0;top:0;bottom:0;width:1.8cqw;background:linear-gradient(var(--a),var(--b))}.md .cap{display:flex;justify-content:space-between;align-items:flex-start;gap:3cqw;margin-bottom:5cqw}.md .nm{font-size:3em;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--b)}.md .nm:after{content:"";display:block;width:6cqw;height:.5cqw;background:var(--a);margin-top:1.4cqw}.md .det{text-align:right;text-transform:uppercase;letter-spacing:.08em}`;
  return S(d, css, `<div class="pag md"><div class="cap"><div>${d.logoOng ? b.logoOng("6cqw") : `<div class="nm">${b.ongNume}</div>`}</div><div class="det">${b.detalii.join("<br>")}</div></div><div class="ft">${trupul(b)}</div></div>`);
}

function banda(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.bd .top{background:linear-gradient(135deg,var(--b),var(--a));color:#fff;padding:5.5cqw 9cqw;display:flex;justify-content:space-between;align-items:center;gap:3cqw}.bd .top .lg{background:#fff;border-radius:1cqw;padding:1cqw 1.6cqw}.bd .nm{font-size:2em;font-weight:800;letter-spacing:-.01em}.bd .top .det{color:#fff;opacity:.9;text-align:right}.bd .in{padding:6cqw 9cqw 4cqw;flex:1}.bd .jos{height:1.6cqw;background:var(--a)}`;
  return S(d, css, `<div class="pag bd"><div class="top"><div>${d.logoOng ? `<div class="lg">${b.logoOng("4.6cqw")}</div>` : `<div class="nm">${b.ongNume}</div>`}</div><div class="det">${b.detalii.join("<br>")}</div></div><div class="in">${trupul(b)}</div><div class="jos"></div></div>`);
}

function elegant(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.el{padding:7cqw 10cqw 5cqw;font-family:${SERIF};text-align:center}.el .nm{font-size:1.8em;letter-spacing:.32em;text-transform:uppercase;color:var(--b);margin-top:1.6cqw}.el .orn{display:flex;align-items:center;justify-content:center;gap:2cqw;color:var(--a);margin:2cqw auto 5cqw}.el .orn:before,.el .orn:after{content:"";width:14cqw;height:.15cqw;background:var(--a);opacity:.55}.el .orn svg{width:2.6cqw;height:2.6cqw}.el .ft{text-align:left;font-size:1.04em}.el .corp p{text-align:justify}.el .semn b{font-size:2em}.el .pie{font-size:.78em;color:var(--m);margin-top:3cqw;letter-spacing:.06em}.el .logo{display:flex;justify-content:center}`;
  return S(d, css, `<div class="pag el"><div class="logo">${b.logoOng("6cqw")}</div><div class="nm">${b.ongNume}</div><div class="orn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 4.6 13.4A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 7.4 6.6z"/></svg></div><div class="ft">${trupul(b)}</div><div class="pie">${detaliiSir(b)}</div></div>`);
}

function executiv(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.ex{padding:0 0 5cqw;font-family:${SANS}}.ex .rule{height:1.1cqw;background:var(--b)}.ex .cap{padding:4.5cqw 9cqw 3cqw;text-align:right;border-bottom:.12cqw solid var(--l);display:flex;flex-direction:column;align-items:flex-end;gap:1cqw}.ex .nm{font-size:1.5em;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--b)}.ex .in{padding:5cqw 9cqw 0;flex:1}.ex .dest:before{content:"Către";display:block;font-size:.72em;letter-spacing:.16em;text-transform:uppercase;color:var(--a);font-weight:700;margin-bottom:.4em}`;
  return S(d, css, `<div class="pag ex"><div class="rule"></div><div class="cap">${d.logoOng ? b.logoOng("4.6cqw") : ""}<div class="nm">${b.ongNume}</div><div class="det">${b.detalii.join("<br>")}</div></div><div class="in">${trupul(b)}</div></div>`);
}

function lateral(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.lt2{flex-direction:row}.lt2 .col{width:27%;background:var(--c);padding:7cqw 3.6cqw;display:flex;flex-direction:column;gap:3cqw;border-right:.2cqw solid var(--a)}.lt2 .nm{font-size:1.4em;font-weight:800;color:var(--b);line-height:1.2}.lt2 .col .det{font-size:.82em;line-height:1.65}.lt2 .dc{flex:1;padding:8cqw 8cqw 6cqw 6cqw;font-family:${SANS};display:flex;flex-direction:column}`;
  return S(d, css, `<div class="pag lt2"><div class="col">${b.logoOng("6cqw")}<div class="nm">${d.logoOng ? "" : b.ongNume}</div><div class="det">${b.detalii.join("<br>")}</div></div><div class="dc"><div class="ft">${trupul(b)}</div></div></div>`);
}

function minimal(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.mn{padding:8cqw 12cqw 6cqw;font-family:${SANS};font-weight:300}.mn .cap{display:flex;justify-content:space-between;align-items:center;font-size:.8em;letter-spacing:.22em;text-transform:uppercase;color:var(--m);margin-bottom:12cqw}.mn .sub{font-weight:500}.mn .semn b{font-family:${SANS};font-style:normal;font-weight:300;font-size:1.5em;color:var(--t)}.mn .pie{font-size:.74em;letter-spacing:.1em;color:var(--m);text-transform:uppercase}.mn .corp p{text-align:left}`;
  return S(d, css, `<div class="pag mn"><div class="cap"><span>${d.logoOng ? b.logoOng("3.6cqw") : b.ongNume}</span><span>${b.locData}</span></div><div class="ft">${trupul(b, false)}</div><div class="pie">${b.ongNume}${b.detalii.length ? ` · ${detaliiSir(b)}` : ""}</div></div>`);
}

function corporate(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.co .top{background:var(--b);color:#fff;padding:4.6cqw 9cqw;display:flex;justify-content:space-between;align-items:center;gap:3cqw;border-bottom:.8cqw solid var(--a)}.co .top .lg{background:#fff;border-radius:.8cqw;padding:.9cqw 1.4cqw}.co .nm{font-size:1.7em;font-weight:700;letter-spacing:.02em}.co .in{padding:6cqw 9cqw 3cqw;flex:1;font-family:${SANS}}.co .bot{background:var(--b);color:#fff;padding:2.2cqw 9cqw;font-size:.76em;display:flex;justify-content:space-between;gap:2cqw;flex-wrap:wrap}`;
  return S(d, css, `<div class="pag co"><div class="top">${d.logoOng ? `<div class="lg">${b.logoOng("4.4cqw")}</div>` : `<div class="nm">${b.ongNume}</div>`}<div class="nm" style="font-size:1em;font-weight:500;opacity:.9">${d.logoOng ? b.ongNume : ""}</div></div><div class="in">${trupul(b)}</div><div class="bot">${b.detalii.map((x) => `<span>${x}</span>`).join("")}</div></div>`);
}

function inima(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.im{padding:7cqw 9cqw 5cqw;font-family:${SERIF}}.im .wm{position:absolute;right:-8cqw;bottom:-4cqw;width:56cqw;opacity:.07}.im .cap{display:flex;align-items:center;gap:2.4cqw}.im .ic{width:6cqw;flex:none}.im .nm{font-size:2em;font-weight:700;color:var(--b);line-height:1.1}.im .ecg{height:5cqw;color:var(--a);margin:1.4cqw 0 4cqw}.im .ft,.im .cap,.im .ecg,.im .pie{position:relative}.im .pie{font-size:.78em;color:var(--m);margin-top:3cqw}`;
  return S(d, css, `<div class="pag im"><div class="wm">${inimaPuls("w1")}</div><div class="cap">${d.logoOng ? b.logoOng("6cqw") : `<div class="ic">${inimaPuls("w2")}</div>`}<div class="nm">${b.ongNume}</div></div><div class="ecg">${linieEcg("currentColor", 0.55)}</div><div class="ft">${trupul(b)}</div><div class="pie">${detaliiSir(b)}</div></div>`);
}

function colt(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.ct{padding:8cqw 9cqw 6cqw;font-family:${SANS};overflow:hidden}.ct .c1{position:absolute;right:-14cqw;top:-14cqw;width:40cqw;height:40cqw;border-radius:50%;background:var(--a)}.ct .c2{position:absolute;right:-7cqw;top:-20cqw;width:34cqw;height:34cqw;border-radius:50%;background:var(--b);opacity:.9}.ct .c3{position:absolute;left:-12cqw;bottom:-14cqw;width:30cqw;height:30cqw;border-radius:50%;background:var(--c)}.ct>*{position:relative}.ct>.c1,.ct>.c2,.ct>.c3{position:absolute}.ct .cap{margin-bottom:11cqw}.ct .nm{font-size:2.3em;font-weight:800;letter-spacing:-.02em;color:var(--b);line-height:1}.ct .det{margin-top:1.2cqw}.ct .corp p{text-align:left}`;
  return S(d, css, `<div class="pag ct"><div class="c1"></div><div class="c2"></div><div class="c3"></div><div class="cap">${d.logoOng ? b.logoOng("6cqw") : `<div class="nm">${b.ongNume}</div>`}<div class="det">${b.detalii.join("<br>")}</div></div><div class="ft">${trupul(b)}</div></div>`);
}

function dubluLogo(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.dl{padding:7cqw 9cqw 5cqw;font-family:${SERIF}}.dl .cap{display:flex;align-items:center;justify-content:center;gap:4cqw;padding-bottom:3cqw;border-bottom:.25cqw solid var(--a);margin-bottom:5cqw}.dl .x{font-size:2.4em;color:var(--a);opacity:.5;line-height:1;font-family:${SANS};font-weight:300}.dl .onm{font-size:1.3em;color:var(--b)}.dl .pie{margin-top:3cqw;text-align:center;font-size:.78em;color:var(--m)}`;
  const o = d.logoOng ? b.logoOng("6.4cqw") : `<span class="onm">${b.ongNume}</span>`;
  const f = d.logoDestinatar ? `<span class="x" aria-hidden="true">×</span>${b.logoDest("6.4cqw")}` : "";
  return S(d, css, `<div class="pag dl"><div class="cap">${o}${f}</div><div class="ft">${trupul(b)}</div><div class="pie">${b.ongNume}${b.detalii.length ? ` · ${detaliiSir(b)}` : ""}</div></div>`);
}

function memo(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.mm{padding:7cqw 9cqw 5cqw;font-family:${SANS}}.mm .cap{display:flex;justify-content:space-between;align-items:center;gap:3cqw;margin-bottom:3cqw}.mm .ti{font-size:2.1em;font-weight:800;letter-spacing:.02em;color:var(--b)}.mm table{width:100%;border-collapse:collapse;margin-bottom:4cqw;font-size:.95em}.mm th{width:16%;text-align:left;text-transform:uppercase;letter-spacing:.1em;font-size:.72em;color:var(--m);padding:1.1cqw 0;border-top:.12cqw solid var(--t);vertical-align:top}.mm td{padding:1.1cqw 0;border-top:.12cqw solid var(--t);vertical-align:top}.mm tr:last-child th,.mm tr:last-child td{border-bottom:.12cqw solid var(--t)}.mm .dest,.mm .dr,.mm .sub{display:none}`;
  const rand = (e: string, v: string) => (v ? `<tr><th>${e}</th><td>${v}</td></tr>` : "");
  return S(d, css, `<div class="pag mm"><div class="cap"><div class="ti">Scrisoare</div>${d.logoOng ? b.logoOng("4.6cqw") : `<div class="onm">${b.ongNume}</div>`}</div><table>${rand("De la", `${b.ongNume}${d.semnNume ? `, ${esc(d.semnNume)}` : ""}`)}${rand("Către", b.dest.replace(/<br>/g, ", ").replace(/<\/?b>/g, ""))}${rand("Data", b.locData)}${rand("Nr.", b.nr)}${rand("Subiect", d.subiect ? `<b>${liniiScrisoare(d.subiect, d)}</b>` : "")}</table><div class="ft">${trupul(b, false)}</div></div>`);
}

function registru(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.rg{padding:6cqw 9cqw 5cqw;font-family:${SERIF}}.rg .cap{display:flex;justify-content:space-between;align-items:stretch;gap:3cqw;padding-bottom:2.6cqw;border-bottom:.9cqw double var(--b);margin-bottom:4cqw}.rg .nm{font-size:1.8em;font-weight:700;color:var(--b);line-height:1.15}.rg .box{border:.25cqw solid var(--b);padding:1.4cqw 2.2cqw;text-align:center;min-width:24cqw;font-family:${SANS}}.rg .box small{display:block;text-transform:uppercase;letter-spacing:.14em;font-size:.68em;color:var(--m)}.rg .box b{display:block;font-size:1.2em;margin-top:.3em}.rg .dr{display:none}.rg .semn{display:flex;align-items:flex-end;justify-content:space-between;gap:3cqw}.rg .ls{width:13cqw;height:13cqw;border:.2cqw dashed var(--m);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--m);font-size:.8em;font-family:${SANS}}`;
  const semn = d.semnNume || d.semnFunctie ? `<div class="semn"><div>${d.semnNume ? `<b>${esc(d.semnNume)}</b>` : ""}${d.semnFunctie ? `<span>${esc(d.semnFunctie)}</span>` : ""}<span>${b.ongNume}</span></div><div class="ls">L.S.</div></div>` : "";
  return S(d, css, `<div class="pag rg"><div class="cap"><div>${d.logoOng ? b.logoOng("5cqw") : ""}<div class="nm" style="margin-top:1cqw">${b.ongNume}</div><div class="det" style="margin-top:.8cqw">${detaliiSir(b)}</div></div><div class="box"><small>Nr. înregistrare</small><b class="nr">${b.nr || "—"}</b><small style="margin-top:.8em">Data</small><b>${b.locData}</b></div></div><div class="ft">${b.dest ? `<div class="dest">${b.dest}</div>` : ""}${b.subiect}${b.sal}${b.corp}${b.fin}${semn}${b.ps}${b.anexe}</div></div>`);
}

function postal(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.po{font-family:${SANS};padding:0}.po .tick{position:absolute;left:0;width:3.4cqw;height:.14cqw;background:var(--m);opacity:.55}.po .cap{position:absolute;left:11cqw;right:9cqw;top:6cqw;display:flex;justify-content:space-between;align-items:center;gap:3cqw}.po .nm{font-size:1.5em;font-weight:800;color:var(--b)}.po .win{position:absolute;left:11cqw;top:28cqw;width:42cqw;font-size:1.02em;line-height:1.5}.po .win small{display:block;font-size:.66em;color:var(--m);border-bottom:.1cqw solid var(--l);padding-bottom:.4cqw;margin-bottom:.8cqw}.po .ldata{position:absolute;right:9cqw;top:28cqw;text-align:right;font-size:.92em;color:var(--m)}.po .cont{padding:62cqw 9cqw 5cqw 11cqw;flex:1}.po .dest,.po .dr{display:none}.po .pie{padding:0 9cqw 4cqw 11cqw;font-size:.76em;color:var(--m)}`;
  return S(d, css, `<div class="pag po"><span class="tick" style="top:47.1cqw"></span><span class="tick" style="top:70.7cqw;width:2cqw"></span><div class="cap"><div>${d.logoOng ? b.logoOng("4.8cqw") : `<div class="nm">${b.ongNume}</div>`}</div><div class="det" style="text-align:right">${b.detalii.join("<br>")}</div></div><div class="win"><small>${b.ongNume}${b.detalii[0] ? ` · ${b.detalii[0]}` : ""}</small>${b.dest}</div><div class="ldata">${b.locData}<br>${b.nr}</div><div class="cont">${trupul(b, false)}</div><div class="pie">${b.ongNume}</div></div>`);
}

function cald(d: DateScrisoare): string {
  const b = bucati(d);
  const css = `.cd{background:var(--c);padding:3.4cqw;font-family:${SERIF}}.cd .card{background:#fff;border-radius:2.6cqw;padding:6cqw 8cqw 5cqw;flex:1;display:flex;flex-direction:column;box-shadow:0 .4cqw 2cqw rgba(35,31,32,.07)}.cd .cap{display:flex;align-items:center;gap:2.4cqw;margin-bottom:1cqw}.cd .ic{width:5cqw;flex:none}.cd .nm{font-size:1.8em;font-weight:700;color:var(--b)}.cd .ecg{height:3.6cqw;color:var(--a);margin:1cqw 0 4cqw}.cd .semn b{font-size:2.2em;color:var(--a)}.cd .pie{font-size:.78em;color:var(--m);margin-top:2.4cqw;text-align:center}`;
  return S(d, css, `<div class="pag cd"><div class="card"><div class="cap">${d.logoOng ? b.logoOng("5.4cqw") : `<div class="ic">${inimaPuls("c1")}</div>`}<div class="nm">${b.ongNume}</div></div><div class="ecg">${linieEcg("currentColor", 0.5)}</div><div class="ft">${trupul(b)}</div><div class="pie">${detaliiSir(b)}</div></div></div>`);
}

export function randeazaScrisoare(d: DateScrisoare, model: ModelScrisoare = d.model): string {
  switch (model) {
    case "modern": return modern(d);
    case "banda": return banda(d);
    case "elegant": return elegant(d);
    case "executiv": return executiv(d);
    case "lateral": return lateral(d);
    case "minimal": return minimal(d);
    case "corporate": return corporate(d);
    case "inima": return inima(d);
    case "colt": return colt(d);
    case "dublu-logo": return dubluLogo(d);
    case "memo": return memo(d);
    case "registru": return registru(d);
    case "postal": return postal(d);
    case "cald": return cald(d);
    default: return clasic(d);
  }
}
