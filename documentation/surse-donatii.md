# Sursele donațiilor

Raportul `/[orgSlug]/crm/surse-donatii` arată câte donații plătite și câți EUR aduce fiecare **sursă externă** (Facebook / Instagram Ads, Google Ads, Newsletter etc.).
Donația se atribuie **ultimei surse externe cunoscute înainte de începerea plății**. Donațiile Direct (fără nicio sursă externă) nu apar în raport.

Codul: `src/lib/surse-donatii/` (`nucleu.ts` = reguli, memorie, EUR — pur și testat; `client.ts` = browser; `server.ts` = salvarea pe donație), tabelul `donatie_surse`
(`documentation/surse-donatii.sql`), testele `tests/surse-donatii*.test.mjs`. Peste modulele existente (`atribuire`, `reclame/touch`, `sursaMarketing`), care rămân neschimbate.

## Cele 14 reguli (prima potrivită decide; ordinea nu se schimbă, nici când parametrii se contrazic)

Valorile se compară fără diferență între litere mari și mici și fără spații la capete. Domeniile se compară pe hostname real (`facebook.com.alt-site.ro` NU e Facebook).

| # | Sursa | Regula |
|---|---|---|
| 1 | Facebook / Instagram Ads | (`utm_source` ∈ facebook, fb, ig, instagram, meta SAU referrer facebook.com / fb.com / instagram.com) ȘI `utm_medium` ∈ paid, cpc, ppc, cpm, paid_social, ads |
| 2 | Facebook / Instagram (organic) | `fbclid`; SAU `utm_source` din lista de mai sus; SAU referrer Facebook/Instagram |
| 3 | Google Ads | `gclid`, `gbraid` sau `wbraid`; SAU `utm_medium` ∈ cpc, ppc, paid ȘI `utm_source` conține „google” |
| 4 | LinkedIn Ads | `li_fat_id`; SAU (`utm_source` ∈ linkedin, li SAU referrer linkedin.com / lnkd.in) ȘI `utm_medium` de reclamă |
| 5 | LinkedIn (organic) | `utm_source` ∈ linkedin, li; SAU referrer linkedin.com / lnkd.in |
| 6 | Newsletter | `utm_medium=email`; SAU `utm_source` ∈ newsman, newsletter |
| 7 | Organic (căutare) | referrer Google, Bing, Yahoo, DuckDuckGo sau Ecosia, fără identificatori de click publicitar |
| 8 | TikTok Ads | `ttclid`; SAU (`utm_source=tiktok` SAU referrer tiktok.com) ȘI `utm_medium` de reclamă |
| 9 | TikTok (organic) | `utm_source=tiktok` SAU referrer tiktok.com |
| 10 | YouTube Ads | (`utm_source` ∈ youtube, yt SAU referrer youtube.com / youtu.be) ȘI `utm_medium` de reclamă (reclamele cu `gclid` au fost deja prinse la Google Ads) |
| 11 | YouTube (organic) | `utm_source` ∈ youtube, yt SAU referrer youtube.com / youtu.be |
| 12 | Alte rețele sociale | `utm_source` ∈ twitter, x; SAU referrer twitter.com, x.com, t.co |
| 13 | Alt site | referrer extern care nu se încadrează mai sus și nu e ignorat |
| 14 | Afiliat | `referral_id` și nicio altă sursă |

Referrerii **ignorați**: domeniul propriu (gazda curentă, domeniul platformei, domeniul propriu al organizației) și procesatorii de plăți (Netopia, Stripe, PayPal, Euplatesc, Smartfintech, Google Pay).
Lista se întreține în `DOMENII_PROCESATORI` din `nucleu.ts` sau, fără deploy, în variabila `NEXT_PUBLIC_SURSE_DOMENII_IGNORATE` (domenii separate prin virgulă).

## Memoria atribuirii

