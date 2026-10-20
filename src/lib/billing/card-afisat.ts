// Cum arătăm un card salvat: doar ultimele 4 cifre („•••• 5965”). Netopia întoarce numărul mascat cu primele 6 cifre (BIN-ul băncii) și ultimele 4
// („424404*5965”); primele 6 nu au ce căuta pe ecran sau în emailuri. Folosit și la salvare (valorile noi rămân doar cu ultimele 4), și la afișare
// (valorile deja salvate în forma veche se curăță la citire). Funcție pură, fără importuri.
export function cardAfisat(masca: string | null | undefined): string | null {
  const cifre = String(masca ?? "").replace(/\D/g, "");
  if (cifre.length < 4) return null;
  return `•••• ${cifre.slice(-4)}`;
}
