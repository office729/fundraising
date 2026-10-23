// Ciorne de mesaje pentru abordarea decidenților, după rolul persoanei (decident, buget/finanțe, CSR/marketing). Text pur, fără dependențe.
// Sunt puncte de plecare de adaptat, nu texte finale: sumele, termenele și mecanismele fiscale se verifică de fiecare organizație (cu contabilul ei).
// Primul e-mail conține informarea scurtă din art. 14 GDPR (sursa datelor, temeiul, drepturile, cum se opune) — așa informarea se face odată cu primul contact.

export type GrupSablon = "decident" | "buget" | "csr" | "altul";

export type VariabileSablon = {
  prenume: string;
  firma: string;
  rol: string | null;
  ong: string; // numele organizației
  semnatura: string; // numele celui care scrie
};

export type SabloaneRol = {
  titlu: string;
  email: { subiect: string; corp: string };
  linkedin: string; // nota la cererea de conectare (scurtă)
  followUp: string; // al doilea mesaj, după câteva zile fără răspuns
};

const INFORMARE_GDPR = (v: VariabileSablon) =>
  `Informare: ți-am găsit datele de contact (nume, funcție, e-mail de serviciu) din surse profesionale, ca să îți propun acest parteneriat (interes legitim). ${v.ong} le păstrează doar cât timp discutăm. Ai dreptul de acces, ștergere și opoziție: răspunde cu STOP și nu te mai contactăm.`;

function salut(v: VariabileSablon) {
  return v.prenume ? `Bună ziua, ${v.prenume},` : "Bună ziua,";
}

export function sabloanePentru(grup: GrupSablon, v: VariabileSablon): SabloaneRol {
  const rol = v.rol ? ` (${v.rol})` : "";
  if (grup === "buget") {
    return {
      titlu: "Pentru cine decide bugetul (director financiar, contabil-șef)",
      email: {
        subiect: `${v.firma}: sponsorizare cu credit fiscal către ${v.ong}`,
        corp: `${salut(v)}

Vă scriu în calitatea dumneavoastră${rol} la ${v.firma}, pentru că sponsorizările se hotărăsc de obicei cu cifrele în față.

${v.ong} poate primi sponsorizare de la ${v.firma} în regimul prevăzut de lege: suma sponsorizată se scade din impozitul pe profit datorat, în limitele legale (de regulă 20% din impozitul pe profit și cel mult 0,75% din cifra de afaceri), deci pentru firmă costul real e mic. Pentru dosar avem nevoie doar de contractul de sponsorizare, factură și extrasul de plată; vi le pregătim noi.

Pot să vă trimit în 2 minute un exemplu de calcul pentru ${v.firma}? Dacă e util, stabilim 15 minute săptămâna aceasta.

Cu stimă,
${v.semnatura}
${v.ong}

${INFORMARE_GDPR(v)}`,
      },
      linkedin: `Bună ${v.prenume || "ziua"}! Lucrez la ${v.ong}. Aș vrea să vă arăt cum poate ${v.firma} sponsoriza cu credit fiscal, fără cost real mare. Vă conectați?`,
      followUp: `${salut(v)}

Revin scurt la mesajul de acum câteva zile despre sponsorizarea către ${v.ong}. Dacă vă ajută, vă trimit un calcul concret pentru ${v.firma} (sumă, plafon, documente), în jumătate de pagină. Spuneți-mi dacă preferați un telefon de 10 minute.

${v.semnatura}, ${v.ong}`,
    };
  }
  if (grup === "csr") {
    return {
      titlu: "Pentru CSR, sustenabilitate, marketing și comunicare",
      email: {
        subiect: `Un parteneriat cu impact măsurabil pentru ${v.firma} și ${v.ong}`,
        corp: `${salut(v)}

Vă scriu${rol} la ${v.firma} pentru că vă ocupați de felul în care firma se arată în comunitate.

${v.ong} caută parteneri pentru proiectele sale, iar pentru ${v.firma} propunem un parteneriat cu rezultate pe care le puteți arăta: raport de impact după fiecare etapă, materiale gata de folosit în comunicare și povești reale din proiect. Sponsorizarea poate beneficia și de avantajul fiscal prevăzut de lege.

Aș putea să vă trimit o pagină cu propunerea? Sau, dacă preferați, ne vedem 15 minute online.

Cu stimă,
${v.semnatura}
${v.ong}

${INFORMARE_GDPR(v)}`,
      },
      linkedin: `Bună ${v.prenume || "ziua"}! Lucrez la ${v.ong} și caut parteneri pentru proiecte cu impact măsurabil. Cred că ar putea interesa ${v.firma}. Vă conectați?`,
      followUp: `${salut(v)}

Revin la propunerea de parteneriat dintre ${v.firma} și ${v.ong}. Vă pot trimite un exemplu de raport de impact și o pagină cu ce primiți concret (vizibilitate, materiale, rapoarte). Dacă nu e momentul, spuneți-mi și revin peste câteva luni.

${v.semnatura}, ${v.ong}`,
    };
  }
  return {
    titlu: grup === "decident" ? "Pentru cine decide (administrator, director general)" : "Mesaj general",
    email: {
      subiect: `${v.ong}: o propunere pentru ${v.firma}`,
      corp: `${salut(v)}

Sunt ${v.semnatura} de la ${v.ong}. Vă scriu direct${rol}, pentru că decizia de a sprijini o cauză la ${v.firma} vă aparține.

${v.ong} poate fi sponsorizată de ${v.firma} cu avantaj fiscal prevăzut de lege: o parte din suma sponsorizată se scade din impozitul pe profit, deci efortul real al firmei e mic, iar efectul pentru noi e mare. Ne ocupăm noi de tot ce ține de documente.

Aveți 10–15 minute joi sau vineri ca să vă explic pe scurt cum ar arăta pentru ${v.firma}?

Cu stimă,
${v.semnatura}
${v.ong}

${INFORMARE_GDPR(v)}`,
    },
    linkedin: `Bună ${v.prenume || "ziua"}! Sunt de la ${v.ong}. Aș vrea să vă propun un parteneriat simplu pentru ${v.firma}, cu avantaj fiscal. Vă conectați?`,
    followUp: `${salut(v)}

Revin la mesajul meu despre o sponsorizare către ${v.ong}. Durează 10 minute și vă arăt exact cât ar însemna pentru ${v.firma}. Vă convine o discuție scurtă în zilele următoare?

${v.semnatura}, ${v.ong}`,
  };
}

// Prenumele (primul cuvânt) dintr-un nume complet, cu prima literă mare.
export function prenumeDin(nume: string): string {
  const p = (nume || "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}