* Se păstrează **prima** și **ultima** sursă externă, fiecare cu: categorie (derivată), utm_source/medium/campaign/content/term, tipurile de identificatori de click (nu valorile lor), hostname-ul referrerului, afiliatul și momentul.
* O vizită **Direct** (sau navigare internă / revenire din procesator) nu schimbă nimic și nu prelungește durata.
* O sursă externă nouă înlocuiește **tot setul „ultima”**: dacă nu are `utm_campaign`, campania ei e goală (nu moștenește campania precedentă).
* Cu acord pentru **statistici sau marketing** (bannerul de cookie-uri): `localStorage` (`fa_src_v1`), maximum **90 de zile** de la identificarea fiecărei surse. Fără acord: doar `sessionStorage` (`fa_src_s_v1`), fără persistență între vizite.
  La retragerea acordului bannerul șterge cheia persistentă; sesiunea curentă continuă cu copia din sesiune. Fără fingerprinting, fără identificatori de persoană.
* **Serverul nu are încredere în categoria din browser**: primește doar semnalele brute, re-derivă categoria cu aceleași reguli (inclusiv domeniile proprii ale organizației) și aplică din nou expirarea de 90 de zile.

## Ce se salvează pe donație

La începutul plății (`inregistreazaConversie`, apelat din toate căile: card, Apple/Google Pay, PayPal) se copiază pe donație (tabelul `donatie_surse`): prima și ultima sursă cu metadate, data capturării, dacă memoria era persistentă, suma originală, moneda, echivalentul în lei, **cursul EUR/RON folosit** și valoarea în **EUR**, calculate o singură dată.
Rândul este **neschimbabil** (aplicația are doar select și insert) și **unic pe donație**: o retrimitere, un webhook repetat sau o vizită ulterioară nu îl rescriu. „Plătită” rezultă din `fundraising_donations.status = 'reusita'` (confirmarea rămâne pe webhook-ul existent).
Fără curs disponibil, conversia rămâne **indisponibilă** (nu 0), iar raportul semnalează înregistrarea.

## Site separat (widgetul `embed.js`)

Formularul încorporat rulează într-un iframe pe domeniul Alexandrit; referrerul lui ar fi pagina gazdă, deci sursa reală a vizitatorului s-ar pierde. `public/embed.js` trimite acum formularului
**semnalele vizitei curente de pe pagina gazdă** în parametrii `x_*` (utm_*, doar tipul identificatorilor de click, `referral_id`, hostname-ul paginii de unde a venit vizitatorul). Nu scrie nimic pe dispozitiv.
Rămâne de făcut pe site-ul gazdă (alt proiect): (1) să nu piardă parametrii din adresă (utm_*, fbclid etc.) înainte ca widgetul să se încarce, (2) memoria între vizite NU se poate păstra în iframe-ul de pe alt domeniu — vizitatorul trebuie să doneze în aceeași vizită în care a venit din reclamă,
sau site-ul gazdă să încarce widgetul cu aceeași adresă etichetată; (3) dacă site-ul are cookie-uri proprii de consimțământ, widgetul tot nu persistă sursa (fiecare încărcare trimite doar vizita curentă).

## Limite cunoscute

* Donațiile recurente reînnoite automat (webhook lunar) nu au context de browser: nu primesc rând (nu se inventează surse). Prima plată a abonamentului da.
* Donațiile istorice (dinainte de această funcție) nu au rând; nu se completează retroactiv.
* Linkurile voluntarilor folosesc `utm_source=voluntari` și nu intră în nicio categorie; pentru „Afiliat” trebuie un `referral_id` în link.
* „Data plății” din filtre = `fundraising_donations.created_at` (nu există un moment separat de confirmare).

## Linkuri pentru reclame plătite

Generatoarele de linkuri (CRM → Surse, CRM → Reclame, Panou platformă → Surse) au variante **Paid** cu `utm_medium=paid` pentru Facebook, Instagram, TikTok, YouTube, LinkedIn și Google (în plus față de `paid_social` și `cpc`, tot recunoscute). Exemplu: `?utm_source=facebook&utm_medium=paid&utm_campaign=craciun_2026`. TikTok și YouTube au categorii proprii în raport (Ads și organic). Donațiile salvate înainte de această extindere rămân la „Alte rețele sociale”: rândurile sunt neschimbabile.
