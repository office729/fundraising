// Cele 15 modele de certificat. Fiecare întoarce un document HTML complet (A4 peisaj, două modele portret), cu dimensiuni în cqw
// ca să se micșoreze fără deformare pe orice ecran și la tipărire.
import { A4_PEISAJ, A4_PORTRET, docShell, esc, inimaPuls, linieEcg, logoImg, SERIF, SANS, SANS_SVG } from "./documente-comun";
import { linieCertificat, motivCertificat, type DateCertificat, type ModelCertificat } from "./certificate";
import { dataLunga } from "./raport-impact";

function mareaNume(n: string, baza = 3.8): string {
  const l = n.length;
  const f = l <= 16 ? 1 : l <= 26 ? 0.8 : l <= 40 ? 0.62 : 0.5;
  return `${(baza * f).toFixed(2)}em`;
}

function bucati(d: DateCertificat) {
  const sem = [
    { nume: d.semn1Nume, functie: d.semn1Functie },
    { nume: d.semn2Nume, functie: d.semn2Functie },
  ].filter((s) => s.nume || s.functie);
  return {
    titlu: esc(d.titlu || "Certificat"),
    intro: d.introducere ? linieCertificat(d.introducere, d) : "",
    nume: esc(d.destinatar || "Numele destinatarului"),
    marimeNume: (baza?: number) => mareaNume(d.destinatar || "Numele destinatarului", baza),
    motiv: motivCertificat(d).map((p) => `<p>${p}</p>`).join(""),
    detaliu: d.detaliu ? `<div class="det">${esc(d.detaliu)}</div>` : "",
    citat: d.citat ? `<div class="cit">„${esc(d.citat)}”</div>` : "",
    locData: `${d.loc ? `${esc(d.loc)}, ` : ""}${esc(dataLunga(d.data))}`,
    nr: d.nrCertificat ? esc(d.nrCertificat) : "",
    ong: esc(d.antetNume || "Organizația"),
    sem: sem.map((s) => ({ nume: esc(s.nume), functie: esc(s.functie) })),
    logoOng: (h: string) => logoImg(d.logoOng, d.antetNume, h),
    logoDest: (h: string) => logoImg(d.logoDestinatar, d.destinatar, h),
  };
}
type B = ReturnType<typeof bucati>;

const semnaturi = (b: B) => (b.sem.length ? `<div class="sgn">${b.sem.map((s) => `<div class="s"><div class="ln"></div>${s.nume ? `<b>${s.nume}</b>` : ""}${s.functie ? `<span>${s.functie}</span>` : ""}</div>`).join("")}</div>` : "");
const meta = (b: B) => `<div class="meta">${b.locData}${b.nr ? ` · ${b.nr}` : ""}</div>`;

// Sigiliu rotund cu numele organizației pe cerc și o inimă în mijloc.
function sigiliu(d: DateCertificat, id: string, marime = "11cqw"): string {
  const t = esc((d.antetNume || "Organizația").toUpperCase().slice(0, 26));
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Sigiliu" style="width:${marime};height:${marime};display:block"><defs><path id="${id}p" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0"/><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a)"/><stop offset="1" stop-color="var(--b)"/></linearGradient></defs><circle cx="60" cy="60" r="57" fill="url(#${id}g)"/><circle cx="60" cy="60" r="52" fill="none" stroke="#fff" stroke-opacity=".6"/><circle cx="60" cy="60" r="31" fill="none" stroke="#fff" stroke-opacity=".6"/><text font-size="9.5" letter-spacing="2.4" fill="#fff" font-family="${SANS_SVG}" font-weight="700"><textPath href="#${id}p">${t} · ${t.length < 14 ? t + " · " : ""}</textPath></text><path d="M60 78 46 64c-5-5-4-13 2-16 5-2 9 0 12 4 3-4 7-6 12-4 6 3 7 11 2 16z" fill="#fff"/></svg>`;
}

const colt = (stil: string, id: string) => `<svg viewBox="0 0 80 80" style="position:absolute;width:7cqw;height:7cqw;${stil}" aria-hidden="true"><path d="M4 4h46M4 4v46" stroke="var(--a)" stroke-width="3" fill="none"/><path d="M14 14h26M14 14v26" stroke="var(--a)" stroke-width="1.2" fill="none"/><circle cx="24" cy="24" r="4" fill="var(--a)"/><title>${id}</title></svg>`;

