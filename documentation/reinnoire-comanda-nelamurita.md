# Reînnoire blocată: comandă „în așteptare" nelămurită

## Ce înseamnă
Cronul de reînnoire (`/api/cron/netopia-reinnoire`) taxează cardul salvat al unei organizații. Dacă apelul către Netopia nu primește un răspuns
clar (timeout, eroare 5xx, răspuns fără plată, conexiune întreruptă), **nu știm dacă Netopia a încasat banii**. Comanda rămâne `in_asteptare`
și **blochează orice nouă taxare a acelei organizații, oricât de veche ar fi**, ca să nu se încaseze de două ori aceeași perioadă.

Primești un email (o dată pe zi, la `ALERTE_FACTURARE_EMAIL`) cu subiectul „Reînnoire blocată — comandă nelămurită", iar în Sentry apare
avertismentul „taxare blocată: există o comandă de reînnoire nelămurită".

Se deblochează singură dacă: sosește IPN-ul târziu; sau comanda are `ntp_id` și verificarea de status o lămurește; sau Netopia a respins clar
cererea (400/401/403/404/422/429 — atunci comanda se închide automat ca `esuata`).

## Cum o rezolvi manual
1. Găsește comanda: `select order_id, org_id, suma_lei, created_at, ntp_id from platform_payments where status = 'in_asteptare' and renewal = true order by created_at;`
2. În panoul Netopia (`admin.netopia-payments.com` → Comenzi) caută `order_id` și vezi statusul:
   - **Confirmată / Plătită** (banii au fost încasați): extinde manual perioada organizației din `/platform-admin` (Ajustare organizație: sfârșitul perioadei +
     luna/anul plătit), apoi marchează comanda ca reușită sau închide-o:
     `update platform_payments set status = 'reusita', paid_at = now() where order_id = '<ID>' and status = 'in_asteptare';`
     (pentru factură, folosește butonul „Generează factura" din Facturare sau marchează `NEFACTURAT` dacă a fost un test).
   - **Respinsă / Anulată / Expirată / Eroare / negăsită** (nu s-au încasat bani):
     `update platform_payments set status = 'esuata' where order_id = '<ID>' and status = 'in_asteptare';`
     Reînnoirea se reia la următoarea rulare a cronului.
3. Nu șterge comanda și nu o muta pe `esuata` fără să verifici în Netopia: dacă banii au fost încasați, clientul ar fi taxat a doua oară.
