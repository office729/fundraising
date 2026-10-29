# Provenința vizitatorilor și atribuirea rezultatelor

Răspunde la: de unde vin oamenii, dacă vin din promovare organică sau plătită și câți donează, trimit Formularul 230 sau (pe site-ul platformei) cer informații și își creează cont.

Unde se vede:

- **CRM → Strângere de fonduri → Statistici și surse** (`/<org>/crm/surse`): toate pachetele, nu e modul gated. Cifrele agregate le văd toți membrii; istoricul unui vizitator (`/surse/vizitator/<id>`) și exportul CSV (`/api/<org>/surse-export`) cer rol de proprietar sau administrator.
- **Panou platformă → De unde vin ONG-urile** (`/platform-admin/surse`): doar echipa platformei; vizitatori, cereri „Descoperă Alexandrit”, conturi create, pe sursă, tip și pachet.
- **Fișa donatorului** (coloana „Sursă” la fiecare donație) și lista de răspunsuri **Formular 230** (linia „Sursă”).

## Cele patru câmpuri, separate

| Câmp | Valori |
|---|---|
| **Sursă** | facebook, instagram, google, tiktok, linkedin, x, youtube, whatsapp, telegram, email, … sau gazda unui site; `(direct)` dacă nu se știe |
| **Canal** | Social organic, Social plătit, Social (nedeterminat), Căutare organică, Căutare plătită, Email, Mesagerie, Referral, Offline/QR, Direct, Alt canal |
| **Tip promovare** | `organic` (neplătit), `platit`, `nedeterminat` |
| **Metoda** | `utm`, `identificator_reclame`, `referrer`, `necunoscut` |

În plus: campania de marketing (`utm_campaign`), conținutul (`utm_content`: postarea, reclama, mesajul), termenul, `utm_id`. ID-ul campaniei de strângere de fonduri (`page_id`) e separat de `utm_campaign`.

## Reguli de clasificare și ordinea lor (`src/lib/atribuire/clasificare.ts`)

1. **UTM** (`utm_source`, `utm_medium`) pun sursa și canalul. `paid_social`, `cpc`, `ppc`, `cpm`, `display` ⇒ plătit; `social`, `organic_social`, `email`, `newsletter`, `messaging`, `whatsapp`, `qr`, `referral` ⇒ organic (neplătit). `cpc` pe o sursă socială = reclamă socială. Sursă cunoscută, dar medium lipsă sau necunoscut ⇒ `nedeterminat`.
2. **Identificatori de reclame care dovedesc plata**: `gclid`, `gbraid`, `wbraid`, `msclkid`, `ttclid`, `li_fat_id`. Dacă UTM spune „organic” și identificatorul e al aceleiași platforme, câștigă identificatorul (eticheta poate fi greșită); dacă platformele diferă ⇒ `nedeterminat`.
3. **`fbclid` NU dovedește plata** (Facebook îl adaugă la orice link accesat din Facebook). Dă doar platforma: Facebook, `nedeterminat`.
4. **Referrer**: dă platforma (facebook.com, m.facebook.com, l.facebook.com, … ⇒ `facebook`), dar nu dovedește reclama: social ⇒ `nedeterminat`; motor de căutare fără semnal de plată ⇒ Căutare organică; rețele de reclame display (doubleclick etc.) ⇒ plătit; alt site ⇒ Referral organic.
5. **Nimic** ⇒ Direct, `nedeterminat`. **Absența UTM nu înseamnă organic.**

Domeniile proprii și procesatoarele de plată (Stripe, PayPal, Netopia/MobilPay, bănci) nu sunt niciodată sursă: la revenirea din plată contează sursa inițială.

Când sursa sau tipul nu se pot stabili, interfața o spune explicit (procent de vizitatori nedeterminați, conversii rămase „Direct”).

## Modele de atribuire (`src/lib/atribuire/model.ts`)

Pentru fiecare conversie se salvează, în clipa conversiei, trei instantanee (nu se rescriu de vizitele ulterioare):

- **prima sursă** observată pentru vizitator;
- **sesiunea conversiei** (poate fi „Direct” la o revenire);
- **ultima sursă nedirectă eligibilă**: cea mai recentă sesiune cu canal diferit de Direct, începută în **fereastra de atribuire** (implicit 30 de zile, configurabilă 1–90 pe organizație în pagina de statistici) înainte de conversie. O revenire directă nu o șterge.

