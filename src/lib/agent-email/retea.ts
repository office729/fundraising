// Regulile PURE pentru căsuța de email a unui utilizator: adrese de servere acceptate (fără rețele interne), porturi, validarea datelor din formular, sugestii pe furnizor.
// Utilizatorul poate scrie orice server în Setări; platforma nu se conectează la adrese interne (localhost, rețele private, metadate cloud).

export const PORTURI_SMTP: readonly number[] = [465, 587, 2525];
export const PORTURI_IMAP: readonly number[] = [993, 143];

const RE_HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const RE_IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const RE_EMAIL = /^[^\s@<>(),;:\\"]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

// Adresă IP din rețele care nu sunt publice (loopback, private, link-local, CGNAT, multicast, rezervate), IPv4 sau IPv6.
export function esteIpPrivat(ip: string): boolean {
  const t = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const m4 = t.match(RE_IPV4);
  if (m4) {
    const [a, b] = [Number(m4[1]), Number(m4[2])];
    if ([a, b, Number(m4[3]), Number(m4[4])].some((n) => n > 255)) return true;
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (t.includes(":")) return esteIpv6Privat(t);
  return false;
}

// IPv6 desfăcut în 16 octeți (acceptă „::”, zona %eth0 și coada IPv4). Formă greșită => null (tratată ca privată).
function octetiIpv6(t: string): number[] | null {
  const fara = t.split("%")[0];
  let coada: number[] = [];
  let corp = fara;
  const m4 = fara.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m4) {
    coada = [Number(m4[1]), Number(m4[2]), Number(m4[3]), Number(m4[4])];
    if (coada.some((n) => n > 255)) return null;
    corp = fara.slice(0, fara.length - m4[0].length) + "0:0";
  }
  const parti = corp.split("::");
  if (parti.length > 2) return null;
  const grupe = (x: string) => (x === "" ? [] : x.split(":"));
  const st = grupe(parti[0]);
  const dr = parti.length === 2 ? grupe(parti[1]) : [];
  const lipsa = 8 - st.length - dr.length;
  if (parti.length === 1 ? st.length !== 8 : lipsa < 1) return null;
  const toate = parti.length === 1 ? st : [...st, ...Array<string>(lipsa).fill("0"), ...dr];
  const octeti: number[] = [];
  for (const g of toate) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const v = parseInt(g, 16);
    octeti.push(v >> 8, v & 255);
  }
  if (coada.length) octeti.splice(12, 4, ...coada);
  return octeti.length === 16 ? octeti : null;
}

// IPv6 care nu e adresă publică: loopback, nespecificată, IPv4 încorporat (mapat, compatibil, NAT64, 6to4) cu IPv4 privat, ULA, link-local, multicast, documentație, Teredo.
function esteIpv6Privat(t: string): boolean {
  const o = octetiIpv6(t);
  if (!o) return true;
  const v4 = (i: number) => esteIpPrivat(`${o[i]}.${o[i + 1]}.${o[i + 2]}.${o[i + 3]}`);
  const zero = (de: number, pana: number) => o.slice(de, pana).every((x) => x === 0);
  if (zero(0, 12)) return o[12] === 0 && o[13] === 0 && o[14] === 0 && o[15] <= 1 ? true : v4(12); // ::, ::1 și ::a.b.c.d (compatibil)
  if (zero(0, 10) && o[10] === 255 && o[11] === 255) return v4(12); // ::ffff:a.b.c.d (mapat)
  if (o[0] === 0x00 && o[1] === 0x64 && o[2] === 0xff && o[3] === 0x9b && zero(4, 12)) return v4(12); // 64:ff9b::/96 (NAT64)
  if (o[0] === 0x20 && o[1] === 0x02) return v4(2); // 2002::/16 (6to4)
  if (o[0] === 0x20 && o[1] === 0x01 && o[2] === 0x00 && (o[3] === 0x00 || o[3] === 0x02)) return true; // Teredo și benchmarking
  if (o[0] === 0x20 && o[1] === 0x01 && o[2] === 0x0d && o[3] === 0xb8) return true; // documentație
  if ((o[0] & 0xfe) === 0xfc) return true; // fc00::/7
  if (o[0] === 0xfe && (o[1] & 0xc0) === 0x80) return true; // fe80::/10
  if (o[0] === 0xff) return true; // multicast
  return false;
}

