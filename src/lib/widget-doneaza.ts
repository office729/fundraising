// Codul pe care organizația îl lipește pe site pentru widgetul de donație (public/embed.js). Funcție pură, fără importuri, ca să poată fi testată.

export type ModWidget = "buton" | "inline";

export type ConfigWidget = {
  baza: string; // ex. https://alexandrit.ro (fără slash final)
  orgSlug: string;
  pageSlug: string;
  mod: ModWidget;
  text: string;
  culoare: string; // #rrggbb
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/i;
const HEX = /^#[0-9a-f]{6}$/i;

// Doar atributele sigure: textul se curăță de ghilimele și paranteze unghiulare, culoarea trebuie să fie #rrggbb.
export function curataText(t: string): string {
  return t.replace(/["<>&]/g, "").replace(/\s+/g, " ").trim().slice(0, 40) || "Donează";
}

export function curataCuloare(c: string): string {
  return HEX.test(c) ? c : "#2e8b57";
}

export function snippetWidget(c: ConfigWidget): string | null {
  if (!SLUG.test(c.orgSlug) || !SLUG.test(c.pageSlug) || !/^https?:\/\/[^\s"<>]+$/.test(c.baza)) return null;
  const baza = c.baza.replace(/\/+$/, "");
  const atribute = [`data-alexandrit-doneaza`, `data-org="${c.orgSlug}"`, `data-campanie="${c.pageSlug}"`, `data-mod="${c.mod === "inline" ? "inline" : "buton"}"`];
  if (c.mod !== "inline") atribute.push(`data-text="${curataText(c.text)}"`, `data-culoare="${curataCuloare(c.culoare)}"`);
  return `<div ${atribute.join(" ")}></div>\n<script async src="${baza}/embed.js"></script>`;
}
