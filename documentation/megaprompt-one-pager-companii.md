# Megaprompt — One Pager pentru companii (cazuri medicale + sponsorizare D177 / 20%)

> **Cum se folosește:** copiază tot blocul de mai jos (de la `<rol>` până la `</livrabil>`) într-o conversație nouă cu Claude.
> Completează întâi câmpurile marcate cu `[[...]]` din secțiunea `<date_organizatie>` și `<date_companie_tinta>`.
> Câmpurile lăsate necompletate vor fi marcate vizibil în document (`[DE COMPLETAT]`), Claude nu le va inventa.
> Datele deja trecute sunt cele din profilul „Salvează o Inimă” folosit în generatorul One Pager din platformă — verifică-le înainte de trimitere.

---

```xml
<rol>
Ești un designer senior de materiale de fundraising corporate și un copywriter specializat în
parteneriate ONG–companii din România. Ai experiență cu departamente CSR, directori financiari și
antreprenori din IMM-uri. Știi că un One Pager bun se citește în 30 de secunde, convinge în 60 și
lasă un pas următor clar. Scrii în limba română, cu diacritice corecte (ș, ț cu virgulă), ton cald
dar profesionist, fără patetism și fără clișee.
</rol>

<obiectiv>
Creează un One Pager (o singură pagină A4, format portret, gata de printat și de trimis ca PDF pe
e-mail) prin care organizația de mai jos atrage fonduri de la companii pentru cazuri medicale,
explicând clar cele două căi de sponsorizare fiscală:
  1. Sponsorizarea directă cu deducere din impozit („20%”), pe bază de contract;
  2. Redirecționarea prin Formularul 177 (D177) a sumei nefolosite pentru sponsorizare.
Documentul trebuie să arate ca un material făcut de o agenție, personalizat pentru compania-țintă,
nu ca un șablon generic.
</obiectiv>

<date_organizatie>
  Nume oficial:            Asociația Salvează o Inimă
  Site:                    salveazaoinima.ro
  E-mail parteneriate:     contact@salveazaoinima.ro
  Telefon:                 [[+40 7xx xxx xxx]]
  Persoană de contact:     [[Nume Prenume, funcție]]
  Adresă sediu:            [[adresa completă]], București, România
  CIF:                     [[CIF]]
  IBAN (cont sponsorizări):[[RO.. .... .... .... .... ....]]  Banca: [[nume bancă]]
  Înscriere în Registrul entităților/unităților de cult (RUB, ANAF): [[DA — nr./data]]
  Logo:                    [[fișier atașat sau URL]]   (dacă lipsește: wordmark tipografic elegant)
  Culori de brand:         [[cod HEX principal, cod HEX secundar]]  (dacă lipsesc: vezi <design>)
  Ani de activitate:       13
  Campanii susținute:      675+
  Donatori:                137.000+
  Companii partenere:      1.700+
  Misiune:                 Credem că niciun copil nu ar trebui să lupte singur cu o boală gravă din
                           cauza lipsei de fonduri. Conectăm oameni și companii generoase cu familii
                           aflate în nevoie, transparent și verificat, de la prima donație până la
                           recuperare.
  Ce facem:                Verificăm fiecare caz, strângem fonduri prin campanii transparente și facem
                           legătura directă între donatori și tratament — raportăm public fiecare etapă.
  Caz medical evidențiat (opțional, cu acordul familiei):
                           [[Prenume/inițiale, vârstă, diagnostic pe scurt, tratament necesar, suma
                           necesară, suma strânsă, termen, link campanie]]
  Dovezi de încredere:     [[ex.: rapoarte anuale publice, audit financiar, apariții media, parteneri
                           cunoscuți — doar ce e real și poate fi menționat]]
  Link donație / QR:       [[https://... pagina de sponsorizare sau a cazului]]
</date_organizatie>

<date_companie_tinta>
  (Completează pentru fiecare companie; dacă lipsește, generează o variantă generică și marchează locul.)
  Nume companie:           [[Nume SRL / SA]]
  Domeniu de activitate:   [[ex.: construcții, IT, retail, farma]]
  Oraș / județ:            [[...]]
  Regim fiscal:            [[impozit pe profit | microîntreprindere | necunoscut]]
  Cifră de afaceri estimată (an anterior): [[...]] lei
  Impozit pe profit/venit estimat:         [[...]] lei
  Persoana căreia îi scriem: [[Nume, funcție — ex. Administrator, CFO, Manager CSR]]
  Legătură/argument personal: [[ex.: angajați din aceeași comunitate, valori declarate, campanii CSR anterioare]]
</date_companie_tinta>

<continut_fiscal>
Explică pe înțelesul unui antreprenor, fără jargon, într-o casetă dedicată „Cum vă costă: 0 lei în plus”.
Folosește cadrul general de mai jos, dar ÎNAINTE de redactare verifică forma în vigoare a Codului fiscal
(art. 25 alin. (4) lit. i) pentru impozitul pe profit, art. 56 pentru microîntreprinderi, OPANAF privind
Formularul 177) și ajustează procentele/termenele dacă s-au modificat. Dacă nu poți verifica, păstrează
formulările și adaugă nota de subsol „Plafoanele se confirmă cu contabilul dvs.”.

  A. Sponsorizare directă („20%”) — pe bază de contract de sponsorizare:
     - Companii plătitoare de impozit pe profit: suma sponsorizată se scade din impozitul pe profit,
       în limita celei mai mici valori dintre 20% din impozitul pe profit datorat și 0,75% din cifra de afaceri.
     - Microîntreprinderi: suma se scade din impozitul pe venit, în limita a 20% din impozitul datorat
       pe trimestrul în care s-a făcut sponsorizarea.
     - Pași: contract de sponsorizare → transfer bancar în contul asociației → deducerea în declarația
       fiscală (D101, respectiv D100).

  B. Redirecționare prin Formularul 177 (D177):
     - Pentru suma rămasă nefolosită din plafon după depunerea declarației anuale, compania poate
       cere ANAF să o vireze către asociație, depunând Formularul 177.
     - Termen: în cel mult 6 luni de la termenul de depunere a declarației anuale de impozit
       (verifică termenul exact pentru anul curent).
     - Pentru companie nu presupune efort de plată: banii sunt virați de ANAF din impozitul deja datorat.

  Condiție-cheie pentru ambele: beneficiarul trebuie să fie înscris în Registrul entităților/unităților
  de cult pentru care se acordă deduceri fiscale (RUB) la data contractului / a virării — afișează
  insigna „Înscriși în Registrul ANAF (RUB)”.

  Calcul personalizat: dacă ai cifra de afaceri și impozitul companiei-țintă, calculează și afișează
  plafonul estimativ („Compania dvs. poate direcționa până la aprox. X lei”). Arată formula într-o
  notă discretă. Dacă nu ai datele, afișează un exemplu clar etichetat „Exemplu”.
</continut_fiscal>

<structura_pagina>
Ordinea vizuală, de sus în jos (respectă ierarhia; poți rearanja doar în cadrul grilei):

  1. Antet: logo + numele organizației + linie fină „Propunere de parteneriat pentru [Nume companie]”.
  2. Hero: titlu de impact (max. 10 cuvinte) + subtitlu de 1–2 rânduri care leagă compania de cauză.
     Exemplu de direcție: „Impozitul pe care îl plătiți oricum poate salva un copil.”
  3. Bandă de cifre: 4 indicatori (13 ani • 675+ campanii • 137.000+ donatori • 1.700+ companii)
     tipografie mare, etichete mici.
  4. Problema + Ce facem: două coloane scurte (max. 45 de cuvinte fiecare).
  5. Caz medical evidențiat (dacă există date): card cu fotografie sau ilustrație, sumă necesară,
     bară de progres, termen. Fără detalii medicale sensibile peste ce a aprobat familia.
  6. Caseta „Cum vă costă: 0 lei în plus” — două carduri alăturate: „Sponsorizare 20%” și „Formular 177”,
     fiecare cu 3 pași numerotați, iconițe simple, și calculul personalizat.
  7. Ce primește compania: 3–4 beneficii concrete (raport de impact cu cazul susținut, certificat de
     partener, mențiune pe site/social media la cerere, materiale pentru comunicarea internă către angajați).
  8. Încredere: insigna RUB, transparență (rapoarte publice), date de identificare (CIF, IBAN).
  9. Call-to-action: un singur pas clar („Semnăm contractul în 10 minute — vă trimitem documentele
     completate”) + QR spre pagina de sponsorizare + persoana de contact cu telefon și e-mail.
 10. Subsol: date legale mici, nota „Plafoanele se confirmă cu contabilul dvs.”, an curent.
</structura_pagina>

<design>
  - Format: A4 portret (210 × 297 mm), margini 12–14 mm, grilă de 12 coloane, totul încape pe O pagină.
  - Stil: editorial, aerisit, premium — gândit ca un raport anual de top, nu ca un flyer.
    Mult spațiu alb, aliniere strictă la grilă, maximum 2 familii de fonturi.
  - Paletă (dacă nu sunt date culori de brand): roșu-coral cald pentru inimă/cauză (#D64545),
    bleumarin profund pentru încredere și cifre (#1F2A44), fundal crem foarte deschis (#FBF8F4),
    gri cald pentru text secundar (#6B6460), un accent verde-salvie pentru zona fiscală (#4F7C6B).
    Contrast minim WCAG AA pentru tot textul.
  - Tipografie: un serif modern pentru titluri (ex. Fraunces / Playfair Display) și un sans curat
    pentru text (ex. Inter / Source Sans 3), ambele cu suport complet pentru diacritice românești.
    Ierarhie clară: H1 30–36 pt, cifre 26–30 pt, text 9,5–10,5 pt, note 7,5 pt.
  - Elemente grafice: un motiv subtil de inimă/linie de puls folosit o singură dată ca element de
    semnătură; iconițe liniare uniforme; colțuri rotunjite discrete (6–8 px); umbre aproape inexistente.
  - Personalizare vizuală: numele companiei-țintă apare în antet și în hero; dacă știi culoarea
    companiei, folosește-o doar ca accent fin (ex. linia de sub numele ei), niciodată dominant.
  - Imagini: nu folosi fotografii stock cu copii bolnavi. Dacă nu există fotografie aprobată, folosește
    ilustrație abstractă/caldă sau doar tipografie.
  - Accesibilitate și print: text real (nu imagine), fără fundaluri complet colorate pe toată pagina
    (economie de toner), toate elementele lizibile și în print alb-negru.
</design>

<reguli_continut>
  - Nu inventa cifre, nume, parteneri, citate sau rezultate. Ce lipsește se marchează „[DE COMPLETAT]”.
  - Max. 350–420 de cuvinte în total pe pagină. Fiecare frază trebuie să-și câștige locul.
  - Vorbește despre beneficiul companiei înainte de nevoia organizației.
  - Un singur call-to-action principal.
  - Fără promisiuni fiscale absolute; formulări de tipul „puteți deduce, în limita plafonului legal”.
  - Respectă GDPR și demnitatea pacientului: doar date aprobate, fără diagnostic detaliat.
  - Scrie numerele în format românesc (1.700, 137.000, 0,75%).
</reguli_continut>

<livrabil>
  1. Un singur fișier HTML autonom (CSS inline, fonturi Google Fonts), dimensionat exact A4 cu
     `@page { size: A4; margin: 0 }`, gata de „Print → Salvează ca PDF” fără să treacă pe a doua pagină.
     Dacă ai acces la unelte de generare PDF, livrează și PDF-ul.
  2. Sub document, separat: textul integral al One Pager-ului în format simplu (pentru e-mail/Word).
  3. Un e-mail scurt de însoțire (subiect + max. 120 de cuvinte) personalizat pentru persoana din
     <date_companie_tinta>, cu One Pager-ul atașat.
  4. Lista câmpurilor rămase „[DE COMPLETAT]” și orice punct fiscal pe care nu l-ai putut verifica.

  Înainte de a livra, verifică singur: încape pe o pagină? diacriticele sunt corecte? cifrele
  corespund cu <date_organizatie>? apare numele companiei-țintă? există un singur CTA clar?
  Corectează orice problemă, apoi livrează.
</livrabil>
```

---

## Variantă scurtă (pentru generare în serie)

După ce primul One Pager iese bine, în aceeași conversație poți cere doar:

```
Păstrează exact designul și structura. Generează varianta pentru:
Nume companie: ...
Domeniu: ...
Oraș: ...
Regim fiscal: ...
Cifră de afaceri: ... lei | Impozit estimat: ... lei
Persoana de contact: ...
Argument personal: ...
Recalculează plafonul estimativ și adaptează hero-ul și e-mailul de însoțire.
```
