// Câți dintre cei 7 pași de configurare KPI sunt făcuți (aceleași condiții ca în pagina „Configurare”).
export const TOTAL_PASI_KPI = 7;

export function pasiKpiFacuti(s: { departamente: number; roluri: number; angajati: number; angajatiCuCont: number; angajatiCuManager: number; kpi: number; atribuiri: number; valori: number }): number {
  return [s.departamente > 0, s.roluri > 0, s.angajati > 0 && s.angajatiCuCont > 0, s.angajatiCuManager > 0, s.kpi > 0, s.atribuiri > 0, s.valori > 0].filter(Boolean).length;
}