const COMUN = `.pag{aspect-ratio:297/210;display:flex;flex-direction:column}
.sgn{display:flex;gap:6cqw;justify-content:center;align-items:flex-end}.sgn .s{min-width:19cqw;text-align:center}.sgn .ln{height:.12cqw;background:var(--t);opacity:.65;margin-bottom:.7cqw}.sgn b{display:block;font-family:${SERIF};font-style:italic;font-weight:400;font-size:1.25em;line-height:1.2}.sgn span{display:block;font-size:.76em;color:var(--m)}
.mot p{margin:0 auto .45em;max-width:56cqw}.det{font-size:.95em;font-weight:700;color:var(--a);letter-spacing:.05em}.cit{font-style:italic;color:var(--m);font-size:.95em}.meta{font-size:.76em;color:var(--m);letter-spacing:.06em}
.tit{text-transform:uppercase;letter-spacing:.34em;font-weight:700}.nume{font-family:${SERIF};font-style:italic;font-weight:400;line-height:1.1;overflow-wrap:anywhere;text-wrap:balance}`;

const P = (d: DateCertificat, css: string, corp: string, portret = false) => docShell(`Certificat — ${d.destinatar || "document"}`, d, COMUN + css, corp, portret ? A4_PORTRET : A4_PEISAJ);

