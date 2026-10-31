import { sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { analizeazaDonator, comparaPrioritateReactivare, type Analiza } from "@/lib/analiza-donator";
import { bazaDonatori } from "@/lib/donatori-pf";

// „Pe cine contactezi primul”: analiza fiecărui donator din baza organizației (online + înregistrați manual + importați), calculată în aplicație
// din istoricul agregat. Se exclud donatorii cu abonament lunar activ (sunt la zi prin definiție), cei marcați „nu contactați” și cei dezabonați de la e-mailuri nu
// sunt excluși din listă (pot fi sunați), dar rândul arată starea.
export type RandReactivare = {
  id: string;
  nume: string;
  telefon: string | null;
  nuContactat: boolean;
  dezabonat: boolean;
  analiza: Analiza;
};

export type ReactivareDonatori = {
  total: number; // donatori analizați
  laRisc: number; // risc ridicat
  inIntarziere: number; // risc mediu
  valoareAnualaLaRisc: number; // lei pe an, doar riscul ridicat
  top: RandReactivare[];
};

const LIMITA_ANALIZA = 20000;
const TOP = 15;

export const getReactivareDonatori = withOrgSession(async (ctx): Promise<ReactivareDonatori> => {
  const rows = (await ctx.db.execute(sql`
    with ${bazaDonatori(ctx.orgId)}
    select id, nume, telefon, total::int as total, nr, prima, ultima, nu_contactat, dezabonat_email_la
    from base
    where nr >= 1 and not lunar
    order by ultima asc
    limit ${LIMITA_ANALIZA}
  `)) as unknown as { id: string; nume: string; telefon: string | null; total: number; nr: number; prima: Date | string | null; ultima: Date | string | null; nu_contactat: boolean; dezabonat_email_la: Date | string | null }[];

  const locale = await getLocale();
  const analizati: RandReactivare[] = rows.map((r) => ({
    id: r.id,
    nume: r.nume,
    telefon: r.telefon,
    nuContactat: Boolean(r.nu_contactat),
    dezabonat: Boolean(r.dezabonat_email_la),
    analiza: analizeazaDonator({ primaAt: r.prima, ultimaAt: r.ultima, nr: r.nr, total: r.total }, new Date(), locale),
  }));

  const deContactat = analizati.filter((x) => (x.analiza.risc === "ridicat" || x.analiza.risc === "mediu") && !x.nuContactat);
  deContactat.sort((a, b) => comparaPrioritateReactivare(a.analiza, b.analiza));
  const laRisc = analizati.filter((x) => x.analiza.risc === "ridicat");
  return {
    total: analizati.length,
    laRisc: laRisc.length,
    inIntarziere: analizati.filter((x) => x.analiza.risc === "mediu").length,
    valoareAnualaLaRisc: laRisc.reduce((s, x) => s + (x.analiza.valoareAnuala ?? 0), 0),
    top: deContactat.slice(0, TOP),
  };
});
