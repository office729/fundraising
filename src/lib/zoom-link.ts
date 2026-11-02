// Zoom: funcții pure (fără importuri și fără rețea), ca să se testeze direct. Clientul care vorbește cu Zoom e în zoom.ts.

// Linkul de intrare într-o ședință Zoom: https://<subdomeniu>.zoom.us/j/<id>?pwd=… (id de 9–12 cifre).
const RE_ZOOM = /^https:\/\/(?:[a-z0-9-]+\.)?zoom\.(?:us|com)\/j\/(\d{9,12})(?:[/?#]|$)/i;

export const esteLinkZoom = (v: unknown): v is string => typeof v === "string" && RE_ZOOM.test(v.trim());

export function idDinLinkZoom(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const m = RE_ZOOM.exec(link.trim());
  return m ? m[1]! : null;
}

// Linkul unei ședințe Google Meet: https://meet.google.com/abc-defg-hij (3-4-3 litere).
export const esteLinkMeet = (v: unknown): v is string => typeof v === "string" && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:[/?#]|$)/i.test(v.trim());

// O locație care e adresă web (Zoom, Meet, Teams…) se arată ca link; orice altceva rămâne text.
export const esteAdresaWeb = (v: unknown): v is string => typeof v === "string" && /^https?:\/\/[^\s<>"']+$/i.test(v.trim());

export type DateIntalnireZoom = { subiect: string; start: Date; durataMin: number; agenda?: string | null };

// Corpul cererii „creează întâlnire” (API Zoom v2, meetings). Ora se trimite în UTC, iar fusul României doar informativ (afișat de Zoom în invitație).
// Sala de așteptare e pornită: intră doar cine e primit de gazdă, iar linkul pierdut sau forwardat nu dă acces direct.
export function corpIntalnireZoom(d: DateIntalnireZoom): Record<string, unknown> {
  const durata = Math.min(480, Math.max(10, Math.round(d.durataMin)));
  return {
    topic: d.subiect.replace(/\s+/g, " ").trim().slice(0, 200) || "Ședință Alexandrit",
    type: 2,
    start_time: d.start.toISOString().replace(/\.\d{3}Z$/, "Z"),
    duration: durata,
    timezone: "Europe/Bucharest",
    ...(d.agenda ? { agenda: d.agenda.slice(0, 1900) } : {}),
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      waiting_room: true,
      mute_upon_entry: true,
      approval_type: 2,
      audio: "both",
      auto_recording: "none",
    },
  };
}
