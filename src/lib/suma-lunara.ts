// Suma lunară propusă unui donator care tocmai a donat o singură dată: aproximativ un sfert din donație, rotunjit la 5 lei, între 10 și 50 de lei.
// Mică pe înțelesul donatorului („chiar mică”, cum spune și mesajul de mulțumire), dar suficientă cât să conteze la planificarea ajutorului. Funcție pură.
export function sumaLunaraSugerata(suma: number): number {
  if (!Number.isFinite(suma) || suma <= 0) return 20;
  const sfert = Math.round(suma / 4 / 5) * 5;
  return Math.min(50, Math.max(10, sfert));
}
