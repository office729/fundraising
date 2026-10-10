// Textele asistentului de creare a campaniei, în română și engleză. Mesajele de eroare sunt coduri în logica de validare
// (campanie-validare.ts) și se traduc aici, ca validarea să rămână pură și testabilă.

export type CodEroare =
  | "titlu.gol"
  | "titlu.scurt"
  | "titlu.lung"
  | "template.gol"
  | "suma.invalida"
  | "suma.mare"
  | "termen.invalid"
  | "termen.trecut"
  | "termen.departe"
  | "nume.gol"
  | "email.gol"
  | "email.invalid"
  | "poveste.gol"
  | "poveste.scurta"
  | "poveste.lunga";

export type CodAvertisment = "poveste" | "poza" | "tinta" | "termen" | "judet";

type Texte = {
  erori: Record<CodEroare, string>;
  avertismente: Record<CodAvertisment, string>;
  pasi: [string, string, string, string, string];
  asistent: {
    eticheta: string;
    publicata: string;
    inchide: string;
    draftSalvat: string;
    draftNesalvat: string;
    draftScurt: string;
    formular: string;
    previzualizare: string;
    pasulDin: (n: number, total: number) => string;
    draftGasit: (data: string, titlu: string) => string;
    continuaDraft: string;
    deLaZero: string;
    pasiAria: string;
    inapoi: string;
    salveazaDraft: string;
    draft: string;
    continua: string;
    publica: string;
    asaVorVedea: string;
    seActualizeaza: string;
    dispozitiv: string;
    calculator: string;
    telefon: string;
    confirmaTitlu: string;
    confirmaText: (titlu: string) => string;
    maiVerific: string;
    publicaAcum: string;
    sePublica: string;
    creareEsuata: string;
    reteaEsuata: string;
  };
  detalii: {
    titlu: string;
    subtitlu: string;
    titluCampanie: string;
    titluIndiciu: string;
    titluExemplu: string;
    domeniu: string;
    domeniuIndiciu: string;
    suma: string;
    sumaIndiciuCuTinta: (suma: string) => string;
    sumaIndiciuFara: string;
    lei: string;
    termen: string;
    termenIndiciu: string;
    termenZile: (n: number) => string;
    termenCurat: string;
    judet: string;
    judetAlege: string;
    judetIndiciu: string;
    localitate: string;
    localitateExemplu: string;
    contact: string;
    contactIndiciu: string;
    nume: string;
    email: string;
  };
  poveste: {
    titlu: string;
    subtitlu: string;
    eticheta: string;
    exemplu: string;
    contorIndiciu: string;
    ceMerita: string;
    ceMeritaIndiciu: string;
    indicii: { titlu: string; text: string }[];
  };
  poza: {
    titlu: string;
    subtitlu: string;
    trage: string;
    formate: (mb: number) => string;
    alta: string;
    alt: string;
    axaY: string;
    axaX: string;
    schimba: string;
    elimina: string;
    sfat1: string;
    sfat2: string;
    sfat3: string;
    tipInvalid: string;
    prea: (mb: number) => string;
    nuCitit: string;
  };
  donatii: {
    titlu: string;
    subtitlu: string;
    exemplu: string;
    frecventa: string;
    odata: string;
    lunar: string;
    altaSuma: string;
    lunarNota: string;
    puncte: [string, string][];
    nota: string;
    setari: string;
  };
  verificare: {
    titlu: string;
    subtitlu: string;
    nuPublicat: string;
    pastrate: string;
    maiAre: string;
    modifica: string;
    titluRand: string;
    domeniu: string;
    nealeas: string;
    sumaTinta: string;
    faraTinta: string;
    termen: string;
    faraTermen: string;
    locatie: string;
    necompletata: string;
    poveste: string;
    lipseste: string;
    fotografie: string;
    faraPoza: string;
    contact: string;
    poateSi: string;
    rezolv: string;
    adresa: (link: string) => string;
  };
  succes: {
    titlu: string;
    text: string;
    pozaEroare: (e: string) => string;
    copiaza: string;
    copiat: string;
    vezi: string;
    deschide: string;
    inchide: string;
  };
  previzualizare: {
    caleCalculator: string;
    caleTelefon: string;
    pozaApare: string;
    verificataDe: (org: string) => string;
    titluGol: string;
    pozaCampaniei: string;
    sustine: string;
    sustineText: string;
    doneaza: string;
    strans: string;
    dinTinta: (suma: string) => string;
    stransFaraTinta: string;
    donatii0: string;
    povesteGol: string;
    termen: (data: string, zile: number) => string;
    leiSuffix: string;
  };
};


