import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ETICHETE_INSCRIERE } from "@/lib/voluntari-activitati";
import { ziuaRo } from "@/lib/voluntari-panou";
import { campaniaSaptamanii, campaniiVizibile, cuOrg, progresCampanie, rezolvaCod, vizitatorDinCookie } from "@/lib/voluntari-panou-server";
import { activitatiPentruVoluntar, istoricPentruVoluntar, sarciniPentruVoluntar } from "@/lib/voluntari-public";
import { eq } from "drizzle-orm";
import { volunteerVisitors } from "@/lib/db/schema";

import { PanouShell } from "./shell";
import { VoluntarClient, type CampaniePentruLista, type Urmatoarea } from "./voluntar-client";
import { TelefonForm, WelcomeForm } from "./welcome-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ cod: string }> }): Promise<Metadata> {
  const link = await rezolvaCod((await params).cod);
  return { title: link ? `Voluntari · ${link.org.nume}` : "Voluntari" };
}

const FUS = "Europe/Bucharest";
const dataOra = (d: Date) => d.toLocaleString("ro-RO", { timeZone: FUS, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// Pagina voluntarului: două căi (online și pe teren) și „următoarea acțiune”, ca să nu fie nevoie de instruire.
export default async function PaginaVoluntar({ params }: { params: Promise<{ cod: string }> }) {
  const { cod } = await params;
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
      tx.select({ email: volunteerVisitors.email }).from(volunteerVisitors).where(eq(volunteerVisitors.id, v.id)).limit(1),
    ]);
    return { v, sarcini, activitati, istoric, campanii, vedetaId, email: vizitator?.email ?? null, acum };
  });

  if (!date) {
    return (
      <PanouShell
        org={org}
        antet={
          <div className="mt-5">
            <h1 className="font-display text-[26px] leading-tight font-bold">Vrei să ajuți?</h1>
            <p className="mt-1.5 max-w-md text-[15px] opacity-95">Poți ajuta de acasă, cu sarcini mici, sau poți veni la o activitate. Alegi tu, după ce intri.</p>
          </div>
        }
      >
        <WelcomeForm cod={cod} orgNume={org.nume} />
      </PanouShell>
    );
  }

  const { v, sarcini, activitati, istoric, campanii, vedetaId, email, acum } = date;

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
      detaliu: `${dataOra(new Date(inscrieriViitoare.t.inceputLa))} · ${ETICHETE_INSCRIERE[inscrieriViitoare.t.inscrierea!.status as keyof typeof ETICHETE_INSCRIERE] ?? ""}`,
    };
  } else if (sarcinaInceputa) {
    urmatoarea = { tip: "sarcina", id: sarcinaInceputa.id, titlu: `Termină: ${sarcinaInceputa.titlu}`, detaliu: "Ai început-o. Mai ai doar de trimis mesajul și de bifat." };
  } else if (sarcinaNoua) {
    urmatoarea = {
      tip: "sarcina",
      id: sarcinaNoua.id,
      titlu: sarcinaNoua.titlu,
      detaliu: sarcinaNoua.minuteEstimate ? `O sarcină de aproximativ ${sarcinaNoua.minuteEstimate} minute, de acasă.` : "O sarcină pe care o poți face de acasă.",
    };
  } else if (activitateLibera) {
    urmatoarea = { tip: "activitate", id: activitateLibera.id, titlu: activitateLibera.titlu, detaliu: `${dataOra(new Date(activitateLibera.inceputLa))} · ${activitateLibera.locatie}` };
  }
  void acum;

  const dupaId = new Map(campanii.map((c) => [c.id, c]));
  const vedeta = vedetaId ? dupaId.get(vedetaId) : undefined;
  const listaCampanii: CampaniePentruLista[] = [...(vedeta ? [vedeta] : []), ...campanii.filter((c) => c.id !== vedetaId)].map((c) => ({ slug: c.slug, titlu: c.titlu, progres: progresCampanie(c) }));

  return (
    <PanouShell org={org} antet={<h1 className="mt-4 font-display text-[28px] leading-tight font-bold">Bună, {v.prenume}!</h1>}>
      <VoluntarClient
        cod={cod}
        orgNume={org.nume}
        sarcini={sarcini}
        activitati={activitati}
        istoric={istoric}
        campanii={listaCampanii}
        emailMeu={email}
        urmatoarea={urmatoarea}
        legatCrm={!!v.voluntarId}
      />
      {v.voluntarId ? (
        <p className="flex items-center gap-2 rounded-xl bg-[var(--vp-green-bg)] px-4 py-3 text-[13.5px] font-semibold text-[var(--vp-green)]">
          <Check className="size-4" aria-hidden /> Contribuția ta apare în fișa ta de voluntar.
        </p>
      ) : !v.telefon ? (
        <TelefonForm cod={cod} />
      ) : null}
    </PanouShell>
  );
}
