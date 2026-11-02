// Google Meet prin Google Calendar: funcții pure (fără importuri și fără rețea), ca să se testeze direct. Clientul care vorbește cu Google e în google-meet.ts.

export type DateEvenimentMeet = { subiect: string; start: Date; durataMin: number; agenda?: string | null; tokenProgramare: string; idCerere: string };

// Corpul cererii „creează eveniment cu Meet” (Calendar API v3, events.insert cu conferenceDataVersion=1). Fără invitați: Google nu trimite emailuri; confirmarea o trimite Alexandrit.
// Evenimentul e privat în calendarul echipei, iar tokenul programării stă într-o proprietate privată, ca la anulare să găsim evenimentul fără o coloană nouă în baza de date.
export function corpEvenimentMeet(d: DateEvenimentMeet): Record<string, unknown> {
  const durata = Math.min(480, Math.max(10, Math.round(d.durataMin)));
  const sfarsit = new Date(d.start.getTime() + durata * 60_000);
  const fara = (x: Date) => x.toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    summary: d.subiect.replace(/\s+/g, " ").trim().slice(0, 200) || "Ședință Alexandrit",
    ...(d.agenda ? { description: d.agenda.slice(0, 1900) } : {}),
    start: { dateTime: fara(d.start), timeZone: "Europe/Bucharest" },
    end: { dateTime: fara(sfarsit), timeZone: "Europe/Bucharest" },
    visibility: "private",
    guestsCanModify: false,
    conferenceData: { createRequest: { requestId: d.idCerere, conferenceSolutionKey: { type: "hangoutsMeet" } } },
    extendedProperties: { private: { alexandritToken: d.tokenProgramare } },
  };
}

// Din răspunsul Google: linkul Meet (hangoutLink sau punctul de intrare video) și id-ul evenimentului.
export function linkMeetDinEveniment(ev: unknown): { link: string; id: string } | null {
  if (!ev || typeof ev !== "object") return null;
  const e = ev as { id?: unknown; hangoutLink?: unknown; conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] } };
  const dinPuncte = e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
  const link = typeof e.hangoutLink === "string" && e.hangoutLink ? e.hangoutLink : typeof dinPuncte === "string" ? dinPuncte : "";
  if (!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:[/?#]|$)/i.test(link) || typeof e.id !== "string" || !e.id) return null;
  return { link, id: e.id };
}

// Adresa de email din id_token-ul primit direct de la Google la schimbul codului (JWT: partea a doua, base64url). Doar pentru afișare („conectat ca …”), nu pentru autorizare.
export function emailDinIdToken(idToken: unknown): string | null {
  if (typeof idToken !== "string") return null;
  const parte = idToken.split(".")[1];
  if (!parte) return null;
  try {
    const j = JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as { email?: unknown };
    return typeof j.email === "string" && /^[^\s@]+@[^\s@]+$/.test(j.email) ? j.email : null;
  } catch {
    return null;
  }
}

// Setările de programări se salvează integral din formular; conexiunea Google (criptată) trebuie să supraviețuiască acelei salvări.
export function pastreazaConexiuneGoogle(configNou: Record<string, unknown>, configVechi: unknown): Record<string, unknown> {
  const vechi = configVechi && typeof configVechi === "object" ? (configVechi as Record<string, unknown>) : {};
  return vechi.googleMeet ? { ...configNou, googleMeet: vechi.googleMeet } : configNou;
}
