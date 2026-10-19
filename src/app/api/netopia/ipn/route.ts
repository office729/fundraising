import { NextResponse } from "next/server";

import { proceseazaRezultatPlataNetopia } from "@/lib/billing/netopia-confirm";
import { extrageRezultatDinIpn, rezumatIpnNeverificat, verificaIpn } from "@/lib/netopia";
import { raporteazaAvertismentLimitat, raporteazaEroare } from "@/lib/monitoring";

// IPN Netopia — singurul loc care confirmă o plată de abonament PORNITĂ
// INTERACTIV (card nou, pe pagina găzduită de Netopia). Reînnoirile automate
// (card salvat) se confirmă direct din răspunsul sincron al taxării — vezi
// api/cron/netopia-reinnoire — dar dacă Netopia trimite oricum un IPN și pentru
// ele, ajunge tot aici și e la fel de sigur: proceseazaRezultatPlataNetopia e
// idempotentă (UPDATE condiționat pe status, un IPN retrimis nu face nimic).
//
// Niciun acces nu se acordă din redirectul clientului, doar de aici, după ce
// semnătura JWT din `Verification-token` e validă (cheia publică a POS-ului) și
// hash-ul corpului coincide cu `sub` — vezi verificaIpn(). Facturarea Oblio e
// centralizată în proceseazaRezultatPlataNetopia (best-effort, după commit).

const ACK = { errorType: 0, errorCode: 0, errorMessage: "" };

export async function POST(req: Request) {
  const corp = await req.text();

  const verificare = verificaIpn(corp, req.headers.get("verification-token"));
  if (!verificare.ok) {
    // Ce spune corpul (status + cod eroare Netopia), doar în log: motivul real al unei plăți respinse e aici chiar dacă notificarea nu e acceptată.
    const rezumat = verificare.motiv === "lipseste_token" || verificare.motiv === "token_invalid" ? "" : rezumatIpnNeverificat(corp);
    console.error("IPN Netopia respins:", verificare.motiv, verificare.detalii ?? "", rezumat);
    // Lipsa tokenului / un token malformat = cereri de la scanere; restul (semnătură, audiență, hash, expirat, cheie neconfigurată) înseamnă
    // fie o configurare greșită (cheia publică a POS-ului), fie o încercare reală — iar plățile rămân neconfirmate până la reconciliere.
    if (verificare.motiv !== "lipseste_token" && verificare.motiv !== "token_invalid") {
      raporteazaAvertismentLimitat("netopia-ipn", `IPN respins (${verificare.motiv}): plățile nu se confirmă prin IPN până se rezolvă`, verificare.motiv, {
        motiv: verificare.motiv,
        ...(verificare.detalii ? { detalii: verificare.detalii } : {}),
        ...(rezumat ? { corp: rezumat } : {}),
      });
    }
    return NextResponse.json({ errorType: 2, errorCode: 1, errorMessage: "verificare esuata" }, { status: 400 });
  }

  const parsat = extrageRezultatDinIpn(corp);
  if (!parsat?.orderId || !Number.isFinite(parsat.rezultat.status)) {
    raporteazaAvertismentLimitat("netopia-ipn", "IPN cu semnătură validă, dar fără orderID/status", "campuri_lipsa");
    return NextResponse.json({ errorType: 2, errorCode: 2, errorMessage: "campuri lipsa" }, { status: 400 });
  }

  try {
    await proceseazaRezultatPlataNetopia(parsat.orderId, parsat.rezultat);
  } catch (e) {
    raporteazaEroare("netopia-ipn", e, { orderId: parsat.orderId });
    return NextResponse.json({ errorType: 1, errorCode: 3, errorMessage: "eroare temporara" }, { status: 500 });
  }

  return NextResponse.json(ACK);
}