// Numele de server pe care nu îl acceptăm: fără punct, interne (.local, .internal, .localhost), „localhost”, sau IP privat scris direct.
export function esteHostInterzis(host: string): boolean {
  const t = host.trim().toLowerCase().replace(/\.$/, "");
  if (!t || t === "localhost" || t.endsWith(".localhost") || t.endsWith(".local") || t.endsWith(".internal") || t.endsWith(".lan") || t.endsWith(".home") || t.endsWith(".corp")) return true;
  if (RE_IPV4.test(t) || t.includes(":")) return esteIpPrivat(t);
  return !RE_HOST.test(t);
}

export type EroareCont = "adresa" | "smtp_host" | "smtp_port" | "imap_host" | "imap_port" | "utilizator" | "parola";

export type DateCont = {
  adresa: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  parola: string; // gol = rămâne cea salvată
};

// Validare și curățare (înainte de a atinge rețeaua sau baza de date). Întoarce datele curate sau lista câmpurilor greșite.
export function valideazaDateCont(x: Partial<DateCont>, areParolaSalvata: boolean): { ok: true; date: DateCont } | { ok: false; erori: EroareCont[] } {
  const erori: EroareCont[] = [];
  const adresa = String(x.adresa ?? "").trim().toLowerCase();
  const smtpHost = String(x.smtpHost ?? "").trim().toLowerCase();
  const imapHost = String(x.imapHost ?? "").trim().toLowerCase();
  const smtpPort = Number(x.smtpPort);
  const imapPort = Number(x.imapPort);
  const smtpUser = String(x.smtpUser ?? "").trim() || adresa;
  const imapUser = String(x.imapUser ?? "").trim() || adresa;
  const parola = String(x.parola ?? "");
  if (adresa.length > 254 || !RE_EMAIL.test(adresa)) erori.push("adresa");
  if (esteHostInterzis(smtpHost)) erori.push("smtp_host");
  if (!PORTURI_SMTP.includes(smtpPort)) erori.push("smtp_port");
  if (esteHostInterzis(imapHost)) erori.push("imap_host");
  if (!PORTURI_IMAP.includes(imapPort)) erori.push("imap_port");
  if (smtpUser.length > 254 || imapUser.length > 254 || /[\r\n]/.test(smtpUser + imapUser)) erori.push("utilizator");
  if (!parola && !areParolaSalvata) erori.push("parola");
  if (parola.length > 200 || /[\r\n]/.test(parola)) erori.push("parola");
  return erori.length ? { ok: false, erori: [...new Set(erori)] } : { ok: true, date: { adresa, smtpHost, smtpPort, smtpUser, imapHost, imapPort, imapUser, parola } };
}

export type SugestieServere = { smtpHost: string; smtpPort: number; imapHost: string; imapPort: number; nota?: "parola_aplicatie" };

// Sugestii de completare după furnizorul adresei (colegii ne-tehnici nu știu serverele). Pentru un domeniu propriu nu sugerăm nimic.
export function sugereazaServere(adresa: string): SugestieServere | null {
  const d = (adresa.split("@")[1] ?? "").trim().toLowerCase();
  if (d === "gmail.com" || d === "googlemail.com") return { smtpHost: "smtp.gmail.com", smtpPort: 465, imapHost: "imap.gmail.com", imapPort: 993, nota: "parola_aplicatie" };
  if (["outlook.com", "hotmail.com", "live.com", "office365.com"].includes(d)) return { smtpHost: "smtp.office365.com", smtpPort: 587, imapHost: "outlook.office365.com", imapPort: 993, nota: "parola_aplicatie" };
  if (d === "yahoo.com" || d === "yahoo.ro") return { smtpHost: "smtp.mail.yahoo.com", smtpPort: 465, imapHost: "imap.mail.yahoo.com", imapPort: 993, nota: "parola_aplicatie" };
  if (d === "zoho.com" || d === "zoho.eu") return { smtpHost: "smtp.zoho.eu", smtpPort: 465, imapHost: "imap.zoho.eu", imapPort: 993 };
  return null;
}

// Parola nu are voie să ajungă în mesajele de eroare arătate utilizatorului sau trimise la monitorizare.
export function ascundeSecret(text: string, secret: string): string {
  return secret.length >= 4 ? text.split(secret).join("•••") : text;
}