Un raport folosește **un singur model** odată (implicit „ultima sursă nedirectă”; fără sursă nedirectă în fereastră, conversia rămâne „Direct”). Modelele nu se adună. Totalul de conversii e același în toate modelele.

## Ce se măsoară în fiecare flux

| Flux | Evenimente | Rezultate (din evidența operațională) |
|---|---|---|
| Strângere de fonduri | vizită, clic „Donează” (deschiderea ferestrei), început de donație (prima modificare în formular) | donație **confirmată** = stare `reusita`, setată doar de webhook-ul Stripe; sumă brută/netă (după rambursări); donatori unici (email); plăți recurente separate de prima plată |
| Formular 230 | vizită, formular început (primul câmp modificat) | formular **trimis** = rând salvat; nu înseamnă acceptat de ANAF sau încasat |
| Sponsorizare 20% | — | **Nu are pagini publice** (contractele se generează în CRM Companii); cifrele (firme adăugate, contracte trimise/semnate, sponsorizări încasate) vin din CRM, fără sursă de pe web |
| Site platformă | vizită (site, /descopera, /signup), început de înscriere | cerere „Descoperă Alexandrit” (lead), cont creat |

Donația se înregistrează la creare cu instantaneul de atribuire (`atrib_conversii`, `tip='donatie'`), dar **se numără ca rezultat doar când `fundraising_donations.status = 'reusita'`**. Webhook retrimis ⇒ nicio dublare (unicitate `(tip, entitate_id)` + logica existentă idempotentă). Rambursările reduc valoarea netă. Reînnoirile lunare nu sunt conversii noi.

Rate (numărător ÷ numitor, fără numitor ⇒ „—”): conversie donații = donații confirmate ÷ vizitatori; finalizare Formular 230 = trimise ÷ începute. Costul per donator/formular apare doar dacă există cheltuieli reale legate de campania de marketing (modulul „Performanța reclamelor”); altfel „Indisponibil”.

## Confidențialitate

- **Fără acord** pentru statistici: nimic pe dispozitiv, fără identificator persistent. Vizita se numără ca amprentă zilnică (HMAC din IP + browser + zi, ca înainte), conversia păstrează doar proveniența din adresa curentă.
- **Refuz explicit**: nu se trimite niciun eveniment de pe pagină. Donația/formularul se înregistrează oricum operațional.
- **Cu acord**: un UUID aleatoriu de vizitator și unul de sesiune în `localStorage` (`fa_vid_v1`, `fa_sid_v1`), șterse la retragerea acordului. Sesiune nouă după 30 de minute de inactivitate sau la un clic nou cu etichete de campanie.
- Niciun nume, email, telefon, CNP, adresă sau conținut de formular în evenimente. Din adresă se citesc doar parametrii permiși (`utm_*`, identificatori de reclame); referrerul se păstrează doar ca gazdă; calea fără parametri.
- Fără unire de persoane după IP, fără fingerprinting, fără recunoaștere între dispozitive.
- Excluse: sesiuni autentificate (echipa), roboți, DNT/GPC, previzualizări Vercel.
- Retenție: evenimentele 13 luni (cron `statistici-campanii`); după 13 luni conversiile își pierd identificatorul pseudonim (instantaneul de sursă rămâne); instantaneele conversiilor șterse (donație, formular, lead, cont) se elimină.

## Baza de date (documentation/atribuire.sql, scripts/aplica-atribuire.mjs)

- `atrib_evenimente`: un rând pe eveniment (flux, tip, campanie/cont, vizitator/sesiune, clasificarea sesiunii, cale, dispozitiv).
- `atrib_conversii`: instantaneul de atribuire (prima / sesiune / ultima) pe conversie; unic `(tip, entitate_id)`.
- RLS forțat: rândurile unei organizații se văd doar în contextul ei; rândurile cu `org_id null` (site-ul platformei) le scrie doar codul public după validare (`app.atribuire_site`) și le citește doar echipa platformei (`app.platform_admin`).
- Fereastra de atribuire a organizației: `crm_kv`, cheia `atribuire-config`.

## Limite cunoscute

- Se măsoară traficul observabil; blocarea trackingului, lipsa acordului sau a etichetelor limitează sursa.
- Vizitatorii fără acord nu au istoric între zile: „vizitatori” e o numărătoare pe zi pentru ei.
- Donațiile și formularele dinainte de activarea măsurării apar „Fără sursă măsurată”.
- Apple Pay/Google Pay (express) și donațiile prin Stripe Checkout poartă același context; widgetul din iframe pe site-ul organizației nu are propriul tracker de vizite.
