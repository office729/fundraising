import { raporteazaEroare } from "@/lib/monitoring";

// Eroare al cărei mesaj e scris PENTRU utilizator (limită de pachet, "adresa e
// deja folosită", invitație expirată) — singura care ajunge nemodificată în
// interfață. Orice altă excepție (Drizzle cu interogarea și parametrii ei,
// erori de rețea, TypeError) are un mesaj tehnic care nu trebuie să iasă din
// server, deci utilizatorul primește un text fix, iar detaliul merge în Sentry.
export class EroareUtilizator extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "EroareUtilizator";
  }
}

export function mesajSigur(e: unknown, fallback: string, zona: string): string {
  if (e instanceof EroareUtilizator) return e.message;
  // redirect()/notFound() din Next.js se implementează prin excepții — nu sunt
  // erori de raportat sau de ascuns, trebuie lăsate să treacă.
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) {
    throw e;
  }
  raporteazaEroare(zona, e);
  return fallback;
}
