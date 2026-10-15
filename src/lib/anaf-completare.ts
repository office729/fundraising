// Cum se completează formularul de firmă nouă cu datele aduse din ANAF. Funcție pură, fără importuri, ca să poată fi testată.

export type CampuriIdentitate = { nume: string; nrRegCom: string; judet: string; localitate: string; adresa: string; caen: string };
export type IdentitateAnaf = { denumire: string | null; nrRegCom: string | null; judet: string | null; localitate: string | null; adresa: string | null; caen: string | null };

// `suprascrie` = omul a apăsat explicit „Adu date din ANAF”: datele din ANAF înlocuiesc ce e deja scris (altfel butonul părea că nu face nimic
// când numele era completat). Căutarea automată de la ieșirea din câmpul CUI nu suprascrie niciodată ce ai scris tu. Un câmp pe care ANAF nu
// îl are rămâne neschimbat.
export function completeazaDinAnaf<T extends CampuriIdentitate>(valori: T, d: IdentitateAnaf, suprascrie: boolean): T {
  const alege = (curent: string, anaf: string | null) => (anaf && anaf.trim() && (suprascrie || !curent.trim()) ? anaf : curent);
  return {
    ...valori,
    nume: alege(valori.nume, d.denumire),
    nrRegCom: alege(valori.nrRegCom, d.nrRegCom),
    judet: alege(valori.judet, d.judet),
    localitate: alege(valori.localitate, d.localitate),
    adresa: alege(valori.adresa, d.adresa),
    caen: alege(valori.caen, d.caen),
  };
}
