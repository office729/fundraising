// Validare IBAN — algoritmul standard ISO 13616 (mod 97), valabil pentru
// orice țară, nu doar România. Folosit la conturile de Formular 230, ca un
// IBAN scris greșit (o cifră lipsă/în plus) să nu ajungă needetectat pe
// documentul oficial descărcat.
export function ibanValid(ibanBrut: string): boolean {
  const iban = ibanBrut.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

  const rearanjat = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearanjat.replace(/[A-Z]/g, (litera) => String(litera.charCodeAt(0) - 55));

  // mod 97 pe un număr prea mare pentru Number — calculat pe bucăți, ca la
  // împărțirea lungă (fiecare pas rămâne sub limita sigură pentru numere întregi).
  let rest = 0;
  for (const cifra of numeric) {
    rest = (rest * 10 + Number(cifra)) % 97;
  }
  return rest === 1;
}

// CIF/CUI românesc — verificare de FORMAT (2-10 cifre, cu/fără prefixul "RO"),
// nu checksum-ul complet (algoritmul are excepții pe care nu le riscăm să le
// implementăm greșit și să respingem CIF-uri reale).
export function cifValidFormat(cifBrut: string): boolean {
  const cif = cifBrut.trim().toUpperCase().replace(/^RO/, "");
  return /^\d{2,10}$/.test(cif);
}
