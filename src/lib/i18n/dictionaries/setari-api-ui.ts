import type { Locale } from "../config";

// Setări → API și webhook-uri și Câmpuri personalizate (setari/api-section.tsx, setari/campuri-section.tsx).
export const SETARI_API_UI_DICT = {
  ro: {
    api: {
      titlu: "API și webhook-uri",
      intro:
        "Conectează Alexandrit la alte instrumente (Make, Zapier, site-ul tău): le dai o cheie ca să citească donatorii și donațiile, sau o adresă la care îți trimitem un mesaj de fiecare dată când o donație reușește ori un donator se dezabonează.",
      niciodata: "niciodată",
      stari: { trimis: "Trimis", in_asteptare: "În așteptare", esuat: "Eșuat" } as Record<string, string>,
      secret: {
        copiaza: "Copiază-o acum și păstreaz-o într-un loc sigur. Nu o mai poți vedea după ce închizi acest mesaj.",
        copiat: "Copiat",
        copiazaBtn: "Copiază",
        amSalvat: "Am salvat-o",
      },
      chei: {
        titlu: "Chei API",
        nicio: "Nicio cheie încă.",
        revocata: "Revocată",
        activa: "Activă",
        creata: "creată",
        folosita: "folosită",
        revocaAcum: "Revocă acum",
        renunta: "Renunță",
        revoca: "Revocă",
        avertisment: "Cheia încetează imediat să funcționeze, iar integrările care o folosesc vor primi eroare. Nu se poate anula.",
        creeazaTitlu: "Creează o cheie",
        numeEticheta: "Nume (pentru ce o folosești)",
        numePh: "ex. Integrarea cu Make",
        permisiuni: "Ce are voie să facă",
        creeazaBtn: "Creează cheia",
        cheieNoua: "Cheia API nouă",
      },
      hooks: {
        titlu: "Adrese pentru evenimente (webhook-uri)",
        nicio: "Nicio adresă încă.",
        activa: "Activă",
        oprita: "Oprită",
        esecuri: (n: number) => ` · ${n} eșecuri la rând`,
        testAjuns: "Testul a ajuns la adresă.",
        testEsuat: "Testul nu a ajuns. Vezi motivul în lista de livrări de mai jos.",
        trimiteTest: "Trimite un test",
        opreste: "Oprește",
        porneste: "Pornește",
        stergeDef: "Șterge definitiv",
        renunta: "Renunță",
        sterge: "Șterge",
        adaugaTitlu: "Adaugă o adresă",
        faraCriptare: "Păstrarea secretelor nu e configurată pe platformă, deci nu poți adăuga adrese încă.",
        adresa: "Adresa (https)",
        evenimente: "Ce evenimente primește",
        adaugaBtn: "Adaugă adresa",
        secretNou: "Secretul de semnare al adresei",
        motive: { "Oprit de un administrator": "Oprit de un administrator" } as Record<string, string>,
      },
      livrari: {
        titlu: "Ultimele livrări",
        nimic: "Nimic trimis încă.",
        cand: "Când",
        eveniment: "Eveniment",
        stare: "Stare",
        incercari: "Încercări",
        raspuns: "Răspuns",
        retrimite: "Retrimite",
        notaRetry: "O livrare nereușită se reia după 1, 6, 24 și 72 de ore (cel mult 5 încercări); o adresă care eșuează 20 de ori la rând se oprește singură.",
      },
      docs: {
        sumar: "Cum se folosește (pentru cine face integrarea)",
        antet: "Fiecare cerere poartă cheia în antet:",
        antet2: "Răspunsurile sunt JSON. Limită: 1.000 de cereri pe oră pe cheie.",
        curl: (baza: string) => `# donatorii (paginat: ?limit=100&dupa=<id>; filtru ?email=)
curl -H "Authorization: Bearer <cheia>" "${baza}/api/v1/donatori?limit=100"

# un donator, cu câmpurile personalizate
curl -H "Authorization: Bearer <cheia>" ${baza}/api/v1/donatori/<id>

# completează câmpuri personalizate (valoare goală = șterge)
curl -X PATCH -H "Authorization: Bearer <cheia>" -H "Content-Type: application/json" \\
  -d '{"campuri":{"cum_ne_a_gasit":"Eveniment"}}' ${baza}/api/v1/donatori/<id>

# donațiile reușite (?de_la=2026-01-01)
curl -H "Authorization: Bearer <cheia>" "${baza}/api/v1/donatii?de_la=2026-01-01"

# marchează o adresă respinsă sau reclamată
curl -X POST -H "Authorization: Bearer <cheia>" -H "Content-Type: application/json" \\
  -d '{"email":"nume@exemplu.ro","tip":"respins"}' ${baza}/api/v1/email-evenimente`,
        cheiePh: "cheia",
        sigForma: "t=<secunde>,v1=<semnătură>",
        sigText: 't + "." + corpul',
        hooks1: "Webhook-urile sunt cereri POST cu corpul JSON",
        hooks2: "Antetul",
        hooks3: "are forma",
        hooks4: "unde semnătura e HMAC-SHA256, în hexazecimal, al textului",
        hooks5: "cu secretul adresei. Verifică semnătura și refuză cererile cu",
        hooks6: "mai vechi de 5 minute. Răspunde cu orice cod 2xx ca să confirmi primirea; 410 înseamnă „nu mai trimite”.",
      },
      scopuri: {
        "donatori:citire": "Citește donatorii",
        "donatori:scriere": "Modifică câmpurile personalizate ale donatorilor",
        "donatii:citire": "Citește donațiile",
        "email:scriere": "Marchează adrese de e-mail respinse sau reclamate",
      } as Record<string, string>,
      evenimente: {
        "donatie.reusita": "O donație a reușit",
        "donator.dezabonat": "Un donator s-a dezabonat de la e-mailuri",
        "test.ping": "Test (trimis din setări)",
      } as Record<string, string>,
      nuAmSalvat: "Nu am putut salva.",
    },
    campuri: {
      nuAmSalvat: "Nu am putut salva.",
      titluGrup: { donator: "Câmpuri la donatori", companie: "Câmpuri la firme" } as Record<string, string>,
      niciunCamp: "Niciun câmp încă.",
      nume: "Nume",
      variante: "Variante (câte una pe rând)",
      avertismentVariante: "Dacă scoți o variantă, valorile deja alese rămân salvate, dar nu se mai pot alege.",
      salveaza: "Salvează",
      renunta: "Renunță",
      arhivat: "Arhivat",
      activ: "Activ",
      cheieApi: "cheie în API:",
      editeaza: "Editează",
      reactiveaza: "Reactivează",
      arhiveaza: "Arhivează",
      adaugaTitlu: "Adaugă un câmp",
      numePh: "ex. Cum ne-a găsit",
      tip: "Tip",
      variante2: "Variante (câte una pe rând, cel puțin două)",
      adaugaBtn: "Adaugă câmpul",
      titlu: "Câmpuri personalizate",
      intro:
        "Adaugă câmpurile de care are nevoie organizația ta (de exemplu „Cum ne-a găsit”, „Data nașterii”, „Participă la gală”). Apar în fișa fiecărui donator sau a fiecărei firme, în exportul de donatori și în API. Un câmp nu se șterge, se arhivează: valorile rămân.",
      tipuri: { text: "Text", numar: "Număr", data: "Dată", alegere: "Alegere din listă", da_nu: "Da / Nu" } as Record<string, string>,
    },
  },
  en: {
    api: {
      titlu: "API and webhooks",
      intro:
        "Connect Alexandrit to other tools (Make, Zapier, your website): you give them a key so they can read donors and donations, or an address where we send a message every time a donation succeeds or a donor unsubscribes.",
      niciodata: "never",
      stari: { trimis: "Sent", in_asteptare: "Pending", esuat: "Failed" } as Record<string, string>,
      secret: {
        copiaza: "Copy it now and keep it somewhere safe. You will not be able to see it again after you close this message.",
        copiat: "Copied",
        copiazaBtn: "Copy",
        amSalvat: "I have saved it",
      },
      chei: {
        titlu: "API keys",
        nicio: "No keys yet.",
        revocata: "Revoked",
        activa: "Active",
        creata: "created",
        folosita: "last used",
        revocaAcum: "Revoke now",
        renunta: "Cancel",
        revoca: "Revoke",
        avertisment: "The key stops working immediately and the integrations that use it will get an error. This cannot be undone.",
        creeazaTitlu: "Create a key",
        numeEticheta: "Name (what you use it for)",
        numePh: "e.g. Make integration",
        permisiuni: "What it is allowed to do",
        creeazaBtn: "Create the key",
        cheieNoua: "New API key",
      },
      hooks: {
        titlu: "Event addresses (webhooks)",
        nicio: "No addresses yet.",
        activa: "Active",
        oprita: "Stopped",
        esecuri: (n: number) => ` · ${n} failures in a row`,
        testAjuns: "The test reached the address.",
        testEsuat: "The test did not arrive. See the reason in the deliveries list below.",
        trimiteTest: "Send a test",
        opreste: "Stop",
        porneste: "Start",
        stergeDef: "Delete permanently",
        renunta: "Cancel",
        sterge: "Delete",
        adaugaTitlu: "Add an address",
        faraCriptare: "Secret storage is not configured on the platform, so you cannot add addresses yet.",
        adresa: "Address (https)",
        evenimente: "Which events it receives",
        adaugaBtn: "Add the address",
        secretNou: "The address's signing secret",
        motive: { "Oprit de un administrator": "Stopped by an administrator" } as Record<string, string>,
      },
      livrari: {
        titlu: "Latest deliveries",
        nimic: "Nothing sent yet.",
        cand: "When",
        eveniment: "Event",
        stare: "Status",
        incercari: "Attempts",
        raspuns: "Response",
        retrimite: "Resend",
        notaRetry: "A failed delivery is retried after 1, 6, 24 and 72 hours (at most 5 attempts); an address that fails 20 times in a row is stopped automatically.",
      },
      docs: {
        sumar: "How to use it (for whoever builds the integration)",
        antet: "Every request carries the key in the header:",
        antet2: "Responses are JSON. Limit: 1,000 requests per hour per key.",
        curl: (baza: string) => `# donors (paginated: ?limit=100&dupa=<id>; filter ?email=)
curl -H "Authorization: Bearer <key>" "${baza}/api/v1/donatori?limit=100"

# one donor, with the custom fields
curl -H "Authorization: Bearer <key>" ${baza}/api/v1/donatori/<id>

# fill in custom fields (empty value = delete)
curl -X PATCH -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \\
  -d '{"campuri":{"cum_ne_a_gasit":"Event"}}' ${baza}/api/v1/donatori/<id>

# successful donations (?de_la=2026-01-01)
curl -H "Authorization: Bearer <key>" "${baza}/api/v1/donatii?de_la=2026-01-01"

# mark a bounced or complained address
curl -X POST -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \\
  -d '{"email":"name@example.com","tip":"respins"}' ${baza}/api/v1/email-evenimente`,
        cheiePh: "key",
        sigForma: "t=<seconds>,v1=<signature>",
        sigText: 't + "." + body',
        hooks1: "Webhooks are POST requests with the JSON body",
        hooks2: "The header",
        hooks3: "has the form",
        hooks4: "where the signature is the HMAC-SHA256, in hexadecimal, of the text",
        hooks5: "using the address's secret. Verify the signature and reject requests with",
        hooks6: "older than 5 minutes. Reply with any 2xx code to confirm receipt; 410 means “stop sending”.",
      },
      scopuri: {
        "donatori:citire": "Read donors",
        "donatori:scriere": "Edit donors' custom fields",
        "donatii:citire": "Read donations",
        "email:scriere": "Mark bounced or complained email addresses",
      } as Record<string, string>,
      evenimente: {
        "donatie.reusita": "A donation succeeded",
        "donator.dezabonat": "A donor unsubscribed from emails",
        "test.ping": "Test (sent from settings)",
      } as Record<string, string>,
      nuAmSalvat: "We could not save.",
    },
    campuri: {
      nuAmSalvat: "We could not save.",
      titluGrup: { donator: "Donor fields", companie: "Company fields" } as Record<string, string>,
      niciunCamp: "No fields yet.",
      nume: "Name",
      variante: "Options (one per line)",
      avertismentVariante: "If you remove an option, values already chosen stay saved but can no longer be selected.",
      salveaza: "Save",
      renunta: "Discard",
      arhivat: "Archived",
      activ: "Active",
      cheieApi: "API key:",
      editeaza: "Edit",
      reactiveaza: "Reactivate",
      arhiveaza: "Archive",
      adaugaTitlu: "Add a field",
      numePh: "e.g. How they found us",
      tip: "Type",
      variante2: "Options (one per line, at least two)",
      adaugaBtn: "Add the field",
      titlu: "Custom fields",
      intro:
        "Add the fields your organization needs (for example “How they found us”, “Date of birth”, “Attending the gala”). They appear on every donor or company page, in the donor export and in the API. A field is never deleted, only archived: the values stay.",
      tipuri: { text: "Text", numar: "Number", data: "Date", alegere: "Choice from a list", da_nu: "Yes / No" } as Record<string, string>,
    },
  },
} satisfies Record<Locale, unknown>;
