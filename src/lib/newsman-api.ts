// API-ul Newsman (versiunea 1.2, REST), părțile pure: construirea cererii de abonare cu confirmare (double opt-in) și interpretarea răspunsului. Fără importuri, ca să se poată testa
// direct; apelul propriu-zis, cu cheia din mediu, e în lib/newsman-abonare.ts.
//
// `subscriber.initSubscribe` trimite întâi un email cu un link unic; abonatul devine activ abia după ce îl apasă. Emailul de confirmare e cel al formularului marcat „Implicit” din
// lista Newsman (Formulare abonare → „Confirmare abonare newsletter (API)”). `saveSubscribe` abonează direct, fără confirmare, deci NU se folosește pentru site.
// Documentația: https://kb.newsman.ro/api/1.2/subscriber.initSubscribe (marcată „deprecated” în favoarea v2, dar încă activă).

export const NEWSMAN_API_BAZA = "https://ssl.newsman.app/api/1.2/rest";

export type CredentialeNewsman = { userId: string; apiKey: string; listId: string };

export type Abonare = { email: string; ip: string };

// Cheia și ID-ul de utilizator ajung în adresa cererii (așa cere API-ul), deci adresa nu se scrie niciodată în jurnale.
export function construiesteCerereInitSubscribe(c: CredentialeNewsman, a: Abonare): { url: string; corp: string } {
  const corp = new URLSearchParams();
  corp.set("list_id", c.listId);
  corp.set("email", a.email);
  // Fără nume la abonarea din site; parametrii sunt obligatorii, dar pot fi goi.
  corp.set("firstname", "");
  corp.set("lastname", "");
  corp.set("ip", a.ip);
  // Eticheta (tag) arată în Newsman de unde vine abonatul; cheile cu prefixul `tag_` din `props` devin etichete.
  corp.set("props[tag_sursa-site]", "site");
  // `options` e obligatoriu (poate fi gol de conținut): nu cerem verificarea „deja abonat”, ca răspunsul să fie același pentru orice adresă.
  corp.set("options[check_already_subscribed]", "0");
  return { url: `${NEWSMAN_API_BAZA}/${encodeURIComponent(c.userId)}/${encodeURIComponent(c.apiKey)}/subscriber.initSubscribe.json`, corp: corp.toString() };
}

export type RezultatAbonare = "confirmare_trimisa" | "deja_abonat" | "prea_des" | "email_invalid" | "ip_invalid" | "eroare";

// Codurile de eroare ale API-ului pentru initSubscribe (vezi documentația): 130 = deja abonat, 128 = o singură cerere pe adresă la 10 minute, 123 = adresă invalidă,
// 122 = IP invalid (de exemplu 127.0.0.1). Orice altceva (listă ștearsă, acces refuzat, eroare internă, răspuns neînțeles) e „eroare”.
export function interpreteazaRaspunsInit(status: number, text: string): { rezultat: RezultatAbonare; cod?: number; mesaj?: string } {
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (json && typeof json === "object" && !Array.isArray(json) && (json as { err?: unknown }).err) {
    const cod = Number((json as { code?: unknown }).code);
    const rezultat: RezultatAbonare = cod === 130 ? "deja_abonat" : cod === 128 ? "prea_des" : cod === 123 ? "email_invalid" : cod === 122 ? "ip_invalid" : "eroare";
    // Mesajul se păstrează doar pentru codurile ale căror texte nu conțin date ale abonatului (altele, ca „adresă invalidă” sau „dezabonat”, includ adresa de email), ca să poată intra în jurnal.
    const mesajSigur = [407, 101, 108, 144, 10001].includes(cod) && typeof (json as { message?: unknown }).message === "string" ? (json as { message: string }).message.slice(0, 120) : undefined;
    return { rezultat, cod: Number.isFinite(cod) ? cod : undefined, ...(mesajSigur ? { mesaj: mesajSigur } : {}) };
  }
  // Succes: ID-ul acțiunii, un număr (cu sau fără ghilimele).
  const id = typeof json === "number" || typeof json === "string" ? String(json) : text.trim().replace(/^"|"$/g, "");
  if (status >= 200 && status < 300 && /^\d+$/.test(id)) return { rezultat: "confirmare_trimisa" };
  return { rezultat: "eroare" };
}
