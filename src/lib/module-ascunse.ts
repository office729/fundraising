// Module ascunse temporar: codul rămâne, dar nu apar în meniu, pagina nu se deschide, iar textele publice nu le mai promit.
// Pune true / scoate din listă ca să reapară (avatar: readaugă și rândurile scoase din hub.ts și cum-functioneaza.ts).
export const AVATAR_DONATOR_ACTIV = false;

// Pagini din CRM ascunse (segmentul de după /crm/). Intrarea din meniu dispare, iar adresa directă redirecționează la panou.
export const PAGINI_CRM_ASCUNSE: readonly string[] = ["donatii", "fonduri-plati", "comunicare"];
export const paginaCrmAscunsa = (cale: string): boolean => PAGINI_CRM_ASCUNSE.includes(cale);
