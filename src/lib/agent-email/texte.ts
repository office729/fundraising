// Mesaje scurte, în română și engleză, pentru erorile de conectare la căsuța de email (fără date tehnice sensibile). Fără importuri de valori.
import type { EroareConexiune } from "./conexiuni";

type Tr = (ro: string, en: string) => string;

export function textEroareConexiune(t: Tr, e: EroareConexiune, ce: "SMTP" | "IMAP"): string {
  const detaliu = e.detaliu ? ` (${e.detaliu.slice(0, 160)})` : "";
  switch (e.cod) {
    case "host":
      return t(`Serverul ${ce} nu e acceptat sau nu se găsește. Verifică adresa lui (ex. smtp.firma.ro).`, `The ${ce} server is not accepted or cannot be found. Check its address (e.g. smtp.company.com).`);
    case "auth":
      return t(`${ce}: utilizatorul sau parola nu sunt acceptate. Unele furnizori (Gmail, Outlook) cer o „parolă de aplicație”, nu parola contului.`, `${ce}: the username or password was not accepted. Some providers (Gmail, Outlook) require an “app password”, not the account password.`);
    case "tls":
      return t(`${ce}: conexiunea securizată a eșuat (certificatul serverului nu e valid).${detaliu}`, `${ce}: the secure connection failed (the server certificate is not valid).${detaliu}`);
    case "timp":
      return t(`${ce}: serverul nu a răspuns la timp. Verifică portul și încearcă din nou.`, `${ce}: the server did not respond in time. Check the port and try again.`);
    case "conexiune":
      return t(`${ce}: nu m-am putut conecta la server. Verifică adresa și portul.${detaliu}`, `${ce}: could not connect to the server. Check the address and port.${detaliu}`);
    case "respins":
      return t(`Serverul de email a respins mesajul${detaliu}`, `The email server rejected the message${detaliu}`);
    default:
      return t(`${ce}: ${e.detaliu || "eroare necunoscută"}`, `${ce}: ${e.detaliu || "unknown error"}`);
  }
}
