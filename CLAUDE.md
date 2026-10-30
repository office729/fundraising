@AGENTS.md

# Centrul de inovare: „Ce am inovat” se completează la fiecare lot

La FIECARE modificare pe care o văd ONG-urile (funcționalitate nouă, îmbunătățire, reparație importantă), adaugă o intrare în `src/content/inovatii.ts`,
în același commit cu modificarea (cele mai noi primele). Scrie pentru un ONG, în română, într-o propoziție-două: ce poate face acum și de ce îi folosește.
Nu intră lucrările interne (Panou platformă, refactorizări, teste). Dacă ideea vine dintr-o propunere a ONG-urilor, pune `dinPropunere: true` și marchează
propunerea „Finalizată” din Panou platformă → Centrul de inovare și completează `ideeId` (id-ul ideii din linkul ei din Panou): organizațiile care au propus sau votat
ideea văd „Ai cerut tu, am făcut”, iar cele care au votat primesc un email 1 la 1 la „În dezvoltare” și „Finalizată”. La funcțiile noi adaugă și `cumFolosesti` (o propoziție:
cum o folosești ca să strângi mai mult). Formatul îl verifică `tests/inovare.test.mjs`.
