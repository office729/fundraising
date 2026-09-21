// Contract de sponsorizare — două formate (D177 și 20%), portat 1:1 din CRM PJ
// (src/modules/crm/crm-pj/crm-pj.base.html, buildContract) ca să producă exact același document.
// Fără semnătură electronică: se descarcă Word sau se tipărește PDF, iar semnarea se face în afara platformei.

export type ContractTip = "d177" | "mec20";

export type ContractVals = {
  nume: string;
  sediu: string;
  judet: string;
  cui: string;
  reg: string;
  rep: string;
  fct: string;
  iban: string;
  banca: string;
  suma: string;
  nr: string;
  data: string;
  caz: string;
  resp: string;
};

// Datele beneficiarului (ONG-ul) — aceleași câmpuri ca în config-ul CRM PJ.
export type OngConfig = Record<string, string | undefined>;

export const ONG_CAMPURI: { key: string; label: string }[] = [
  { key: "ongNume", label: "Denumire ONG" },
  { key: "ongSediu", label: "Sediu social" },
  { key: "ongCif", label: "CIF" },
  { key: "ongInregistrare", label: "Înregistrare (ex. nr. în registrul asociațiilor)" },
  { key: "ongIban", label: "IBAN" },
  { key: "ongBanca", label: "Banca" },
  { key: "ongReprezentant", label: "Reprezentant legal" },
  { key: "ongFunctie", label: "Funcția reprezentantului" },
  { key: "ongEmail", label: "Email (GDPR)" },
  { key: "ongSite", label: "Site" },
];

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function d177Deadline(): string {const y=new Date().getFullYear();const d=new Date(y,5,25);return d<new Date()?("25.06."+(y+1)):("25.06."+y);}
export function buildContract(v: ContractVals, tip: ContractTip, config: OngConfig): string {
 const g = (x: unknown) =>(x!=null&&(""+x).trim())?escHtml(""+x):"____";
 const og = (k: string) => g(config[k]);
 const gsuma = (x: unknown) =>{const n=(""+(x==null?"":x)).replace(/[^\d]/g,"");return n?Number(n).toLocaleString("ro-RO"):"____";};
 const sediu=(v.judet&&(""+v.judet).trim())?(g(v.sediu)+", jud. "+g(v.judet)):g(v.sediu);
 const dt=(v.data&&/^\d{4}-\d{2}-\d{2}$/.test(v.data))?v.data.split("-").reverse().join("."):g(v.data);
 const foot=`<p style="font-size:9pt;color:#666;margin-top:22px">Format: ${tip==="d177"?"D177 — redirecţionare impozit pe profit":"20% — sponsorizare directă"}${(v.caz&&v.caz.trim())?" · Caz asociat: "+g(v.caz):""}${(v.resp&&v.resp.trim())?" · Responsabil: "+g(v.resp):""}</p>`;
 const H=`<div style="text-align:center;margin-bottom:18px"><div style="font-size:16pt;font-weight:bold;letter-spacing:1px">CONTRACT DE SPONSORIZARE</div>${tip==="d177"?`<div style="font-size:11pt;margin-top:4px">Nr. ${g(v.nr)} / ${dt}</div>`:``}</div>`;
 const semn=`<table style="width:100%;margin-top:34px"><tr><td style="text-align:center;width:50%;vertical-align:top">SPONSOR<br><br><br>${g(v.nume)}<br>${g(v.rep)}<br>${g(v.fct)}</td><td style="text-align:center;width:50%;vertical-align:top">BENEFICIAR<br><br><br>${g(config.ongNume)}<br>${g(config.ongReprezentant)}<br>${g(config.ongFunctie)}</td></tr></table>`;
 let b: string;
 if(tip==="d177"){
  b=`<p><b>I. PĂRŢILE CONTRACTANTE</b></p>
<p><b>1.1.</b> ${g(v.nume)}, cu sediul în ${sediu}, C.I.F. ${g(v.cui)}, înregistrată la Oficiul Registrului Comerţului sub nr. ${g(v.reg)}, având contul IBAN ${g(v.iban)}, deschis la Banca ${g(v.banca)}, reprezentată de ${g(v.rep)}, cu funcţia de ${g(v.fct)}, în calitate de <b>Sponsor</b>, pe de o parte,</p>
<p>şi</p>
<p><b>1.2.</b> ${og("ongNume")}, cu sediul social în ${og("ongSediu")}, cod de identificare fiscală ${og("ongCif")}, cu contul în lei ${og("ongIban")}, deschis la ${og("ongBanca")}${config.ongInregistrare?", "+g(config.ongInregistrare):""}, reprezentată legal la data semnării de către ${og("ongReprezentant")}, ${og("ongFunctie")}, în calitate de <b>Beneficiar</b> al sponsorizării, pe de altă parte, au convenit să încheie prezentul contract de sponsorizare, cu respectarea următoarelor clauze:</p>
<p><b>II. OBIECTUL CONTRACTULUI</b></p>
<p><b>2.1.</b> În vederea sprijinirii generale a activităţilor desfăşurate de ${og("ongNume")}. Sponsorul pune la dispoziţia Beneficiarului, în condiţiile Ordinului 1679/2022, prin Declaraţia 177 cu modificările aduse prin OG 115/2023 şi la termenele prevăzute de aceasta, o sponsorizare în bani în valoare de <b>${gsuma(v.suma)} RON</b>.</p>
<p><b>III. OBLIGAŢIILE PĂRŢILOR</b></p>
<p><b>3.1.</b> Suma aferentă sponsorizării va fi direcţionată de către ANAF în contul Beneficiarului: ${og("ongIban")}, deschis la ${og("ongBanca")}. Pentru ca ANAF să poată efectua transferul, Sponsorul are obligaţia de a completa şi depune Declaraţia Fiscală 177 până la data de ${d177Deadline()}.</p>
<p><b>3.2.</b> Beneficiarul va informa publicul despre contribuţia sponsorului prin menţionarea numelui acestuia şi a valorii sponsorizate${config.ongSite?" pe "+og("ongSite"):""}.</p>
<p><b>3.3.</b> Orice acţiune de comunicare publică, inclusiv anunţarea sponsorizării pe site-ul propriu sau prin alte canale media, va conţine denumirea proiectului şi informaţii relevante despre Beneficiar. În acest context, Sponsorul se angajează să colaboreze cu Beneficiarul pentru aprobarea în prealabil a conţinutului materialelor de promovare şi a canalelor de distribuţie utilizate.</p>
<p><b>3.4.</b> ${og("ongNume")} îşi desfăşoară activitatea transparent, utilizând sumele primite exclusiv în scopul pentru care au fost destinate. Beneficiarul se obligă să informeze periodic Sponsorul cu privire la folosirea fondurilor, acesta având dreptul să verifice dacă sponsorizarea a fost utilizată conform obiectivelor proiectului.</p>
<p><b>3.5.</b> Sponsorul se angajează să nu influenţeze, direct sau indirect, activitatea Beneficiarului, respectând independenţa acestuia în gestionarea proiectelor umanitare.</p>
<p><b>3.6.</b> Sponsorizarea va fi comunicată public într-un mod care să protejeze reputaţia proiectului susţinut, respectând valorile morale şi evitând orice prejudiciu de imagine.</p>
<p><b>3.7.</b> Beneficiarul va prezenta Sponsorului un raport de activitate detaliat cel puţin o dată pe an, pentru a asigura transparenţa şi încrederea între părţi.</p>
<p><b>IV. DURATA CONTRACTULUI</b></p>
<p><b>4.1.</b> Prezentul contract de sponsorizare intră în vigoare la data semnării şi îşi menţine valabilitatea până la finalizarea proiectului umanitar pentru care a fost încheiat.</p>
<p><b>V. ÎNCETAREA CONTRACTULUI</b></p>
<p><b>5.1.</b> Contractul încetează automat, fără intervenţia instanţelor, dacă una dintre părţi nu respectă o obligaţie esenţială, este declarată insolventă, cesionează drepturile fără acord, sau continuă să încalce obligaţiile în ciuda unui avertisment oficial.</p>
<p><b>5.2.</b> Rezilierea contractului nu afectează obligaţiile deja asumate şi scadente între părţi.</p>
<p><b>VI. FORŢA MAJORĂ</b></p>
<p><b>6.1.</b> Niciuna dintre părţi nu poate fi considerată responsabilă pentru neexecutarea obligaţiilor, dacă aceasta este cauzată de un eveniment de forţă majoră, conform legislaţiei aplicabile. Partea care invocă forţa majoră va notifica cealaltă parte în termen de 3 zile.</p>
<p><b>VII. LITIGII</b></p>
<p><b>7.1.</b> Orice neînţelegeri vor fi soluţionate prin negocieri directe; dacă nu se ajunge la o înţelegere amiabilă, litigiile vor fi soluţionate de către instanţele competente.</p>
<p><b>VIII. CLAUZE FINALE</b></p>
<p><b>8.1.</b> Orice modificare se poate face doar printr-un act adiţional semnat de ambele părţi. Contractul reflectă în totalitate acordul părţilor.</p>${semn}`;
 } else {
  b=`<p><b>I. PĂRŢILE CONTRACTANTE</b></p>
<p><b>1.1.</b> ${g(v.nume)}, cu sediul social în ${sediu}, cu contul bancar ${g(v.iban)}, deschis la ${g(v.banca)}, înregistrată la Oficiul Registrului Comerţului sub nr. ${g(v.reg)}, cod unic de înregistrare ${g(v.cui)}, reprezentată legal la data semnării prezentului contract de ${g(v.rep)}, având funcţia de ${g(v.fct)}, în calitate de <b>SPONSOR</b>,</p>
<p>şi</p>
<p><b>2.1.</b> ${og("ongNume")}, cu sediul social în ${og("ongSediu")}, Cod de identificare fiscală ${og("ongCif")}, cu contul în lei ${og("ongIban")}, deschis la ${og("ongBanca")}, reprezentată legal la data semnării de către ${og("ongReprezentant")} — ${og("ongFunctie")}, în calitate de <b>BENEFICIAR AL SPONSORIZĂRII</b>. Au convenit să încheie prezentul contract în conformitate cu prevederile Legii nr. 32/1994 privind sponsorizarea, Legii nr. 227/2015 (Codul Fiscal), Legii nr. 287/2009 (Codul Civil) şi ale Regulamentului (UE) 2016/679 (GDPR).</p>
<p><b>II. OBIECTUL CONTRACTULUI</b></p>
<p><b>2.1.</b> Obiectul prezentului contract îl constituie sponsorizarea Beneficiarului de către Sponsor în vederea strângerii de fonduri pentru susţinerea activităţilor derulate de ${og("ongNume")}.</p>
<p><b>2.2.</b> În scopul prevăzut la pct. 2.1, Sponsorul se angajează să pună la dispoziţia beneficiarului suma de <b>${gsuma(v.suma)} RON</b>.</p>
<p><b>III. DURATA CONTRACTULUI</b></p>
<p><b>3.1.</b> Prezentul contract intră în vigoare la data semnării sale de către părţile contractante şi este valabil până la îndeplinirea obligaţiilor de către ambele părţi.</p>
<p><b>IV. PREŢUL CONTRACTULUI ŞI MODALITATEA DE PLATĂ</b></p>
<p><b>4.1.</b> Sponsorul va acorda Beneficiarului suma de <b>${gsuma(v.suma)} RON</b>.</p>
<p><b>4.2.</b> Plata se face în Lei, în contul ${og("ongNume")}. Sponsorizarea este unică.</p>
<p><b>V. OBLIGAŢIILE BENEFICIARULUI</b></p>
<p><b>5.1.</b> Beneficiarul se obligă să folosească sumele acordate exclusiv în scopul precizat la art. 2.1. <b>5.2.</b> La solicitarea Sponsorului, Beneficiarul se obligă să informeze despre modul în care au fost utilizate fondurile şi să pună la dispoziţie documente justificative. <b>5.3.</b> Beneficiarul poate aduce la cunoştinţa publicului sponsorizarea prin promovarea numelui, mărcii sau imaginii sponsorului (conform art. 5 din Legea nr. 32/1994). <b>5.4.</b> Beneficiarul va prezenta Sponsorului spre aprobare materialele în care vor fi utilizate însemnele sale.</p>
<p><b>VI. OBLIGAŢIILE SPONSORULUI</b></p>
<p><b>6.1.</b> Sponsorul se obligă să vireze suma precizată la art. 4.1. în contul Beneficiarului, în termen de 30 zile de la semnarea contractului. <b>6.2.</b> Sponsorul poate aduce la cunoştinţa publicului sponsorizarea prin modalităţile pe care le consideră adecvate. <b>6.3.</b> Sponsorul va trimite spre aprobare Beneficiarului, înainte de publicare, materialele care încorporează numele sau sigla Beneficiarului.</p>
<p><b>VII. CESIUNEA CONTRACTULUI</b></p>
<p><b>7.1.</b> Niciuna din părţi nu va cesiona drepturile şi obligaţiile rezultate din acest contract unei terţe persoane.</p>
<p><b>VIII. NOTIFICĂRI</b></p>
<p><b>8.1.</b> Orice notificare adresată de una dintre părţi celeilalte este valabil îndeplinită dacă va fi transmisă la adresa/sediul prevăzut în capitolul I, prin scrisoare recomandată cu confirmare de primire.</p>
<p><b>IX. CONFIDENŢIALITATE</b></p>
<p><b>9.1.</b> O parte contractantă nu are dreptul, fără acordul scris al celeilalte, să facă cunoscut contractul unei terţe părţi sau să utilizeze informaţiile obţinute în alt scop decât îndeplinirea obligaţiilor contractuale.</p>
<p><b>X. PROTECŢIA DATELOR CU CARACTER PERSONAL</b></p>
<p><b>10.1.</b> Părţile au cunoştinţă de dispoziţiile Regulamentului GDPR şi se obligă să le respecte întocmai. Fiecare parte are calitatea de operator de date cu caracter personal. Beneficiarul se obligă să prelucreze datele personale ale reprezentanţilor Sponsorului doar în scopul derulării relaţiei contractuale şi să le şteargă/anonimizeze la solicitarea scrisă (${og("ongEmail")}) sau la încetarea relaţiei, cu excepţiile legale. Obligaţiile privind datele rămân valabile pe durata contractului şi 5 ani după încetare.</p>
<p><b>XI. DISPOZIŢII FINALE</b></p>
<p><b>11.1.</b> Modificarea contractului poate fi făcută numai în scris, prin acordul ambelor părţi. <b>11.2.</b> Orice litigii se vor soluţiona pe cale amiabilă, iar în caz contrar de instanţele judecătoreşti competente. <b>11.3.</b> Forţa majoră exonerează de răspundere conform legii.</p>${semn}`;
 }
 return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Contract sponsorizare</title></head><body style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;text-align:justify;color:#000;max-width:730px;margin:0 auto">${H}${b}${foot}</body></html>`;
}
