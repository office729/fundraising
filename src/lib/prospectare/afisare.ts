// Texte scurte pentru interfața de prospectare (fără dependențe, ușor de testat).

// „acum 3 zile”, „azi”, „ieri”… după o dată ISO. `acum` se poate da explicit (teste).
export function vechime(iso: string, acum: number = Date.now()): string {
  const ms = acum - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "acum";
  const minute = Math.floor(ms / 60_000);
  if (minute < 2) return "acum un minut";
  if (minute < 60) return `acum ${minute} minute`;
  const ore = Math.floor(minute / 60);
  if (ore < 24) return ore === 1 ? "acum o oră" : `acum ${ore} ore`;
  const zile = Math.floor(ore / 24);
  if (zile === 1) return "ieri";
  if (zile < 14) return `acum ${zile} zile`;
  const saptamani = Math.floor(zile / 7);
  if (saptamani < 9) return `acum ${saptamani} săptămâni`;
  return `acum ${Math.floor(zile / 30)} luni`;
}

// Zile întregi de la o dată ISO (pentru termene).
export function zileDe(iso: string, acum: number = Date.now()): number {
  return Math.floor((acum - new Date(iso).getTime()) / 86_400_000);
}

// Data „YYYY-MM-DD” ca „23 oct.” (sau „23 oct. 2026” dacă nu e anul curent).
export function dataScurta(iso: string, acum: number = Date.now()): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const anCurent = new Date(acum).getFullYear();
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", ...(d.getFullYear() !== anCurent ? { year: "numeric" } : {}) });
}

// Termenul unei acțiuni față de azi: „întârziat cu 2 zile”, „azi”, „mâine”, „peste 3 zile”, sau null fără termen.
export function stareTermen(termenIso: string | null, azi: string): { text: string; intarziat: boolean } | null {
  if (!termenIso) return null;
  const zile = Math.round((new Date(`${termenIso.slice(0, 10)}T12:00:00`).getTime() - new Date(`${azi.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000);
  if (zile < 0) return { text: `întârziat cu ${-zile} ${-zile === 1 ? "zi" : "zile"}`, intarziat: true };
  if (zile === 0) return { text: "azi", intarziat: false };
  if (zile === 1) return { text: "mâine", intarziat: false };
  return { text: `peste ${zile} zile`, intarziat: false };
}
