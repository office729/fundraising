# Performanța reclamelor: note de implementare (pentru dezvoltatori)

Pagina pentru ONG-uri (ghidul de pornire) e în `src/app/(app)/[orgSlug]/crm/reclame/tab-ghid.tsx`. Aici e doar partea tehnică.

Modulul e pe organizație: fiecare ONG își conectează propriul cont de reclame și își vede doar datele lui (RLS pe `org_id`). Platforma Alexandrit nu are un cont central și nu citește reclamele nimănui.

## Cum funcționează

1. Link cu coduri: reclama duce la pagina de campanie printr-un link cu `utm_source`, `utm_medium`, `utm_campaign` (și `utm_content`).
2. Vizita: pagina numără vizita fără cookie-uri. Cu acordul pentru statistici, ultimul clic eligibil se păstrează în browser (`fa_touch_v1`), cel mult 30 de zile.
3. Donația începe: la crearea ei (înainte de procesator) se fixează contextul de atribuire în `donatie_atribuiri`.
4. Plata se confirmă: donația se numără doar după webhook-ul Stripe (`reusita`, sau `rambursata` pentru cele rambursate integral).
5. Raportul compară costurile (`reclame_costuri`) cu donațiile atribuite, pe platformă, plasament și cod de campanie.

Model: `ultim-clic-v1`, ultimul clic eligibil, nedirect. Traficul direct nu suprascrie un clic eligibil; un clic ulterior din email sau social organic ia locul unei reclame. Fereastra: 1, 7 (implicit) sau 30 de zile. O donație are o singură sursă câștigătoare.

## Unde e codul

| Parte | Unde |
|---|---|
| Tabele (RLS pe organizație) | `documentation/reclame.sql`, `src/lib/db/schema/reclame.ts`: `reclame_costuri`, `reclame_campanii`, `reclame_importuri`, `donatie_atribuiri`, `reclame_linkuri`, `reclame_conexiuni` |
| Aplicarea migrării | `node --env-file=.env.local scripts/aplica-reclame.mjs` (idempotent, rol migrator). Politicile sunt și în `scripts/restore-rls.mjs` |
| Captarea clicului (browser) | `src/lib/reclame/touch-client.ts`: `memoreazaTouch()` la încărcarea paginii de campanie, `touchPentruDonatie()` pentru câmpul ascuns `atribuire` din formularul de donație |
| Fixarea atribuirii (server) | `src/lib/reclame/inregistreaza-atribuire.ts`, apelat după fiecare inserare de donație: `strangere-fonduri/…/actions.ts` (Checkout) și `express-checkout-actions.ts` (Apple/Google Pay, PayPal, Revolut; unic și recurent) |
| Reguli de atribuire | `src/lib/reclame/atribuire.ts`: curățarea codurilor, clasa traficului, platforma din sursă, plasamentul, fereastra. Browserul nu e de încredere: clasa se recalculează pe server |
| Confirmarea donațiilor | Neschimbată: webhook-ul Stripe al fiecărei organizații pune donația pe `reusita` |
| Calcule și agregare | `calcule.ts`, `raport.ts`, `csv-costuri.ts`, `export-csv.ts`, `dictionar.ts` (pure, testate în `tests/reclame*.test.mjs`) |
| Conexiunea Meta (citire) | `meta-api.ts` (client Graph API: paginare, reîncercări, împărțirea intervalelor; testat fără rețea), `meta-sync.ts` (sincronizare pe intervale de 14 zile, blocaj, conectare), `api/cron/reclame-meta` (zilnic) |
| Interogări și acțiuni | `src/app/(app)/[orgSlug]/crm/reclame/{queries,actions}.ts`; pagina `/[orgSlug]/crm/reclame` (doar owner/admin, pachet IMPACT sau probă) |

## Comenzi

```bash
node --env-file=.env.local scripts/aplica-reclame.mjs   # creează tabelele și politicile RLS
npm test                                                  # include tests/reclame*.test.mjs
npx tsc --noEmit && npx eslint src tests --quiet
```

## Variabile de mediu

