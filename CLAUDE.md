@AGENTS.md

# Centrul de inovare: „Ce am inovat” se completează la fiecare lot

La FIECARE modificare pe care o văd ONG-urile (funcționalitate nouă, îmbunătățire, reparație importantă), adaugă o intrare în `src/content/inovatii.ts`,
în același commit cu modificarea (cele mai noi primele). Scrie pentru un ONG, în română, într-o propoziție-două: ce poate face acum și de ce îi folosește.
Nu intră lucrările interne (Panou platformă, refactorizări, teste). Dacă ideea vine dintr-o propunere a ONG-urilor, pune `dinPropunere: true` și marchează
propunerea „Finalizată” din Panou platformă → Centrul de inovare și completează `ideeId` (id-ul ideii din linkul ei din Panou): organizațiile care au propus sau votat
ideea văd „Ai cerut tu, am făcut”, iar cele care au votat primesc un email 1 la 1 la „În dezvoltare” și „Finalizată”. La funcțiile noi adaugă și `cumFolosesti` (o propoziție:
cum o folosești ca să strângi mai mult). Formatul îl verifică `tests/inovare.test.mjs`.

# Limba: tot textul nou pentru utilizatori are română ȘI engleză

Platforma are selector RO/EN. Orice text nou vizibil utilizatorilor (interfață, mesaje de eroare ale acțiunilor, pagini publice) se scrie în ambele limbi: dicționare `src/lib/i18n/dictionaries/*.ts`
(`{ ro, en }`, aceleași chei), `await getLocale()` în server, `useLocale()` (crm/lib/locale-context) în componentele client din CRM. Fiecare intrare nouă din `src/content/inovatii.ts`
primește traducerea în `src/content/inovatii-en.ts` (verificat de `tests/inovare.test.mjs`). Rămân în română documentele cu valoare legală și emailurile către donatori
(contracte de sponsorizare, Formular 230, D177, chitanțe). Termenii fiscali românești se păstrează, cu explicație în engleză.
