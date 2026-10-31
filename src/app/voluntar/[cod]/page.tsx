import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ETICHETE_INSCRIERE } from "@/lib/voluntari-activitati";
import { ziuaRo } from "@/lib/voluntari-panou";
import { campaniaSaptamanii, campaniiVizibile, cuOrg, progresCampanie, rezolvaCod, vizitatorDinCookie } from "@/lib/voluntari-panou-server";
import { activitatiPentruVoluntar, istoricPentruVoluntar, sarciniPentruVoluntar } from "@/lib/voluntari-public";
import { eq } from "drizzle-orm";
import { volunteerVisitors } from "@/lib/db/schema";
import { VOLUNTAR_UI_DICT } from "@/lib/i18n/dictionaries/voluntar-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { PanouShell } from "./shell";
import { VoluntarClient, type CampaniePentruLista, type Urmatoarea } from "./voluntar-client";
import { TelefonForm, WelcomeForm } from "./welcome-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ cod: string }> }): Promise<Metadata> {
  const link = await rezolvaCod((await params).cod);
  const t = VOLUNTAR_UI_DICT[await getLocale()];
  return { title: link ? t.metaVoluntariOrg(link.org.nume) : t.metaVoluntari };
}

const FUS = "Europe/Bucharest";
const dataOra = (d: Date, n: string) => d.toLocaleString(n, { timeZone: FUS, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// Pagina voluntarului: două căi (online și pe teren) și „următoarea acțiune”, ca să nu fie nevoie de instruire.
export default async function PaginaVoluntar({ params }: { params: Promise<{ cod: string }> }) {
  const { cod } = await params;
  const locale = await getLocale();
  const d = VOLUNTAR_UI_DICT[locale];
  const link = await rezolvaCod(cod);
  if (!link) notFound();
  const { org } = link;

  const date = await cuOrg(org.id, async (tx) => {
    const v = await vizitatorDinCookie(tx, org.id);
    if (!v) return null;
    const acum = new Date();
    const [sarcini, activitati, istoric, campanii, vedetaId, [vizitator]] = await Promise.all([
      sarciniPentruVoluntar(tx, org.id, org.slug, v.id, ziuaRo()),
      activitatiPentruVoluntar(tx, org.id, v.id, acum),
      istoricPentruVoluntar(tx, org.id, v.id),
      campaniiVizibile(tx, org.id),
      campaniaSaptamanii(tx, org.id),
      tx.select({ email: volunteerVisitors.email, acord: volunteerVisitors.acordInvitatii }).from(volunteerVisitors).where(eq(volunteerVisitors.id, v.id)).limit(1),
    ]);
    return { v, sarcini, activitati, istoric, campanii, vedetaId, email: vizitator?.email ?? null, acord: vizitator?.acord ?? false, acum };
  });

  if (!date) {
    return (
      <PanouShell
        org={org}
        locale={locale}
        antet={
          <div className="mt-5">
            <h1 className="font-display text-[26px] leading-tight font-bold">{d.pagina.vreiSaAjuti}</h1>
            <p className="mt-1.5 max-w-md text-[15px] opacity-95">{d.pagina.vreiSaAjutiDesc}</p>
          </div>
        }
      >
        <WelcomeForm cod={cod} orgNume={org.nume} locale={locale} />
      </PanouShell>
    );
  }

  const { v, sarcini, activitati, istoric, campanii, vedetaId, email, acord, acum } = date;

  // Următoarea acțiune, în ordinea utilității: o înscriere care urmează, o sarcină începută, o sarcină nouă, o activitate cu locuri.
  let urmatoarea: Urmatoarea = null;
  const inscrieriViitoare = activitati
    .flatMap((a) => a.ture.filter((t) => t.inscrierea && ["confirmata", "in_asteptare", "rezerva"].includes(t.inscrierea.status)).map((t) => ({ a, t })))
    .sort((x, y) => x.t.inceputLa.localeCompare(y.t.inceputLa))[0];
  const sarcinaInceputa = sarcini.find((s) => s.stareMea === "angajat");
  const sarcinaNoua = sarcini.find((s) => s.stareMea === null);
  const activitateLibera = activitati.find((a) => a.ture.some((t) => !t.inscrierea && t.ocupate < t.locuri));
  if (inscrieriViitoare) {
    urmatoarea = {
      tip: "inscriere",
      id: inscrieriViitoare.a.id,
      titlu: inscrieriViitoare.a.titlu,
      detaliu: `${dataOra(new Date(inscrieriViitoare.t.inceputLa), d.numere)} · ${d.statusInscriere[inscrieriViitoare.t.inscrierea!.status] ?? ETICHETE_INSCRIERE[inscrieriViitoare.t.inscrierea!.status as keyof typeof ETICHETE_INSCRIERE] ?? ""}`,
    };
  } else if (sarcinaInceputa) {
    urmatoarea = { tip: "sarcina", id: sarcinaInceputa.id, titlu: d.pagina.termina(sarcinaInceputa.titlu), detaliu: d.pagina.inceputaDetaliu };
  } else if (sarcinaNoua) {
    urmatoarea = {
      tip: "sarcina",
      id: sarcinaNoua.id,
      titlu: sarcinaNoua.titlu,
      detaliu: sarcinaNoua.minuteEstimate ? d.pagina.sarcinaMinute(sarcinaNoua.minuteEstimate) : d.pagina.sarcinaAcasa,
    };
  } else if (activitateLibera) {
    urmatoarea = { tip: "activitate", id: activitateLibera.id, titlu: activitateLibera.titlu, detaliu: `${dataOra(new Date(activitateLibera.inceputLa), d.numere)} · ${activitateLibera.locatie}` };
  }
  void acum;

  const dupaId = new Map(campanii.map((c) => [c.id, c]));
  const vedeta = vedetaId ? dupaId.get(vedetaId) : undefined;
  const listaCampanii: CampaniePentruLista[] = [...(vedeta ? [vedeta] : []), ...campanii.filter((c) => c.id !== vedetaId)].map((c) => ({ slug: c.slug, titlu: c.titlu, progres: progresCampanie(c) }));

  return (
    <PanouShell org={org} locale={locale} antet={<h1 className="mt-4 font-display text-[28px] leading-tight font-bold">{d.pagina.buna(v.prenume)}</h1>}>
      <VoluntarClient
        locale={locale}
        cod={cod}
        orgNume={org.nume}
        sarcini={sarcini}
        activitati={activitati}
        istoric={istoric}
        campanii={listaCampanii}
        emailMeu={email}
        acordInvitatii={acord}
        urmatoarea={urmatoarea}
        legatCrm={!!v.voluntarId}
      />
      {v.voluntarId ? (
        <p className="flex items-center gap-2 rounded-xl bg-[var(--vp-green-bg)] px-4 py-3 text-[13.5px] font-semibold text-[var(--vp-green)]">
          <Check className="size-4" aria-hidden /> {d.pagina.contributie}
        </p>
      ) : !v.telefon ? (
        <TelefonForm cod={cod} locale={locale} />
      ) : null}
    </PanouShell>
  );
}
