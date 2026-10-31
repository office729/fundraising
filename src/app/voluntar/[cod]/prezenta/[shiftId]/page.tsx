import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { volunteerActivities, volunteerShifts, volunteerSignups } from "@/lib/db/schema";
import { VOLUNTAR_UI_DICT } from "@/lib/i18n/dictionaries/voluntar-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { UUID_REGEX } from "@/lib/voluntari-activitati";
import { cuOrg, rezolvaCod, vizitatorDinCookie } from "@/lib/voluntari-panou-server";
import { inFereastraCheckin, tokenPrezentaValid } from "@/lib/voluntari-prezenta";

import { PanouShell } from "../../shell";

import { ConfirmaPrezenta } from "./confirma-prezenta";

export const dynamic = "force-dynamic";

const FUS = "Europe/Bucharest";
const ora = (d: Date, n: string) => d.toLocaleTimeString(n, { timeZone: FUS, hour: "2-digit", minute: "2-digit" });

// Pagina deschisă când voluntarul scanează codul QR al turei. Nu înregistrează nimic singură: arată un buton „Confirmă prezența”.
export default async function PaginaPrezenta({ params, searchParams }: { params: Promise<{ cod: string; shiftId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { cod, shiftId } = await params;
  const { t } = await searchParams;
  const locale = await getLocale();
  const d = VOLUNTAR_UI_DICT[locale];
  const p = d.prezenta;
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
    continut = <Mesaj titlu={p.expirat} text={p.expiratText} />;
  } else if (stare.tip === "fara-sesiune") {
    continut = (
      <Mesaj titlu={p.intraMai} text={p.intraMaiText}>
        <Link href={`/voluntar/${cod}`} className="mt-3 inline-flex rounded-xl bg-[var(--vp-brand)] px-4 py-2.5 text-[14.5px] font-semibold text-white">
          {p.deschide}
        </Link>
      </Mesaj>
    );
  } else if (stare.tura.stareActivitate === "anulata") {
    continut = <Mesaj titlu={p.anulata} text={p.anulataText} />;
  } else if (!inFereastraCheckin(stare.tura.inceputLa, stare.tura.seTerminaLa)) {
    continut = <Mesaj titlu={p.inca} text={p.incaText(ora(stare.tura.inceputLa, d.numere))} />;
  } else if (!stare.inscriere || !["confirmata", "prezent"].includes(stare.inscriere)) {
    continut = <Mesaj titlu={p.neinscris} text={p.neinscrisText} />;
  } else if (stare.inscriere === "prezent") {
    continut = <Mesaj titlu={p.deja(stare.prenume)} text={p.dejaText} bun />;
  } else {
    continut = (
      <div className="rounded-2xl border border-[var(--vp-line)] bg-white p-5">
        <h2 className="text-[18px] font-bold">
          {p.buna(stare.prenume, stare.tura.titlu)}
        </h2>
        <p className="mt-1 text-[14px] text-[var(--vp-muted)]">
          {stare.tura.nume} · {ora(stare.tura.inceputLa, d.numere)} – {ora(stare.tura.seTerminaLa, d.numere)}
        </p>
        <ConfirmaPrezenta cod={cod} shiftId={shiftId} token={t ?? ""} locale={locale} />
      </div>
    );
  }

  return (
    <PanouShell org={org} locale={locale} antet={<h1 className="mt-4 font-display text-[24px] leading-tight font-bold">{p.titlu}</h1>}>
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
