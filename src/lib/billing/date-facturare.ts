// Datele minime fără de care nu emitem factura abonamentului (Oblio): CIF-ul și
// adresa sediului, plus județul (cerut de Oblio la adresă). Cerute ÎNAINTE de
// prima plată — o factură fără ele pleacă pe „persoană fizică", ceea ce pentru
// un ONG e greșit fiscal și greu de corectat după validarea în SPV.
export function dateFacturareComplete(org: { cif: string | null; adresaSediu: string | null; judet: string | null }): boolean {
  return Boolean(org.cif?.trim() && org.adresaSediu?.trim() && org.judet?.trim());
}

export const MESAJ_DATE_FACTURARE_LIPSA = "Completează CIF-ul, adresa sediului și județul organizației înainte de plată.";
