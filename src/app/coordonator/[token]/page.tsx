import { notFound } from "next/navigation";

import { PanouShell } from "@/app/voluntar/[cod]/shell";
import { citesteTuriCoordonator, rezolvaCodCoordonator } from "@/lib/voluntari-coordonator";
import { qrPrezentaDisponibil } from "@/lib/voluntari-prezenta";
import { cuOrg } from "@/lib/voluntari-panou-server";

import { CoordonatorClient } from "./coordonator-client";

export const dynamic = "force-dynamic";

const FUS = "Europe/Bucharest";

// Coordonatorul unei activități: lista celor înscriși pe ture, prezență dintr-un clic și codul QR de check-in.
export default async function PaginaCoordonator({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await rezolvaCodCoordonator(token);
  if (!c) notFound();
  const ture = await cuOrg(c.org.id, (tx) => citesteTuriCoordonator(tx, c.org.id, c.activitate.id));
  const a = c.activitate;

  return (
    <PanouShell
      org={c.org}
      antet={
        <div className="mt-4">
          <h1 className="font-display text-[24px] leading-tight font-bold">{a.titlu}</h1>
          <p className="mt-1 text-[14px] opacity-95">
            {a.inceputLa.toLocaleString("ro-RO", { timeZone: FUS, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {a.locatie}
            {a.localitate ? `, ${a.localitate}` : ""}
          </p>
        </div>
      }
    >
      <CoordonatorClient token={token} ture={ture} qrDisponibil={qrPrezentaDisponibil() && !!c.codVoluntari} anulata={a.stare === "anulata"} />
    </PanouShell>
  );
}