function clasic(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.c1{padding:2.6cqw;font-family:${SERIF}}.c1 .r1{flex:1;border:.35cqw solid var(--a);padding:.7cqw;display:flex}.c1 .r2{flex:1;border:.12cqw solid var(--a);padding:2.6cqw 6cqw 2.4cqw;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;background:radial-gradient(circle at 50% 0,var(--ab),#fff 62%);gap:.6cqw}.c1 .tit{color:var(--b);font-size:1.05em;margin-top:.8cqw}.c1 .orn{color:var(--a);display:flex;align-items:center;gap:1.4cqw}.c1 .orn:before,.c1 .orn:after{content:"";width:9cqw;height:.1cqw;background:var(--a);opacity:.5}.c1 .intro{font-style:italic;color:var(--m);font-size:1.1em}.c1 .nume{color:var(--b)}.c1 .jos{margin-top:auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:3cqw;width:100%}.c1 .jos .sgn{gap:3cqw}.c1 .jos .sgn .s{min-width:15cqw}`;
  return P(d, css, `<div class="pag c1"><div class="r1"><div class="r2">${colt("left:1.2cqw;top:1.2cqw", "c1")}${colt("right:1.2cqw;top:1.2cqw;transform:scaleX(-1)", "c2")}${colt("left:1.2cqw;bottom:1.2cqw;transform:scaleY(-1)", "c3")}${colt("right:1.2cqw;bottom:1.2cqw;transform:scale(-1,-1)", "c4")}
${b.logoOng("5cqw")}<div class="tit">${b.titlu}</div><div class="orn"><svg viewBox="0 0 24 24" fill="currentColor" style="width:1.8cqw;height:1.8cqw"><path d="M12 21 4.6 13.4A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 7.4 6.6z"/></svg></div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume()}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}
<div class="jos"><div>${b.sem[0] ? semnaturi({ ...b, sem: [b.sem[0]] }) : ""}</div>${sigiliu(d, "s1")}<div>${b.sem[1] ? semnaturi({ ...b, sem: [b.sem[1]] }) : meta(b)}</div></div></div></div></div>`);
}

function modern(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.m1{flex-direction:row;font-family:${SANS}}.m1 .bl{width:5.5cqw;background:linear-gradient(var(--a),var(--b))}.m1 .cn{flex:1;padding:5cqw 7cqw 3.6cqw;display:flex;flex-direction:column}.m1 .cap{display:flex;justify-content:space-between;align-items:center}.m1 .tit{color:var(--a);font-size:1em;margin-top:5cqw}.m1 .intro{color:var(--m);margin-top:1cqw}.m1 .nume{font-family:${SANS};font-style:normal;font-weight:800;letter-spacing:-.03em;color:var(--b);margin:.8cqw 0 1.4cqw}.m1 .mot p{margin:0 0 .45em;max-width:54cqw}.m1 .jos{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:3cqw}.m1 .sgn{justify-content:flex-start;gap:5cqw}`;
  return P(d, css, `<div class="pag m1"><div class="bl"></div><div class="cn"><div class="cap">${b.logoOng("5cqw") || `<b>${b.ong}</b>`}${meta(b)}</div><div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(4.2)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}<div class="jos">${semnaturi(b)}${sigiliu(d, "s2", "10cqw")}</div></div></div>`);
}

function gala(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.g1{padding:2cqw;background:linear-gradient(135deg,var(--a),var(--b));font-family:${SERIF}}.g1 .in{flex:1;background:radial-gradient(circle at 50% 30%,#fff,var(--ab));border-radius:1.2cqw;display:flex;flex-direction:column;align-items:center;text-align:center;padding:3cqw 6cqw 2.6cqw;gap:.7cqw;box-shadow:inset 0 0 0 .3cqw var(--c)}.g1 .tit{color:var(--a);font-size:1.15em}.g1 .intro{font-style:italic;color:var(--m);font-size:1.1em}.g1 .nume{color:var(--b);font-size:${b.marimeNume(4)}}.g1 .jos{margin-top:auto;display:flex;align-items:flex-end;justify-content:center;gap:5cqw;width:100%}.g1 .jos .sgn{gap:4cqw}`;
  return P(d, css, `<div class="pag g1"><div class="in">${b.logoOng("5cqw")}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}${sigiliu(d, "s3")}</div>${meta(b)}</div></div>`);
}

function geometric(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.ge{background:#fff;font-family:${SANS}}.ge .t1{position:absolute;left:0;top:0;width:24cqw;height:24cqw;background:var(--a);clip-path:polygon(0 0,100% 0,0 100%)}.ge .t2{position:absolute;left:0;top:0;width:14cqw;height:14cqw;background:var(--b);clip-path:polygon(0 0,100% 0,0 100%)}.ge .t3{position:absolute;right:0;bottom:0;width:24cqw;height:24cqw;background:var(--a);clip-path:polygon(100% 0,100% 100%,0 100%)}.ge .t4{position:absolute;right:0;bottom:0;width:14cqw;height:14cqw;background:var(--b);clip-path:polygon(100% 0,100% 100%,0 100%)}.ge .t5{position:absolute;right:0;top:0;width:10cqw;height:10cqw;background:var(--c);clip-path:polygon(0 0,100% 0,100% 100%)}.ge .t6{position:absolute;left:0;bottom:0;width:10cqw;height:10cqw;background:var(--c);clip-path:polygon(0 0,0 100%,100% 100%)}.ge .cn{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:4cqw 14cqw 3.4cqw;gap:.8cqw}.ge .tit{color:var(--a);font-size:1.15em}.ge .intro{color:var(--m)}.ge .nume{font-family:${SANS};font-style:normal;font-weight:800;letter-spacing:-.025em;color:var(--b)}.ge .jos{margin-top:auto;width:100%;display:flex;justify-content:center;align-items:flex-end;gap:4cqw}`;
  return P(d, css, `<div class="pag ge"><span class="t1"></span><span class="t2"></span><span class="t3"></span><span class="t4"></span><span class="t5"></span><span class="t6"></span><div class="cn">${b.logoOng("5cqw")}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(3.8)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}<div class="jos">${semnaturi(b)}</div>${meta(b)}</div></div>`);
}

function inima(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.i1{font-family:${SERIF};background:#fff}.i1 .wm{position:absolute;right:-6cqw;top:50%;transform:translateY(-50%);width:50cqw;opacity:.08}.i1 .cn{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:3.6cqw 8cqw 3cqw;gap:.7cqw}.i1 .tit{color:var(--b);font-size:1.1em}.i1 .intro{font-style:italic;color:var(--m)}.i1 .nume{color:var(--a)}.i1 .ecg{width:46cqw;height:5cqw;color:var(--a);margin:-.2cqw 0 .4cqw}.i1 .jos{margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end;gap:3cqw}.i1 .ic{width:6cqw}`;
  return P(d, css, `<div class="pag i1"><div class="wm">${inimaPuls("i1w")}</div><div class="cn">${b.logoOng("5cqw") || `<div class="ic">${inimaPuls("i1i")}</div>`}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(4)}">${b.nume}</div><div class="ecg">${linieEcg("currentColor", 0.7)}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi({ ...b, sem: b.sem.slice(0, 1) })}${sigiliu(d, "s5", "10cqw")}${b.sem[1] ? semnaturi({ ...b, sem: [b.sem[1]] }) : meta(b)}</div></div></div>`);
}

function banda(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.bn{flex-direction:row;font-family:${SERIF}}.bn .st{width:27cqw;background:linear-gradient(170deg,var(--a),var(--b));color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4cqw 2cqw;text-align:center}.bn .st .lg{background:#fff;border-radius:.8cqw;padding:.9cqw 1.4cqw}.bn .st .meta{color:#fff;opacity:.85}.bn .cn{flex:1;padding:5cqw 7cqw 3.6cqw;display:flex;flex-direction:column;gap:.8cqw}.bn .tit{color:var(--a);font-size:1.05em}.bn .intro{font-style:italic;color:var(--m)}.bn .nume{color:var(--b);margin:.6cqw 0}.bn .mot p{margin:0 0 .45em;max-width:48cqw}.bn .jos{margin-top:auto}.bn .sgn{justify-content:flex-start;gap:4cqw}`;
  return P(d, css, `<div class="pag bn"><div class="st">${b.logoOng("5cqw") ? `<div class="lg">${b.logoOng("5cqw")}</div>` : `<b style="font-size:1.2em">${b.ong}</b>`}${sigiliu(d, "s6", "13cqw")}${meta(b)}</div><div class="cn"><div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(3.8)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}</div></div></div>`);
}

function diploma(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.pag{aspect-ratio:210/297}.dp{font-family:${SERIF};padding:3cqw}.dp .ram{flex:1;border:.5cqw solid var(--a);outline:.15cqw solid var(--a);outline-offset:-1.3cqw;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 7cqw 5cqw;position:relative;background:radial-gradient(circle at 50% 0,var(--ab),#fff 55%)}.dp .pnz{margin:0 0 5cqw;background:linear-gradient(135deg,var(--a),var(--b));color:#fff;padding:3cqw 9cqw 4.2cqw;clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%)}.dp .pnz .tit{font-size:1.1em;color:#fff}.dp .intro{font-style:italic;color:var(--m);font-size:1.15em}.dp .nume{color:var(--b);margin:2cqw 0 3cqw}.dp .mot p{max-width:none}.dp .jos{margin-top:auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:4cqw}.dp .sgn{gap:5cqw}`;
  return P(d, css, `<div class="pag dp"><div class="ram"><div class="pnz"><div class="tit">${b.titlu}</div></div>${b.logoOng("7cqw")}<div class="intro" style="margin-top:3cqw">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(5)}">${b.nume}</div><div class="mot" style="font-size:1.05em">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${sigiliu(d, "s7", "17cqw")}${semnaturi(b)}${meta(b)}</div></div></div>`, true);
}

function panglica(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.pn{font-family:${SERIF};background:var(--ab);padding:3cqw}.pn .cd{flex:1;background:#fff;border-radius:1cqw;box-shadow:0 0 0 .2cqw var(--a);display:flex;flex-direction:column;align-items:center;text-align:center;padding:3cqw 7cqw 2.6cqw;gap:.7cqw}.pn .rb{position:relative;background:linear-gradient(90deg,var(--b),var(--a),var(--b));color:#fff;padding:1.4cqw 7cqw;margin:1cqw -12cqw 1cqw}.pn .rb:before,.pn .rb:after{content:"";position:absolute;top:1.4cqw;width:3cqw;height:100%;background:var(--b);z-index:-1}.pn .rb:before{left:-2cqw;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,30% 50%)}.pn .rb:after{right:-2cqw;clip-path:polygon(0 0,100% 0,70% 50%,100% 100%,0 100%)}.pn .rb .tit{font-size:1.15em;color:#fff}.pn .intro{font-style:italic;color:var(--m);margin-top:1cqw}.pn .nume{color:var(--b)}.pn .jos{margin-top:auto;display:flex;align-items:flex-end;justify-content:center;gap:5cqw;width:100%}`;
  return P(d, css, `<div class="pag pn"><div class="cd">${b.logoOng("5cqw")}<div class="rb"><div class="tit">${b.titlu}</div></div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(3.8)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}<div class="jos">${semnaturi(b)}${sigiliu(d, "s8", "10cqw")}</div>${meta(b)}</div></div>`);
}

function acuarela(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.ac{font-family:${SERIF};background:#fffdfc;background-image:radial-gradient(ellipse 34cqw 24cqw at 12% 18%,color-mix(in srgb,var(--a) 22%,transparent),transparent 70%),radial-gradient(ellipse 30cqw 22cqw at 90% 12%,color-mix(in srgb,var(--b) 18%,transparent),transparent 70%),radial-gradient(ellipse 36cqw 26cqw at 88% 92%,color-mix(in srgb,var(--a) 20%,transparent),transparent 70%),radial-gradient(ellipse 28cqw 20cqw at 8% 90%,color-mix(in srgb,var(--c) 90%,transparent),transparent 70%)}.ac .cn{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:4cqw 9cqw 3.4cqw;gap:.8cqw}.ac .tit{color:var(--b);font-size:1.05em}.ac .intro{font-style:italic;color:var(--m);font-size:1.12em}.ac .nume{color:var(--a)}.ac .jos{margin-top:auto;width:100%;display:flex;justify-content:center;align-items:flex-end;gap:5cqw}`;
  return P(d, css, `<div class="pag ac"><div class="cn">${b.logoOng("5cqw")}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(4.2)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}</div>${meta(b)}</div></div>`);
}

function tipografic(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.tp{font-family:${SANS};padding:4.5cqw 6cqw 3.6cqw;background:#fff}.tp .cap{display:flex;justify-content:space-between;align-items:center;border-bottom:.3cqw solid var(--t);padding-bottom:1.4cqw}.tp .tit{font-size:1em;color:var(--a)}.tp .mid{flex:1;display:flex;flex-direction:column;justify-content:center}.tp .intro{color:var(--m);font-size:1.1em}.tp .nume{font-family:${SANS};font-style:normal;font-weight:900;letter-spacing:-.05em;line-height:.95;color:var(--b);text-wrap:balance}.tp .mot p{margin:.5em 0 0;max-width:62cqw;font-size:1.05em}.tp .jos{display:flex;justify-content:space-between;align-items:flex-end;gap:3cqw;border-top:.12cqw solid var(--l);padding-top:1.6cqw}.tp .sgn{justify-content:flex-start;gap:5cqw}`;
  return P(d, css, `<div class="pag tp"><div class="cap">${b.logoOng("4.4cqw") || `<b>${b.ong}</b>`}<div class="tit">${b.titlu}</div></div><div class="mid"><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(8)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}</div><div class="jos">${semnaturi(b)}${meta(b)}</div></div>`);
}

function medalion(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.md{flex-direction:row;font-family:${SERIF};background:#fff}.md .rz{width:34cqw;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(from 0deg at 50% 50%,var(--c) 0 6deg,#fff 6deg 12deg);position:relative}.md .rz:after{content:"";position:absolute;inset:0;background:radial-gradient(circle,transparent 30%,#fff 72%)}.md .rz>*{position:relative;z-index:1}.md .cn{flex:1;padding:5cqw 8cqw 3.6cqw 2cqw;display:flex;flex-direction:column;gap:.8cqw}.md .tit{color:var(--a);font-size:1.05em}.md .intro{font-style:italic;color:var(--m)}.md .nume{color:var(--b);margin:.5cqw 0}.md .mot p{margin:0 0 .45em;max-width:46cqw}.md .jos{margin-top:auto}.md .sgn{justify-content:flex-start;gap:4cqw}`;
  return P(d, css, `<div class="pag md"><div class="rz">${sigiliu(d, "s11", "26cqw")}</div><div class="cn"><div style="display:flex;justify-content:space-between;align-items:center">${b.logoOng("4.4cqw") || `<b>${b.ong}</b>`}${meta(b)}</div><div class="tit" style="margin-top:3cqw">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(3.6)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}</div></div></div>`);
}

function puls(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.pu{font-family:${SANS};background:#fff;padding:4cqw 8cqw 3.4cqw;align-items:center;text-align:center;gap:.8cqw}.pu .tit{color:var(--a);font-size:1em}.pu .intro{color:var(--m)}.pu .nume{font-family:${SERIF};color:var(--b)}.pu .ecg{width:100%;height:7cqw;color:var(--a);margin:.2cqw 0 .6cqw}.pu .jos{margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end}.pu .sgn{justify-content:flex-start;gap:5cqw}`;
  return P(d, css, `<div class="pag pu">${b.logoOng("4.6cqw")}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(4.2)}">${b.nume}</div><div class="ecg">${linieEcg("currentColor", 0.8)}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}${meta(b)}</div></div>`);
}

function cadruDublu(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.cb{font-family:${SERIF};background:#fff;padding:2.6cqw}.cb .r1{flex:1;border:.25cqw solid var(--b);padding:.9cqw;display:flex}.cb .r2{flex:1;border:.1cqw solid var(--b);display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}.cb .gil{width:100%;height:5cqw;background:repeating-linear-gradient(135deg,var(--b) 0 .35cqw,transparent .35cqw .9cqw),repeating-linear-gradient(45deg,var(--a) 0 .2cqw,transparent .2cqw .9cqw);opacity:.85;border-bottom:.2cqw solid var(--b)}.cb .cn{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;gap:.7cqw;padding:2.2cqw 8cqw 2.4cqw}.cb .tit{color:var(--b);font-size:1.05em}.cb .intro{font-style:italic;color:var(--m)}.cb .nume{color:var(--a)}.cb .jos{margin-top:auto;width:100%;display:flex;justify-content:center;align-items:flex-end;gap:5cqw}`;
  return P(d, css, `<div class="pag cb"><div class="r1"><div class="r2"><div class="gil"></div><div class="cn">${b.logoOng("4.6cqw")}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(3.6)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}<div class="jos">${semnaturi(b)}${sigiliu(d, "s13", "9.5cqw")}</div>${meta(b)}</div></div></div></div>`);
}

function intunecat(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.in2{font-family:${SERIF};background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--b) 70%,#000),color-mix(in srgb,var(--b) 40%,#000) 80%);color:#f7efe9;padding:3cqw}.in2 .r{flex:1;border:.2cqw solid var(--a);outline:.1cqw solid color-mix(in srgb,var(--a) 50%,transparent);outline-offset:.8cqw;display:flex;flex-direction:column;align-items:center;text-align:center;padding:3cqw 8cqw 2.6cqw;gap:.7cqw}.in2 .tit{color:color-mix(in srgb,var(--a) 55%,#fff);font-size:1.1em}.in2 .intro{font-style:italic;opacity:.8}.in2 .nume{color:#fff}.in2 .det{color:color-mix(in srgb,var(--a) 55%,#fff)}.in2 .cit,.in2 .meta,.in2 .sgn span{color:#d8cdc6}.in2 .sgn .ln{background:#f7efe9}.in2 .sgn b{color:#fff}.in2 .jos{margin-top:auto;width:100%;display:flex;justify-content:center;align-items:flex-end;gap:5cqw}.in2 .lg{background:#fff;border-radius:.8cqw;padding:.8cqw 1.4cqw}`;
  return P(d, css, `<div class="pag in2"><div class="r">${d.logoOng ? `<div class="lg">${b.logoOng("4.4cqw")}</div>` : ""}<div class="tit">${b.titlu}</div><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(4)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}${sigiliu(d, "s14", "10cqw")}</div>${meta(b)}</div></div>`);
}

function poster(d: DateCertificat): string {
  const b = bucati(d);
  const css = `.pag{aspect-ratio:210/297}.ps{font-family:${SANS};background:#fff}.ps .top{height:34cqw;background:linear-gradient(160deg,var(--a),var(--b));color:#fff;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6cqw;text-align:center;padding:0 8cqw}.ps .top .lg{background:#fff;border-radius:1cqw;padding:1cqw 1.8cqw}.ps .top .tit{color:#fff;font-size:1.15em}.ps .seal{position:absolute;left:50%;bottom:-9cqw;transform:translateX(-50%);box-shadow:0 0 0 1cqw #fff;border-radius:50%}.ps .cn{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:13cqw 10cqw 5cqw;gap:1.2cqw}.ps .intro{color:var(--m);font-size:1.1em}.ps .nume{font-family:${SERIF};color:var(--b)}.ps .mot p{max-width:none;font-size:1.05em}.ps .jos{margin-top:auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:3cqw}`;
  return P(d, css, `<div class="pag ps"><div class="top">${d.logoOng ? `<div class="lg">${b.logoOng("6cqw")}</div>` : `<b style="font-size:1.4em">${b.ong}</b>`}<div class="tit">${b.titlu}</div><div class="seal">${sigiliu(d, "s15", "18cqw")}</div></div><div class="cn"><div class="intro">${b.intro}</div><div class="nume" style="font-size:${b.marimeNume(5)}">${b.nume}</div><div class="mot">${b.motiv}</div>${b.detaliu}${b.citat}<div class="jos">${semnaturi(b)}${meta(b)}</div></div></div>`, true);
}

export function randeazaCertificat(d: DateCertificat, model: ModelCertificat = d.model): string {
  switch (model) {
    case "modern": return modern(d);
    case "gala": return gala(d);
    case "geometric": return geometric(d);
    case "inima": return inima(d);
    case "banda": return banda(d);
    case "diploma": return diploma(d);
    case "panglica": return panglica(d);
    case "acuarela": return acuarela(d);
    case "tipografic": return tipografic(d);
    case "medalion": return medalion(d);
    case "puls": return puls(d);
    case "cadru-dublu": return cadruDublu(d);
    case "intunecat": return intunecat(d);
    case "poster": return poster(d);
    default: return clasic(d);
  }
}