export const TEXTE_CAMPANIE: Record<"ro" | "en", Texte> = {
  ro: {
    erori: {
      "titlu.gol": "Dă campaniei un titlu.",
      "titlu.scurt": "Titlul e prea scurt. Spune pe scurt ce vrei să schimbi.",
      "titlu.lung": "Titlul poate avea cel mult 120 de caractere.",
      "template.gol": "Alege domeniul campaniei.",
      "suma.invalida": "Introdu o sumă pozitivă, de exemplu 10.000.",
      "suma.mare": "Suma pare prea mare. Verifică dacă ai scris-o corect.",
      "termen.invalid": "Alege o dată validă pentru termen.",
      "termen.trecut": "Termenul nu poate fi în trecut.",
      "termen.departe": "Termenul e prea departe. Alege o dată în următorii 3 ani.",
      "nume.gol": "Spune cine coordonează campania.",
      "email.gol": "Adaugă un email de contact.",
      "email.invalid": "Adresa de email nu pare completă.",
      "poveste.gol": "Povestea campaniei este obligatorie.",
      "poveste.scurta": "Scrie măcar câteva fraze: cine are nevoie de ajutor și de ce.",
      "poveste.lunga": "Povestea poate avea cel mult 8.000 de caractere.",
    },
    avertismente: {
      poveste: "Povestea e scurtă. Câteva paragrafe despre cine ajută, de ce și ce se face cu banii inspiră mai multă încredere.",
      poza: "Campania nu are poză. O fotografie reală face pagina mai credibilă și mai ușor de recunoscut pe rețele.",
      tinta: "Nu ai o sumă țintă. Pagina va arăta doar suma strânsă, fără bara de progres.",
      termen: "Campania nu are termen. E în regulă pentru campanii continue; un termen dă urgență celor care o văd.",
      judet: "Județul lipsește. Ajută la recomandarea presei și a grupurilor locale.",
    },
    pasi: ["Detalii", "Poveste", "Poză", "Donații", "Verificare"],
    asistent: {
      eticheta: "Campanie nouă",
      publicata: "Campanie publicată",
      inchide: "Închide asistentul",
      draftSalvat: "✓ Draft salvat în acest browser",
      draftNesalvat: "Draftul nu s-a putut salva",
      draftScurt: "✓ Salvat",
      formular: "Formular",
      previzualizare: "Previzualizare",
      pasulDin: (n, total) => `Pasul ${n} din ${total}`,
      draftGasit: (data, titlu) => `Ai un draft salvat${data ? ` pe ${data}` : ""}${titlu ? `: „${titlu}”` : ""}.`,
      continuaDraft: "Continuă draftul",
      deLaZero: "Începe de la zero",
      pasiAria: "Pașii campaniei",
      inapoi: "Înapoi",
      salveazaDraft: "Salvează ca draft",
      draft: "Draft",
      continua: "Continuă",
      publica: "Publică campania",
      asaVorVedea: "Așa o vor vedea donatorii",
      seActualizeaza: "Se actualizează pe măsură ce completezi.",
      dispozitiv: "Tip dispozitiv",
      calculator: "Calculator",
      telefon: "Telefon",
      confirmaTitlu: "Publici campania?",
      confirmaText: (titlu) => `Pagina „${titlu}” devine publică imediat și poate primi donații. Titlul, povestea și poza se pot modifica oricând după publicare; adresa paginii rămâne aceeași.`,
      maiVerific: "Mai verific",
      publicaAcum: "Publică acum",
      sePublica: "Se publică…",
      creareEsuata: "Campania nu a putut fi creată. Încearcă din nou.",
      reteaEsuata: "Nu am putut ajunge la server. Verifică conexiunea și încearcă din nou. Datele tale sunt păstrate.",
    },
    detalii: {
      titlu: "Despre ce este campania?",
      subtitlu: "Începe cu esențialul. Toate se pot schimba mai târziu, în afară de adresa paginii.",
      titluCampanie: "Titlul campaniei",
      titluIndiciu: "Scurt și concret: ce vrei să schimbi, nu doar numele proiectului.",
      titluExemplu: "ex. Un acoperiș nou pentru centrul de zi",
      domeniu: "Domeniul campaniei",
      domeniuIndiciu: "Hotărăște culorile și aspectul paginii publice.",
      suma: "Suma de care ai nevoie",
      sumaIndiciuCuTinta: (s) => `Pagina va arăta o bară de progres până la ${s} lei.`,
      sumaIndiciuFara: "Opțional. Fără țintă, pagina arată doar suma strânsă.",
      lei: "lei",
      termen: "Termenul campaniei",
      termenIndiciu: "Opțional. Apare pe pagină ca „X zile rămase”. Nu închide singur campania și nu oprește donațiile.",
      termenZile: (n) => `peste ${n} de zile`,
      termenCurat: "Fără termen",
      judet: "Județ",
      judetAlege: "Alege județul",
      judetIndiciu: "Opțional. Ajută la recomandarea presei și a grupurilor locale.",
      localitate: "Localitate",
      localitateExemplu: "ex. Turda",
      contact: "Persoana de contact",
      contactIndiciu: "Cine coordonează campania. Completat cu datele contului tău; îl poți schimba.",
      nume: "Nume",
      email: "Email",
    },
    poveste: {
      titlu: "Spune povestea campaniei",
      subtitlu: "Oamenii donează pentru oameni. O poveste sinceră și concretă convinge mai mult decât una lungă.",
      eticheta: "Povestea campaniei",
      exemplu: "Începe cu o frază care spune cine ești și pe cine ajuți…",
      contorIndiciu: "Lasă un rând liber între paragrafe. Textul se afișează exact cum îl scrii.",
      ceMerita: "Ce merită spus",
      ceMeritaIndiciu: "Apasă pe o întrebare ca s-o adaugi în text, apoi răspunde-i.",
      indicii: [
        { titlu: "Cine are nevoie de ajutor?", text: "Cine sunt oamenii (sau animalele, locul) pe care îi ajuți și ce îi face speciali." },
        { titlu: "Care este problema?", text: "Ce s-a întâmplat sau ce lipsește, spus simplu și fără exagerări." },
        { titlu: "Ce se face cu banii?", text: "Pe ce se cheltuie suma, cât de concret poți." },
        { titlu: "Cum poate ajuta cineva?", text: "Donația, dar și distribuirea campaniei sau alte feluri de a se implica." },
      ],
    },
    poza: {
      titlu: "Adaugă o fotografie",
      subtitlu: "Poza principală apare în capul paginii și când linkul e distribuit pe rețele. Alege una reală, luminoasă și orizontală.",
      trage: "Trage poza aici sau apasă ca s-o alegi",
      formate: (mb) => `JPG, PNG sau WebP, până la ${mb} MB. O decupăm automat la 16:9.`,
      alta: "Poza aleasă",
      alt: "Poza aleasă pentru campanie",
      axaY: "Ce parte a pozei se vede (sus ↔ jos)",
      axaX: "Ce parte a pozei se vede (stânga ↔ dreapta)",
      schimba: "Schimbă poza",
      elimina: "Elimină",
      sfat1: "Folosește o poză făcută de voi sau pentru care ai acordul persoanelor din ea. La minori, cere acordul părinților.",
      sfat2: "Evită textul pe poză și imaginile întunecate sau neclare.",
      sfat3: "Pasul e opțional: poza se poate adăuga și după publicare, din „Editează”.",
      tipInvalid: "Folosește o poză JPG, PNG sau WebP.",
      prea: (mb) => `Poza are peste ${mb} MB. Alege una mai mică.`,
      nuCitit: "Nu am putut citi poza. Încearcă alt fișier.",
    },
    donatii: {
      titlu: "Cum vor dona oamenii",
      subtitlu: "Formularul de donație e pregătit și identic pentru toate campaniile. Iată ce vor vedea donatorii.",
      exemplu: "Exemplu de formular",
      frecventa: "Frecvența donației",
      odata: "O singură dată",
      lunar: "Lunar",
      altaSuma: "Donatorul poate scrie și altă sumă.",
      lunarNota: "Donațiile lunare pornesc de la sume mici, ca să rămână ani la rând.",
      puncte: [
        ["Donație unică sau lunară", "Donatorul alege singur dacă donează o dată sau în fiecare lună."],
        ["Plată cu cardul, procesată securizat", "Plata se face pe pagina de plată securizată; donatorul primește automat un email de mulțumire."],
        ["Suma strânsă se actualizează singură", "Bara de progres și lista donațiilor recente se completează pe măsură ce vin donațiile."],
      ],
      nota: "Sumele sugerate sunt aceleași pentru toate campaniile și nu se pot personaliza încă. Metodele de plată și datele organizației se gestionează din",
      setari: "Setări",
    },
    verificare: {
      titlu: "Verifică și publică",
      subtitlu: "Aruncă o privire peste rezumat. După publicare, campania poate primi donații imediat.",
      nuPublicat: "Nu am putut publica campania.",
      pastrate: "Datele tale sunt păstrate; poți încerca din nou.",
      maiAre: "Mai ai de completat:",
      modifica: "Modifică",
      titluRand: "Titlu",
      domeniu: "Domeniu",
      nealeas: "Nealeas",
      sumaTinta: "Sumă țintă",
      faraTinta: "Fără țintă",
      termen: "Termen",
      faraTermen: "Fără termen",
      locatie: "Locație",
      necompletata: "Necompletată",
      poveste: "Poveste",
      lipseste: "Lipsește",
      fotografie: "Fotografie",
      faraPoza: "Fără poză",
      contact: "Persoană de contact",
      poateSi: "Poți publica și așa, dar merită verificat",
      rezolv: "Rezolv",
      adresa: (link) => `Pagina va fi publică la ${link}. Adresa exactă se generează din titlu și nu se schimbă după publicare.`,
    },
    succes: {
      titlu: "Campania ta este publică",
      text: "Oricine are linkul poate dona acum. Trimite-l primelor persoane apropiate: primele donații dau încredere celorlalți.",
      pozaEroare: (e) => `Campania e publicată, dar poza nu s-a încărcat: ${e} O poți adăuga din „Editează”, în lista de campanii.`,
      copiaza: "Copiază",
      copiat: "Copiat",
      vezi: "Vezi pagina publică",
      deschide: "Deschide campania în CRM",
      inchide: "Închide",
    },
    previzualizare: {
      caleCalculator: "Previzualizare pe calculator",
      caleTelefon: "Previzualizare pe telefon",
      pozaApare: "Poza campaniei apare aici",
      verificataDe: (org) => `Campanie verificată de ${org}`,
      titluGol: "Titlul campaniei tale",
      pozaCampaniei: "Poza campaniei",
      sustine: "Sprijină campania",
      sustineText: "Orice sumă contează. Donezi o dată sau lunar, în siguranță, cu cardul.",
      doneaza: "Donează",
      strans: "lei",
      dinTinta: (s) => `din ${s} lei · 0 donații`,
      stransFaraTinta: "strânși până acum · 0 donații",
      donatii0: "0 lei",
      povesteGol: "Povestea campaniei apare aici. Spune cine are nevoie de ajutor, de ce acum și ce se va face cu banii.",
      termen: (data, zile) => (zile > 1 ? `Termen: ${data} · ${zile} zile rămase` : zile === 1 ? `Termen: ${data} · mâine e ultima zi` : zile === 0 ? "Termen: azi · ultima zi" : `Termenul campaniei a fost ${data}`),
      leiSuffix: "lei",
    },
  },
  en: {
    erori: {
      "titlu.gol": "Give your campaign a title.",
      "titlu.scurt": "The title is too short. Say briefly what you want to change.",
      "titlu.lung": "The title can have at most 120 characters.",
      "template.gol": "Choose the campaign's field.",
      "suma.invalida": "Enter a positive amount, for example 10,000.",
      "suma.mare": "The amount looks too large. Check that you typed it correctly.",
      "termen.invalid": "Choose a valid date for the deadline.",
      "termen.trecut": "The deadline can't be in the past.",
      "termen.departe": "The deadline is too far away. Choose a date within the next 3 years.",
      "nume.gol": "Say who coordinates the campaign.",
      "email.gol": "Add a contact email.",
      "email.invalid": "The email address doesn't look complete.",
      "poveste.gol": "The campaign story is required.",
      "poveste.scurta": "Write at least a few sentences: who needs help and why.",
      "poveste.lunga": "The story can have at most 8,000 characters.",
    },
    avertismente: {
      poveste: "The story is short. A few paragraphs about who you help, why, and what the money is for build more trust.",
      poza: "The campaign has no photo. A real photo makes the page more credible and easier to recognise on social media.",
      tinta: "There is no target amount. The page will only show the amount raised, without a progress bar.",
      termen: "The campaign has no deadline. That's fine for ongoing campaigns; a deadline adds urgency for visitors.",
      judet: "The county is missing. It helps recommend local press and groups.",
    },
    pasi: ["Details", "Story", "Photo", "Donations", "Review"],
    asistent: {
      eticheta: "New campaign",
      publicata: "Campaign published",
      inchide: "Close the wizard",
      draftSalvat: "✓ Draft saved in this browser",
      draftNesalvat: "The draft couldn't be saved",
      draftScurt: "✓ Saved",
      formular: "Form",
      previzualizare: "Preview",
      pasulDin: (n, total) => `Step ${n} of ${total}`,
      draftGasit: (data, titlu) => `You have a saved draft${data ? ` from ${data}` : ""}${titlu ? `: “${titlu}”` : ""}.`,
      continuaDraft: "Continue the draft",
      deLaZero: "Start over",
      pasiAria: "Campaign steps",
      inapoi: "Back",
      salveazaDraft: "Save as draft",
      draft: "Draft",
      continua: "Continue",
      publica: "Publish campaign",
      asaVorVedea: "This is how donors will see it",
      seActualizeaza: "Updates as you fill in the form.",
      dispozitiv: "Device type",
      calculator: "Desktop",
      telefon: "Phone",
      confirmaTitlu: "Publish the campaign?",
      confirmaText: (titlu) => `The page “${titlu}” goes public immediately and can receive donations. You can change the title, story and photo at any time after publishing; the page address stays the same.`,
      maiVerific: "Review again",
      publicaAcum: "Publish now",
      sePublica: "Publishing…",
      creareEsuata: "The campaign couldn't be created. Please try again.",
      reteaEsuata: "We couldn't reach the server. Check your connection and try again. Your data is kept.",
    },
    detalii: {
      titlu: "What is the campaign about?",
      subtitlu: "Start with the essentials. Everything can be changed later except the page address.",
      titluCampanie: "Campaign title",
      titluIndiciu: "Short and concrete: what you want to change, not just the project name.",
      titluExemplu: "e.g. A new roof for the day centre",
      domeniu: "Campaign field",
      domeniuIndiciu: "Sets the colours and look of the public page.",
      suma: "Amount you need",
      sumaIndiciuCuTinta: (s) => `The page will show a progress bar up to ${s} lei.`,
      sumaIndiciuFara: "Optional. Without a target, the page only shows the amount raised.",
      lei: "lei",
      termen: "Campaign deadline",
      termenIndiciu: "Optional. Shown on the page as “X days left”. It doesn't close the campaign or stop donations by itself.",
      termenZile: (n) => `in ${n} days`,
      termenCurat: "No deadline",
      judet: "County",
      judetAlege: "Choose the county",
      judetIndiciu: "Optional. Helps recommend local press and groups.",
      localitate: "Town",
      localitateExemplu: "e.g. Turda",
      contact: "Contact person",
      contactIndiciu: "Who coordinates the campaign. Filled in with your account details; you can change it.",
      nume: "Name",
      email: "Email",
    },
    poveste: {
      titlu: "Tell the campaign's story",
      subtitlu: "People give to people. A sincere, concrete story persuades more than a long one.",
      eticheta: "Campaign story",
      exemplu: "Start with a sentence about who you are and who you help…",
      contorIndiciu: "Leave a blank line between paragraphs. The text is shown exactly as you write it.",
      ceMerita: "What's worth saying",
      ceMeritaIndiciu: "Click a question to add it to the text, then answer it.",
      indicii: [
        { titlu: "Who needs help?", text: "Who the people (or animals, or place) are and what makes them special." },
        { titlu: "What is the problem?", text: "What happened or what is missing, said simply and without exaggeration." },
        { titlu: "What will the money be used for?", text: "What the amount is spent on, as concretely as you can." },
        { titlu: "How can someone help?", text: "Donating, but also sharing the campaign or other ways to get involved." },
      ],
    },
    poza: {
      titlu: "Add a photo",
      subtitlu: "The main photo appears at the top of the page and when the link is shared on social media. Choose a real, bright, landscape one.",
      trage: "Drag the photo here or click to choose it",
      formate: (mb) => `JPG, PNG or WebP, up to ${mb} MB. We crop it to 16:9 automatically.`,
      alta: "Chosen photo",
      alt: "Photo chosen for the campaign",
      axaY: "Which part of the photo shows (top ↔ bottom)",
      axaX: "Which part of the photo shows (left ↔ right)",
      schimba: "Change photo",
      elimina: "Remove",
      sfat1: "Use a photo you took, or one where you have the consent of the people in it. For minors, get their parents' consent.",
      sfat2: "Avoid text on the photo and dark or blurry images.",
      sfat3: "This step is optional: you can add the photo after publishing, from “Edit”.",
      tipInvalid: "Use a JPG, PNG or WebP photo.",
      prea: (mb) => `The photo is over ${mb} MB. Choose a smaller one.`,
      nuCitit: "We couldn't read the photo. Try another file.",
    },
    donatii: {
      titlu: "How people will donate",
      subtitlu: "The donation form is ready and the same for every campaign. Here is what donors will see.",
      exemplu: "Form example",
      frecventa: "Donation frequency",
      odata: "One time",
      lunar: "Monthly",
      altaSuma: "Donors can also type a different amount.",
      lunarNota: "Monthly donations start from small amounts so they continue for years.",
      puncte: [
        ["One-time or monthly donation", "The donor chooses whether to give once or every month."],
        ["Card payment, processed securely", "Payment is made on a secure payment page; the donor automatically receives a thank-you email."],
        ["The amount raised updates itself", "The progress bar and the list of recent donations fill in as donations arrive."],
      ],
      nota: "Suggested amounts are the same for all campaigns and can't be customised yet. Payment methods and organisation details are managed in",
      setari: "Settings",
    },
    verificare: {
      titlu: "Review and publish",
      subtitlu: "Take a look at the summary. Once published, the campaign can receive donations right away.",
      nuPublicat: "We couldn't publish the campaign.",
      pastrate: "Your data is kept; you can try again.",
      maiAre: "Still to complete:",
      modifica: "Edit",
      titluRand: "Title",
      domeniu: "Field",
      nealeas: "Not chosen",
      sumaTinta: "Target amount",
      faraTinta: "No target",
      termen: "Deadline",
      faraTermen: "No deadline",
      locatie: "Location",
      necompletata: "Not filled in",
      poveste: "Story",
      lipseste: "Missing",
      fotografie: "Photo",
      faraPoza: "No photo",
      contact: "Contact person",
      poateSi: "You can publish as is, but it's worth a check",
      rezolv: "Fix",
      adresa: (link) => `The page will be public at ${link}. The exact address is generated from the title and doesn't change after publishing.`,
    },
    succes: {
      titlu: "Your campaign is live",
      text: "Anyone with the link can donate now. Send it to the first people close to you: early donations build trust for the others.",
      pozaEroare: (e) => `The campaign is published, but the photo didn't upload: ${e} You can add it from “Edit”, in the campaign list.`,
      copiaza: "Copy",
      copiat: "Copied",
      vezi: "View public page",
      deschide: "Open the campaign in the CRM",
      inchide: "Close",
    },
    previzualizare: {
      caleCalculator: "Desktop preview",
      caleTelefon: "Phone preview",
      pozaApare: "The campaign photo appears here",
      verificataDe: (org) => `Campaign verified by ${org}`,
      titluGol: "Your campaign title",
      pozaCampaniei: "Campaign photo",
      sustine: "Support the campaign",
      sustineText: "Every amount counts. Give once or monthly, safely, by card.",
      doneaza: "Donate",
      strans: "lei",
      dinTinta: (s) => `of ${s} lei · 0 donations`,
      stransFaraTinta: "raised so far · 0 donations",
      donatii0: "0 lei",
      povesteGol: "The campaign story appears here. Say who needs help, why now, and what the money will be used for.",
      termen: (data, zile) => (zile > 1 ? `Deadline: ${data} · ${zile} days left` : zile === 1 ? `Deadline: ${data} · tomorrow is the last day` : zile === 0 ? "Deadline: today · last day" : `The campaign deadline was ${data}`),
      leiSuffix: "lei",
    },
  },
};