- `ORG_SECRETS_KEY`: obligatorie pentru conexiunea Meta (criptează tokenul, AES-256-GCM) și pentru amprenta zilnică a traficului. Fără ea, conectarea e dezactivată și pagina o spune.
- `CRON_SECRET`: pentru cronul zilnic `/api/cron/reclame-meta` (ca la celelalte din `vercel.json`).
- `META_GRAPH_VERSION` (opțională): versiunea Graph API, implicit `v25.0`. Meta retrage versiunile vechi; verifică jurnalul de modificări înainte să o schimbi.
- `NEXT_PUBLIC_META_PIXEL_ID`: opțională și independentă; Pixelul nu e sursa cheltuielilor, iar încărcarea lui cere acordul separat pentru publicitate.

## Conexiunea Meta

- Doar citire: permisiunea `ads_read`. Endpoint `GET /act_{id}/insights` cu `level=ad`, `time_increment=1`, `breakdowns=publisher_platform`, `time_range`, câmpurile `date_start, campaign_*, adset_*, ad_*, spend, impressions, inline_link_clicks, account_currency`.
- Tokenul se trimite în antetul `Authorization: Bearer`, nu în adresă; se urmează doar `paging.next` către `graph.facebook.com`.
- Erori: 190/102 token; 10 și 200–299 permisiuni; 100 + subcod 1487534 prea multe date (intervalul se împarte); 4, 17, 32, 613, 80000–80014 limitare (reîncercări cu pauză). Mesajele păstrate nu conțin tokenul.
- Sincronizarea înlocuiește costurile Meta din zilele citite (inclusiv cele importate din CSV pentru aceleași zile), pe intervale de 14 zile, fiecare într-o tranzacție scurtă; nu ține o conexiune la baza de date cât așteaptă Meta.
- Conturi în EUR: cursul zilei sincronizării (`curs-valutar.ts`); alte monede cer `curs_manual`.

## Cum adaugi o altă sursă de costuri (TikTok, LinkedIn etc.)

Orice sursă produce rânduri în forma de mai jos și le scrie cu același upsert ca importul CSV (`sursa = 'api'`). Raportul nu depinde de platformă: citește doar din `reclame_costuri`.

```ts
type RandCost = {
  ziua: string;            // "2026-10-05", în fusul contului publicitar
  cont: string;
  campanieCheie: string;   // id-ul de la platformă (altfel numele)
  campanieNume: string;
  setCheie: string;  setNume: string;
  reclamaCheie: string;  reclamaNume: string;
  plasament: string;       // ex. "facebook" / "instagram", dacă sursa îl dă
  cheltuialaMinor: number; // în bani, în moneda originală
  afisari: number | null;
  clicuri: number | null;  // clicuri pe link, nu toate clicurile
};
```

## Verificarea unei donații

```sql
select d.created_at, d.status, d.suma, a.clasa, a.platforma,
       a.utm_source, a.utm_medium, a.utm_campaign, a.utm_content,
       a.click_la, a.consimtamant, a.model
from fundraising_donations d
join donatie_atribuiri a on a.donatie_id = d.id
order by d.created_at desc
limit 10;
```

## Consimțământ

- Fără acord pentru statistici nu se scrie nimic în browser; atribuirea folosește doar parametrii UTM din adresa paginii în momentul donației (`consimtamant = 'fara-stocare'`).
- Cu acord, `fa_touch_v1` păstrează doar coduri UTM și momentul clicului. Retragerea acordului îl șterge la următoarea vizită.
- Refuzul nu blochează donația. Nimic nu se trimite către platformele de reclame.
- Widgetul de donație din iframe pe site-ul ONG-ului nu vede UTM-urile paginii-gazdă: reclama trebuie să ducă la pagina de campanie Alexandrit.
- Dacă se adaugă ulterior conversii trimise către platforme, paginile medicale nu trebuie să trimită evenimente, iar numele și textul campaniilor nu trebuie să ajungă în URL, titluri sau parametri.

## Limite

- Donațiile fără UTM și fără acord rămân neatribuite; cifrele sunt un minim verificabil.
- Conversiile raportate de platforme nu sunt aduse și nu se adună cu cele interne.
- Valoarea netă scade doar rambursările; comisioanele procesatorului nu sunt păstrate pe donație.
- Nu sunt implementate: comparația cu primul contact, atribuirea donațiilor prin SMS sau transfer bancar, cohorte pe clic.
