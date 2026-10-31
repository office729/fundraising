// Schimbarea planului în mijlocul unei perioade deja plătite NU e permisă. O plată nouă înlocuiește imediat pachetul și adaugă luni
// peste perioada existentă (`greatest(sfârșit, acum) + N luni`), fără credit sau proratare: START anual (490 lei) urmat de IMPACT lunar
// (299 lei) ar da IMPACT timp de 13 luni pentru 789 lei, iar invers, un an de IMPACT plătit ar deveni, fără să vrea clientul, timp de START.
// Se permite doar reînnoirea aceluiași plan (același pachet și, la START, același număr de utilizatori suplimentari) — inclusiv trecerea
// de la lunar la anual, care nu schimbă valoarea planului. Orice altă schimbare se face după sfârșitul perioadei plătite.

export type PlanCurent = {
  package: string;
  extraUsers: number;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
};

export type PlanTinta = { package: string; extraUsers: number };

const CONTACT = "vlad.placinta@alexandrit.ro";

// Mesajul de arătat utilizatorului dacă schimbarea e blocată, sau null dacă plata poate continua.
// `locale` (implicit română) alege limba mesajului.
export function schimbarePlanBlocata(curent: PlanCurent, tinta: PlanTinta, acum: Date = new Date(), locale: "ro" | "en" = "ro"): string | null {
  const perioadaPlatitaActiva = curent.subscriptionStatus === "active" && curent.currentPeriodEnd != null && curent.currentPeriodEnd > acum;
  if (!perioadaPlatitaActiva || curent.package === "trial") return null;

  // Planul personalizat își recalculează prețul din configurație: o schimbare de configurație în mijlocul perioadei ar mări cotele pe
  // luni deja plătite. Se tratează ca orice altă schimbare.
  const extraCurent = curent.package === "start" ? curent.extraUsers : 0;
  const extraTinta = tinta.package === "start" ? tinta.extraUsers : 0;
  if (curent.package === tinta.package && curent.package !== "custom" && extraCurent === extraTinta) return null;

  if (locale === "en") {
    const dataEn = curent.currentPeriodEnd!.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    return `You already have a subscription paid until ${dataEn}. So that you do not pay twice, the plan can be changed after this date. If you need a change sooner, write to us at ${CONTACT}.`;
  }
  const data = curent.currentPeriodEnd!.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  return `Ai deja un abonament plătit până la ${data}. Ca să nu plătești de două ori, planul se poate schimba după această dată. Dacă ai nevoie de o schimbare mai devreme, scrie-ne la ${CONTACT}.`;
}
