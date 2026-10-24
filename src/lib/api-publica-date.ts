import "server-only";

import { valoriDinJson } from "@/lib/campuri-personalizate";
import type { donatoriReali } from "@/lib/db/schema";

// Forma publică a donatorului și a donației în API: câmpuri stabile, în română, fără detalii interne (starea acordurilor e simplificată).
type RandDonator = typeof donatoriReali.$inferSelect;

export function donatorPentruApi(d: RandDonator) {
  return {
    id: d.id,
    nume: d.nume,
    email: d.email,
    telefon: d.telefon,
    localitate: d.localitate,
    judet: d.judet,
    total_donat: d.totalDonat,
    numar_donatii: d.numarDonatii,
    prima_donatie_la: d.primaDonatieLa.toISOString(),
    ultima_donatie_la: d.ultimaDonatieLa.toISOString(),
    acord_email: d.consimtamantEmail,
    dezabonat: d.dezabonatEmailLa !== null,
    frecventa_email: d.frecventaEmail,
    stare_adresa_email: d.emailStare,
    campuri: valoriDinJson(d.campuri),
    adaugat_la: d.adaugatLa.toISOString(),
  };
}

export function donatiePentruApi(d: { id: string; createdAt: Date; suma: number; status: string; recurenta: boolean; emailDonator: string | null; numeDonator: string | null; campanie: string | null; campanieId: string }) {
  return {
    id: d.id,
    creat_la: d.createdAt.toISOString(),
    suma: d.suma,
    moneda: "RON",
    status: d.status,
    recurenta: d.recurenta,
    donator_email: d.emailDonator,
    donator_nume: d.numeDonator,
    campanie: d.campanie,
    campanie_id: d.campanieId,
  };
}
