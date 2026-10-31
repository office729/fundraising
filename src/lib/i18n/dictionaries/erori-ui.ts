import type { Locale } from "../config";

// Mesaje de eroare comune, întoarse de server actions din setări și facturare.
export const ERORI_UI_DICT = {
  ro: {
    cifFolosit: "Există deja o organizație cu acest CIF pe platformă. Dacă ești reprezentantul ei, scrie-ne la vlad.placinta@alexandrit.ro.",
    cifInvalid: "CIF invalid — scrie-l cu sau fără prefixul RO (ex. RO12345678).",
    adresaSediu: "Scrie adresa sediului social (strada, număr, localitate).",
    alegeJudet: "Alege județul.",
    telefonInvalid: "Telefon invalid — scrie un număr românesc (ex. 0722 123 456).",
    telefonObligatoriu: "Scrie un număr de telefon valid (ex. 0722 123 456).",
    acordReinnoire: "Bifează acordul pentru reînnoirea automată ca să continui la plată.",
    pachetInvalid: "Pachet invalid.",
  },
  en: {
    cifFolosit: "An organization with this CIF (tax ID) already exists on the platform. If you represent it, write to us at vlad.placinta@alexandrit.ro.",
    cifInvalid: "Invalid CIF (tax ID) — enter it with or without the RO prefix (e.g. RO12345678).",
    adresaSediu: "Enter the registered office address (street, number, city).",
    alegeJudet: "Choose the county (județ).",
    telefonInvalid: "Invalid phone number — enter a Romanian number (e.g. 0722 123 456).",
    telefonObligatoriu: "Enter a valid phone number (e.g. 0722 123 456).",
    acordReinnoire: "Tick the consent for automatic renewal to continue to payment.",
    pachetInvalid: "Invalid plan.",
  },
} satisfies Record<Locale, unknown>;
