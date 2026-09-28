// Chestionarul „Avatarul donatorului perfect" — 100 de întrebări în 10 etape (Small Data Fundraising v3.0).
// Fiecare întrebare are un câmp de răspuns cu un îndemn precis (`prompt`). Textele sunt cele din exportul
// original, ca importul din fișierul .txt să potrivească întrebările după număr.

export type Intrebare = { nr: number; text: string; prompt: string };
export type Etapa = { nr: number; titlu: string; intrebari: Intrebare[] };

const Q = (nr: number, text: string, prompt: string): Intrebare => ({ nr, text, prompt });

export const ETAPE: Etapa[] = [
  {
    nr: 1,
    titlu: "Misiune, impact și diferențiere",
    intrebari: [
      Q(1, "Care este misiunea principală a organizației, exprimată într-o singură propoziție pe care ar înțelege-o un om din afara sectorului ONG?", "Misiunea finală, în maximum 25 de cuvinte"),
      Q(2, "Ce tipuri de beneficiari sprijiniți și care este categoria care primește cea mai mare parte din fonduri?", "Categoria principală și ponderea aproximativă din fonduri"),
      Q(3, "Care sunt cele mai urgente trei nevoi pe care donațiile le rezolvă în mod concret?", "Top 3 nevoi și costul aproximativ al fiecăreia"),
      Q(4, "Ce impact produce o donație de 25, 50, 100, 250 și 500 lei?", "25 lei = …; 50 lei = …; 100 lei = …; 250 lei = …; 500 lei = …"),
      Q(5, "Ce schimbare umană promiteți donatorului că ajută să devină posibilă?", "Schimbarea umană promisă, într-o propoziție"),
      Q(6, "Prin ce este organizația diferită față de alte organizații care lucrează pentru aceeași cauză?", "Diferențiator + dovada aferentă"),
      Q(7, "Care sunt cele mai puternice dovezi de încredere pe care le puteți arăta imediat?", "Linkuri sau locația dovezilor principale"),
      Q(8, "Ce criterii folosiți pentru a accepta un beneficiar, un caz sau un proiect?", "Criteriile obligatorii și documentele cerute"),
      Q(9, "Ce tipuri de cazuri sau proiecte au mobilizat cel mai rapid donațiile și ce aveau în comun?", "Exemplele de campanii și timpul până la atingerea obiectivului"),
      Q(10, "Ce limite etice nu veți depăși în comunicare, chiar dacă ar putea crește donațiile?", "Cele 5 reguli etice aprobate intern"),
    ],
  },
  {
    nr: 2,
    titlu: "Obiective financiare și economia campaniilor",
    intrebari: [
      Q(11, "Care este obiectivul total de fundraising pentru următoarele 12 luni?", "Obiectiv exact, monedă și termen"),
      Q(12, "Ce pondere țintă doriți din donații individuale, donații recurente, companii, SMS, granturi și evenimente?", "Procentele exacte pe sursă (total 100%)"),
      Q(13, "Ce tipuri de campanii derulați într-un an: urgențe, cazuri individuale, programe recurente, capital sau intervenții sezoniere?", "Tip campanie → număr estimat/an"),
      Q(14, "Care este valoarea medie, mediană și maximă a obiectivului financiar per campanie?", "Obiectiv mediu / median / maxim"),
      Q(15, "Cât durează, în medie, o campanie reușită și una care rămâne în urmă?", "Campanie reușită: … zile; campanie rămasă în urmă: … zile"),
      Q(16, "Care este valoarea medie și mediană a unei donații individuale?", "Medie/mediană online, SMS și transfer"),
      Q(17, "Ce procent din venit provine de la donatori recurenți?", "Procent exact și număr de donatori recurenți activi"),
      Q(18, "Care este costul maxim acceptabil pentru atragerea unui donator nou?", "Cost maxim/donator și perioada de recuperare"),
      Q(19, "Care este conversia principală urmărită: donație unică, donație recurentă, SMS, lead, sponsorizare sau distribuire?", "Conversia principală, cele secundare și motivul alegerii"),
      Q(20, "Câte donații noi poate procesa echipa într-o săptămână fără întârzieri la confirmare, mulțumire sau raportare?", "Capacitate exactă și blocajele operaționale"),
    ],
  },
  {
    nr: 3,
    titlu: "Baza de donatori și comportamentul RFM",
    intrebari: [
      Q(21, "Câți donatori unici există în baza de date și câți au date de contact utilizabile cu temei legal?", "Donatori unici / contacte utilizabile / procent cu temei legal"),
      Q(22, "Câți donatori au oferit cel puțin o donație în ultimele 12 luni?", "Număr și procent exact"),
      Q(23, "Prin ce sursă au venit primii donatori pentru fiecare dintre cele mai bune 10 campanii?", "Campanie → sursa primului val de donatori"),
      Q(24, "Ce praguri definesc un donator obișnuit, valoros și major pentru organizație?", "Obișnuit: …; valoros: …; major: …"),
      Q(25, "Ce procent din veniturile individuale este generat de primii 10% dintre donatori?", "Procentul și suma exactă generate de top 10%"),
      Q(26, "De câte ori donează într-un an donatorii din fiecare segment valoric?", "Frecvența medie și mediană pentru fiecare segment valoric"),
      Q(27, "Câte zile au trecut de la ultima donație pentru segmentele active, în risc și inactive?", "Activ: … zile; în risc: … zile; inactiv: … zile"),
      Q(28, "Ce procent dintre donatori nu mai donează după prima contribuție?", "Abandon la 3 / 6 / 12 luni"),
      Q(29, "Care este valoarea estimată pe 12 și 36 de luni a unui donator nou?", "LTV 12 luni / 36 luni și metoda de calcul"),
      Q(30, "Ce câmpuri lipsesc cel mai des din baza de date: sursă, localitate, canal, consimțământ, sumă, frecvență sau interes?", "Câmp → procent de completare și acțiunea de remediere"),
    ],
  },
  {
    nr: 4,
    titlu: "Motivații, emoții și obiecții",
    intrebari: [
      Q(31, "Care a fost momentul concret care i-a determinat pe donatori să ofere prima donație?", "Citatul sau situația exactă descrisă de donatori"),
      Q(32, "Ce cuvinte folosesc donatorii când descriu motivul pentru care v-au ales?", "10 expresii exacte folosite de donatori"),
      Q(33, "În ce etapă a poveștii iau decizia: la primul contact, după dovada medicală, după un update sau când suma rămasă devine mică?", "Moment → procent estimat/observat"),
      Q(34, "Ce legătură personală au cu problema: experiență proprie, copil, familie, comunitate, credință, profesie sau empatie generală?", "Distribuția pe motivații și citatele relevante"),
      Q(35, "Ce imagine despre sine confirmă gestul de a dona?", "Formularea exactă folosită de donatori"),
      Q(36, "Care sunt cele mai frecvente cinci obiecții înainte de donație?", "Obiecție → frecvență/canal/citat"),
      Q(37, "Ce dovadă înlătură cel mai repede fiecare obiecție?", "Obiecție → dovada care a funcționat"),
      Q(38, "Cum aleg donatorii suma: impuls, prag sugerat, sumă simbolică, capacitate lunară sau suma rămasă?", "Mecanism → procent și suma mediană"),
      Q(39, "Ce simt donatorii imediat după donație și ce ar dori să primească în schimb?", "Emoții / așteptări / citate post-donație"),
      Q(40, "De ce revin, distribuie sau recomandă organizația altor persoane?", "Motiv → revine / distribuie / recomandă"),
    ],
  },
  {
    nr: 5,
    titlu: "Date demografice și geografice utile",
    intrebari: [
      Q(41, "Care sunt grupele de vârstă cu cele mai multe donații și care au cea mai mare valoare medie?", "Grupă → număr donații / valoare medie / sursă"),
      Q(42, "Există diferențe reale de comportament între femei, bărbați și persoanele care nu declară genul?", "Diferențele observate, mărimea eșantionului și limitele"),
      Q(43, "Din ce județe, orașe sau regiuni provin cele mai multe donații?", "Top 10 județe/orașe după număr și valoare"),
      Q(44, "Ce rol are diaspora și din ce țări contribuie cel mai des?", "Țările principale, ponderea, valoarea medie și perioadele de vârf"),
      Q(45, "Care este raportul urban/rural și cum diferă metoda de donație?", "Urban/rural → card / SMS / transfer / numerar"),
      Q(46, "Ce ocupații, domenii profesionale sau indicatori de capacitate financiară apar frecvent, fără a colecta date excesive?", "Categorie → pondere și sursa voluntară/agregată"),
      Q(47, "În ce etapă de viață se află donatorii principali: tineri profesioniști, părinți, antreprenori, seniori sau diaspora?", "Etapă → motivație / sumă / canal"),
      Q(48, "Ce nivel de educație digitală au și cât de ușor folosesc plăți online, QR, SMS sau transfer bancar?", "Scor 1–5 pentru card / QR / SMS / transfer"),
      Q(49, "În ce limbă și cu ce nivel de simplitate trebuie comunicat?", "Limba principală/secundară și nivelul de lectură recomandat"),
      Q(50, "Ce zone geografice au simultan afinitate, volum și cost de promovare acceptabil?", "Zonă → volum / valoare / cost / conversie"),
    ],
  },
  {
    nr: 6,
    titlu: "Mesaje, conținut și elemente creative",
    intrebari: [
      Q(51, "Ce tip de început a generat cele mai multe donații: urgență, sumă rămasă, progres, vocea familiei, rezultat sau comunitate?", "Hook → conversie / număr de utilizări / context"),
      Q(52, "Ce povești au cea mai bună rată de conversie și ce elemente comune conțin?", "Top 10 povești și pattern-ul comun"),
      Q(53, "Ce îndemn la acțiune funcționează cel mai bine pentru fiecare canal?", "Canal → CTA câștigător → conversie"),
      Q(54, "Ce tip de imagine sau video generează încredere fără a exploata suferința?", "Format → regulă etică → rezultat"),
      Q(55, "Care este durata video optimă pentru Facebook, Instagram, TikTok, LinkedIn și YouTube?", "Facebook / Instagram / TikTok / LinkedIn / YouTube"),
      Q(56, "Cine convinge cel mai bine: beneficiarul, părintele, medicul, președintele ONG-ului, voluntarul, sponsorul sau donatorul?", "Purtător → canal → obiectiv → rezultat"),
      Q(57, "Când funcționează transmisiunile live, evenimentele sau update-urile în timp real?", "Zi / oră / format / rezultat"),
      Q(58, "Ce dovezi de transparență trebuie incluse în mesaj sau pe pagina de donație?", "Dovadă → poziționare în pagină/mesaj"),
      Q(59, "După câte expuneri apare oboseala creativă și scade conversia?", "Frecvență / perioadă / scădere procentuală"),
      Q(60, "Care sunt cele 5 teme editoriale care pot susține relația dintre campanii?", "Temă → rol → frecvență → format"),
    ],
  },
  {
    nr: 7,
    titlu: "Canale, parcurs și conversie digitală",
    intrebari: [
      Q(61, "Unde descoperă pentru prima dată organizația donatorii care ajung să doneze?", "Canal → procent dintre donatorii noi"),
      Q(62, "Care este primul conținut consumat înainte de donație?", "Conținut → canal → procent"),
      Q(63, "Care este ultimul punct de contact înainte de plată?", "Canal / pagină / dispozitiv / procent"),
      Q(64, "Ce contribuție are fiecare canal la donații, nu doar la reach sau engagement?", "Canal → venit direct / venit asistat / conversii"),
      Q(65, "Ce rezultate provin organic și ce rezultate provin din promovare plătită?", "Organic/plătit → venit / conversie / cost"),
      Q(66, "Care este rata de conversie a paginii de donație pe mobil și desktop?", "Mobil: …%; desktop: …%; perioadă și volum"),
      Q(67, "Ce metode de plată sunt preferate și ce valoare medie are fiecare?", "Metodă → număr / pondere / valoare medie"),
      Q(68, "În ce pas abandonează oamenii formularul de donație?", "Pas → abandon % → motiv probabil → test propus"),
      Q(69, "Ce audiențe proprii pot fi activate legal: donatori, abonați, vizitatori, engagement, video viewers sau participanți la evenimente?", "Audiență → mărime / temei / vechime / excluderi"),
      Q(70, "Folosiți o convenție unică pentru UTM, coduri QR, linkuri scurte și coduri de campanie?", "Modelul exact UTM / QR / link / cod campanie"),
    ],
  },
  {
    nr: 8,
    titlu: "Încredere, experiență și retenție",
    intrebari: [
      Q(71, "Ce elemente de încredere verifică oamenii înainte să doneze?", "Ordinea verificărilor și sursa concluziei"),
      Q(72, "În cât timp primește donatorul confirmarea și mulțumirea după donație?", "Card / SMS / transfer / numerar → timp de confirmare"),
      Q(73, "Ce documente sau informații fiscale și de transparență sunt oferite automat?", "Document → canal → momentul livrării"),
      Q(74, "Care este ritmul actual al comunicării după donație?", "Ziua 0 / 2 / 7 / 30 / 90 → mesaj și canal"),
      Q(75, "Ce tip de update îi face pe donatori să simtă impactul?", "Tip update → rată de deschidere/click/răspuns"),
      Q(76, "Ce procent dintre donatorii unici trece la donație recurentă și după ce mesaj?", "Procent / interval până la recurență / mesaj declanșator"),
      Q(77, "Ce campanie de reactivare funcționează pentru donatorii inactivi?", "Segment / mesaj / ofertă / rată de revenire"),
      Q(78, "Cum pot donatorii deveni ambasadori, voluntari sau colectori de fonduri între prieteni?", "Rol → pași de înscriere → rată de participare"),
      Q(79, "Cum răspunde organizația la întrebări dificile, reclamații și suspiciuni?", "Timp de răspuns / responsabil / dovezi / escaladare"),
      Q(80, "Care este ținta de retenție la 3, 6 și 12 luni?", "Ținta la 3 / 6 / 12 luni și termenul de atingere"),
    ],
  },
  {
    nr: 9,
    titlu: "Sponsori, parteneriate și prezență offline",
    intrebari: [
      Q(81, "Ce industrii, dimensiuni și tipuri de companii au sponsorizat deja organizația?", "Industrie + dimensiune → număr sponsori / valoare totală"),
      Q(82, "Ce roluri decid sau influențează sponsorizarea?", "Rol → decide / influențează / aprobă / implementează"),
      Q(83, "Ce eveniment sau argument a declanșat sponsorizarea în cele mai bune parteneriate?", "Trigger → citat / parteneriat / valoare"),
      Q(84, "Care este propunerea de valoare pentru companie, dincolo de expunerea logo-ului?", "Beneficiu → dovadă/livrabil pentru companie"),
      Q(85, "Ce niveluri de sponsorizare sunt realiste și ce impact finanțează fiecare?", "Nivel → sumă → impact → beneficii → durată"),
      Q(86, "În ce județe sau orașe există concentrații de donatori, sponsori și voluntari?", "Top 10 zone și densitatea donatorilor/sponsorilor/voluntarilor"),
      Q(87, "Ce locații partenere pot distribui materiale: companii, farmacii, clinici, biserici, școli, universități, magazine sau evenimente?", "Locație → trafic estimat → persoană de contact → acord"),
      Q(88, "În ce contexte oamenii au timp și disponibilitate să citească și să scaneze un QR?", "Context → timp de expunere → distanță → acțiune dorită"),
      Q(89, "Ce format este potrivit fiecărui context: afiș, pliant, banner, roll-up, ecran sau stand?", "Context → format → mesaj → CTA → dimensiune"),
      Q(90, "Cum veți măsura separat fiecare punct offline?", "Punct offline → cod → responsabil → frecvența raportării"),
    ],
  },
  {
    nr: 10,
    titlu: "Capacitate, testare, conformitate și decizie",
    intrebari: [
      Q(91, "Care este bugetul lunar disponibil pentru promovare și ce parte poate fi folosită pentru teste?", "Buget total / buget test / procent test"),
      Q(92, "Câte concepte creative noi poate produce echipa în fiecare săptămână?", "Format → număr/săptămână → responsabil"),
      Q(93, "Există consimțământ documentat pentru fotografii, video, mărturii și promovare plătită?", "Beneficiar/canal → tip consimțământ → dată/expirare"),
      Q(94, "Ce instrumente măsoară donația de la impresie la plată?", "Instrument → eveniment măsurat → proprietar → ultimul test"),
      Q(95, "Ce temei legal și ce preferințe de comunicare există pentru email, SMS, WhatsApp și liste publicitare?", "Canal → temei → dovadă → retragere → retenție"),
      Q(96, "Cine verifică politicile platformelor și aprobă mesajele cu teme medicale sau sensibile?", "Rol → checklist → termen → escaladare"),
      Q(97, "Care este ipoteza testată în fiecare experiment și care este singura variabilă schimbată?", "Dacă [schimbare], atunci [KPI] va [rezultat], pentru [public], în [durată]"),
      Q(98, "Care este KPI-ul principal și care sunt pragurile minime pentru CTR, conversie, cost/donator și venit/cost?", "KPI principal / CTR minim / conversie / cost-donator / venit-cost"),
      Q(99, "Care sunt regulile de oprire, continuare și scalare a unei campanii?", "Oprire dacă… / continuare dacă… / scalare dacă… / responsabil"),
      Q(100, "Ce trei segmente finale vor fi validate prin interviuri și un test pilot înainte de a declara „donatorul ideal”?", "Segment 1 / 2 / 3; minimum 5 interviuri/segment; criteriul câștigător"),
    ],
  },
];

export const TOATE_INTREBARILE: Intrebare[] = ETAPE.flatMap((e) => e.intrebari);
export const NR_INTREBARI = TOATE_INTREBARILE.length;

export function etapaIntrebarii(nr: number): Etapa | undefined {
  return ETAPE.find((e) => e.intrebari.some((q) => q.nr === nr));
}
