// Un apel de taxare cu token poate eșua în două feluri foarte diferite:
//  - Netopia a RESPINS cererea (autentificare, cerere invalidă, limită de cereri): nu s-a procesat nimic, deci nu s-a taxat și e sigur
//    să se încerce din nou la următoarea rulare;
//  - rezultatul e NECUNOSCUT (timeout, rețea, 5xx, răspuns fără plată, comandă duplicat): Netopia ar fi putut încasa, iar o a doua taxare
//    ar lua banii de două ori. Comanda rămâne „în așteptare" și BLOCHEAZĂ orice retaxare până se lămurește.
// Codurile de mai jos sunt singurele tratate ca respingere sigură; orice altceva e considerat necunoscut.
const RESPINS_SIGUR = new Set([400, 401, 403, 404, 422, 429]);

export function respingereSigura(httpStatus: number): boolean {
  return RESPINS_SIGUR.has(httpStatus);
}

export class NetopiaRespins extends Error {
  readonly httpStatus: number;
  readonly cod: string | null;
  constructor(httpStatus: number, cod?: string | null) {
    super(`netopia_respins_${httpStatus}`);
    this.name = "NetopiaRespins";
    this.httpStatus = httpStatus;
    this.cod = cod ?? null;
  }
}
