// Adrese scurte pentru firme: primele 12 caractere hex ale UUID-ului (fără cratime), în loc de cele 36.
// Ex.: /crm/companii/f4a004e8f47f în loc de /crm/companii/f4a004e8-f47f-41d7-9697-44ba4bc8e65f.
// Adresa lungă rămâne valabilă și e redirecționată către cea scurtă.
export const LUNGIME_ID_SCURT = 12;
const HEX_SCURT = new RegExp(`^[0-9a-f]{${LUNGIME_ID_SCURT}}$`, "i");

export function idScurt(id: string): string {
  return id.replace(/-/g, "").slice(0, LUNGIME_ID_SCURT);
}
export function esteIdScurt(valoare: string): boolean {
  return HEX_SCURT.test(valoare);
}
