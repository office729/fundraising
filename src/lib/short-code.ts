import { randomBytes } from "node:crypto";

// Cod scurt stil Bitly (bază62, fără caractere ambigue O/0/I/l) — folosit
// pentru link-urile publice ale conturilor de Formular 230 (/s/<cod>).
// 7 caractere din alfabetul de mai jos = peste 3,5 miliarde de combinații,
// suficient să nu fie nevoie de o schemă mai complexă.
const ALFABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function genereazaCodScurt(lungime = 7): string {
  const bytes = randomBytes(lungime);
  let cod = "";
  for (let i = 0; i < lungime; i++) {
    cod += ALFABET[bytes[i] % ALFABET.length];
  }
  return cod;
}

// Spre deosebire de un slug (unde un duplicat primește un sufix numeric —
// vezi lib/unique-slug.ts), un cod scurt trebuie regenerat complet la
// coliziune, altfel și-ar pierde scopul (rămâne scurt). Coliziunea e oricum
// extrem de improbabilă la 7 caractere din 58 posibile pe poziție.
export async function genereazaCodScurtUnic(existaDeja: (cod: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const cod = genereazaCodScurt();
    if (!(await existaDeja(cod))) return cod;
  }
  throw new Error("Nu s-a putut genera un cod scurt unic.");
}
