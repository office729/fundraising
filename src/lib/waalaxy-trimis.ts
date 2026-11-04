// Cum se marchează că o persoană a fost TRIMISĂ în Waalaxy (invitație LinkedIn). O singură definiție, folosită și de scriere (noteazaInvitatie în waalaxy-server.ts),
// și de filtrul „Waalaxy: trimise / netrimise” din lista Companii: o firmă e „trimisă” dacă are cel puțin un eveniment de tip invitație sau un contact cu o stare de outreach.
export const TIP_EVENIMENT_TRIMIS = "invitat"; // outreach_evenimente.tip
export const STARE_CONTACT_TRIMIS = "invitat"; // contacts.outreach_stare la trimitere (devine apoi conectat / a_raspuns / refuz)
