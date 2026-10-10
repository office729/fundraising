import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { volunteerActivities, volunteerShifts, volunteerSignups } from "@/lib/db/schema";
import { UUID_REGEX } from "@/lib/voluntari-activitati";
import { cuOrg, rezolvaCod, vizitatorDinCookie } from "@/lib/voluntari-panou-server";
import { inFereastraCheckin, tokenPrezentaValid } from "@/lib/voluntari-prezenta";

import { PanouShell } from "../../shell";

import { ConfirmaPrezenta } from "./confirma-prezenta";

export const dynamic = "force-dynamic";

const FUS = "Europe/Bucharest";
const ora = (d: Date) => d.toLocaleTimeString("ro-RO", { timeZone: FUS, hour: "2-digit", minute: "2-digit" });

// Pagina deschisă când voluntarul scanează codul QR al turei. Nu înregistrează nimic singură: arată un buton „Confirmă prezența”.
export default async function PaginaPrezenta({ params, searchParams }: { params: Promise<{ cod: string; shiftId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { cod, shiftId } = await params;
  const { t } = await searchParams;
  const link = await rezolvaCod(cod);
  if (!link || !UUID_REGEX.test(shiftId)) notFound();
  const { org } = link;

  const stare = await cuOrg(org.id, async (tx) => {
    const v = await vizitatorDinCookie(tx, org.id);
    const [tura] = await tx
      .select({ nume: volunteerShifts.nume, inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa, titlu: volunteerActivities.titlu, stareActivitate: volunteerActivities.stare })
      .from(volunteerShifts)
      .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerShifts.activityId))
      .where(and(eq(volunteerShifts.id, shiftId), eq(volunteerShifts.orgId, org.id)))
      .limit(1);
    if (!tura) return { tip: "negasit" as const };
    if (!v) return { tip: "fara-sesiune" as const, tura };
    const [inscriere] = await tx
      .select({ status: volunteerSignups.status })
      .from(volunteerSignups)
      .where(and(eq(volunteerSignups.shiftId, shiftId), eq(volunteerSignups.visitorId, v.id), eq(volunteerSignups.orgId, org.id)))
      .limit(1);
    return { tip: "ok" as const, tura, prenume: v.prenume, inscriere: inscriere?.status ?? null };
  });
  if (stare.tip === "negasit") notFound();

  const tokenBun = tokenPrezentaValid(shiftId, t ?? "");
  let continut: React.ReactNode;
  if (!tokenBun) {
    continut = <Mesaj titlu="Codul a expirat" text="Codul QR se schimbă la câteva minute. Cere coordonatorului să-ți arate codul curent și scanează-l din nou." />;
  } else if (stare.tip === "fara-sesiune") {
    continut = (
      <Mesaj titlu="Intră mai întâi pe pagina ta de voluntar" text="Ca să te găsim în lista celor înscriși, deschide pagina ta de voluntar pe acest telefon, apoi scanează din nou codul.">
        <Link href={`/voluntar/${cod}`} className="mt-3 inline-flex rounded-xl bg-[var(--vp-brand)] px-4 py-2.5 text-[14.5px] font-semibold text-white">
          Deschide pagina de voluntar
        </Link>
      </Mesaj>
    );
  } else if (stare.tura.stareActivitate === "anulata") {
    continut = <Mesaj titlu="Activitatea a fost anulată" text="Nu mai putem înregistra prezența la ea." />;
  } else if (!inFereastraCheckin(stare.tura.inceputLa, stare.tura.seTerminaLa)) {
    continut = <Mesaj titlu="Încă nu e momentul" text={`Prezența se poate confirma de la o jumătate de oră înainte de începutul turei (${ora(stare.tura.inceputLa)}) și până la o oră după sfârșitul ei.`} />;
  } else if (!stare.inscriere || !["confirmata", "prezent"].includes(stare.inscriere)) {
    continut = <Mesaj titlu="Nu ești înscris(ă) la această tură" text="Dacă ești aici, spune-i coordonatorului: te poate adăuga pe loc." />;
  } else if (stare.inscriere === "prezent") {
    continut = <Mesaj titlu={`Prezența ta e deja confirmată, ${stare.prenume}`} text="Mulțumim că ești aici!" bun />;
  } else {
    continut = (
      <div className="rounded-2xl border border-[var(--vp-line)] bg-white p-5">
        <h2 className="text-[18px] font-bold">
          Bună, {stare.prenume}! Ești la „{stare.tura.titlu}”?
        </h2>
        <p className="mt-1 text-[14px] text-[var(--vp-muted)]">
          {stare.tura.nume} · {ora(stare.tura.inceputLa)} – {ora(stare.tura.seTerminaLa)}
        </p>
        <ConfirmaPrezenta cod={cod} shiftId={shiftId} token={t ?? ""} />
      </div>
    );
  }

  return (
    <PanouShell org={org} antet={<h1 className="mt-4 font-display text-[24px] leading-tight font-bold">Confirmă prezența</h1>}>
      {continut}
    </PanouShell>
  );
}

function Mesaj({ titlu, text, bun = false, children }: { titlu: string; text: string; bun?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 ${bun ? "border-[var(--vp-green)]/40 bg-[var(--vp-green-bg)]" : "border-[var(--vp-line)] bg-white"}`}>
      <h2 className="text-[18px] font-bold">{titlu}</h2>
      <p className="mt-1 text-[14.5px] text-[var(--vp-muted)]">{text}</p>
      {children}
    </div>
  );
}
