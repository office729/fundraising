import { escHtml } from "@/lib/html-escape";

// Emailuri legate de reînnoirea automată a abonamentului (cardul salvat,
// taxat lunar prin Netopia) — trimise de api/cron/netopia-reinnoire, către
// owner-ii organizației. Separat de campanie-email-actions.ts (poate exporta
// DOAR server actions) — funcții simple, apelate direct de cron.

export function subiectReinnoireEsuata(incercariRamase: number): string {
  return incercariRamase > 0
    ? "Plata abonamentului Alexandrit a eșuat — vom mai încerca"
    : "Reînnoirea automată a abonamentului a fost oprită";
}

export function htmlReinnoireEsuata(params: {
  orgName: string;
  setariUrl: string;
  incercariRamase: number;
  reinnoireDezactivata: boolean;
}): string {
  const orgName = escHtml(params.orgName);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        Am încercat să reînnoim automat abonamentul Alexandrit pentru <strong>${orgName}</strong>,
        dar plata cu cardul salvat a fost refuzată de bancă.
      </p>
      ${
        params.reinnoireDezactivata
          ? `<p>
              Am oprit reînnoirea automată, ca să nu mai reîncercăm degeaba. Accesul organizației
              rămâne activ până la sfârșitul perioadei deja plătite — după aceea, va trebui să
              plătești manual sau să salvezi din nou un card.
            </p>`
          : `<p>
              Vom mai încerca automat în zilele următoare (${params.incercariRamase} ${params.incercariRamase === 1 ? "încercare rămasă" : "încercări rămase"}).
              Dacă vrei să eviți o întrerupere, poți actualiza cardul sau plăti manual din Setări.
            </p>`
      }
      <p style="text-align: center; margin: 24px 0;">
        <a href="${escHtml(params.setariUrl)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Deschide Setările abonamentului
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        Primești acest email pentru că ești administrator/owner al organizației ${orgName} pe Alexandrit.
      </p>
    </div>
  `;
}

export function subiectDateFacturareLipsa(): string {
  return "Completează datele de facturare ca să-ți putem reînnoi abonamentul Alexandrit";
}

// Trimis când reînnoirea automată e AMÂNATĂ pentru că organizația nu are CIF /
// adresă / județ — nu încasăm bani pe care nu-i putem factura corect.
export function htmlDateFacturareLipsa(params: { orgName: string; setariUrl: string }): string {
  const orgName = escHtml(params.orgName);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        Abonamentul Alexandrit al organizației <strong>${orgName}</strong> urmează să se reînnoiască,
        dar nu am putut face încasarea: lipsesc datele de facturare (CIF, adresa sediului sau județul),
        iar factura fiscală nu poate fi emisă fără ele.
      </p>
      <p>
        Completează-le acum și reînnoirea se face automat la următoarea rulare, fără să pierzi accesul.
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${escHtml(params.setariUrl)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Completează datele de facturare
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        Primești acest email pentru că ești administrator/owner al organizației ${orgName} pe Alexandrit.
      </p>
    </div>
  `;
}

// Aviz înainte de reînnoirea automată (bună practică pentru plăți recurente): data, suma și cardul
// care va fi taxat, plus cum se oprește. Trimis o singură dată pe perioadă.
export function subiectAvizReinnoire(): string {
  return "Abonamentul Alexandrit se reînnoiește automat în curând";
}

export function htmlAvizReinnoire(params: {
  orgName: string;
  dataTaxare: string;
  sumaLei: number;
  packageLabel: string;
  card: string;
  cardExpiraInainte: boolean;
  setariUrl: string;
}): string {
  const orgName = escHtml(params.orgName);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        Abonamentul Alexandrit al organizației <strong>${orgName}</strong> (${escHtml(params.packageLabel)}) se reînnoiește automat
        pe <strong>${escHtml(params.dataTaxare)}</strong>. Vom încasa <strong>${params.sumaLei} lei</strong> de pe cardul
        <strong>${escHtml(params.card)}</strong>.
      </p>
      ${
        params.cardExpiraInainte
          ? `<p style="color:#b91c1c;">
              Atenție: cardul expiră înainte de această dată, deci încasarea va eșua. Plătește manual sau salvează un card nou din Setări,
              ca să nu pierzi accesul.
            </p>`
          : `<p>Nu trebuie să faci nimic. Dacă vrei să oprești reînnoirea automată sau să schimbi cardul, poți face asta oricând din Setări.</p>`
      }
      <p style="text-align: center; margin: 24px 0;">
        <a href="${escHtml(params.setariUrl)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Deschide Setările abonamentului
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        Primești acest email pentru că ești administrator/owner al organizației ${orgName} pe Alexandrit.
      </p>
    </div>
  `;
}

export function subiectCardExpirat(): string {
  return "Cardul salvat pentru abonamentul Alexandrit a expirat";
}

export function htmlCardExpirat(params: { orgName: string; card: string; setariUrl: string }): string {
  const orgName = escHtml(params.orgName);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        Cardul <strong>${escHtml(params.card)}</strong> salvat pentru abonamentul organizației <strong>${orgName}</strong> a expirat,
        deci nu l-am putut taxa pentru reînnoire. Accesul rămâne activ până la sfârșitul perioadei deja plătite.
      </p>
      <p>Plătește manual sau salvează un card nou ca să continui fără întrerupere.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${escHtml(params.setariUrl)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Deschide Setările abonamentului
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        Primești acest email pentru că ești administrator/owner al organizației ${orgName} pe Alexandrit.
      </p>
    </div>
  `;
}

// Avertizare de retenție: organizația are accesul expirat de mult și datele ei vor fi șterse. Trimisă de 2 ori
// (la ~60 și la ~83 de zile de la expirare), către owner.
export function subiectRetentie(zileRamase: number): string {
  return zileRamase > 14
    ? "Datele organizației tale din Alexandrit vor fi șterse în curând"
    : `Datele organizației tale din Alexandrit vor fi șterse în ${zileRamase} zile`;
}

export function htmlRetentie(params: { orgName: string; zileRamase: number; exportUrl: string; pachetUrl: string }): string {
  const orgName = escHtml(params.orgName);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        Accesul organizației <strong>${orgName}</strong> la Alexandrit a expirat, iar contul nu a mai fost reactivat. Conform politicii
        noastre de retenție, datele organizației (contacte, donatori, campanii, documente) vor fi <strong>șterse definitiv în aproximativ
        ${params.zileRamase} de zile</strong>.
      </p>
      <p>Ai două variante:</p>
      <ul>
        <li><a href="${escHtml(params.exportUrl)}">Descarcă toate datele (JSON)</a> — disponibil și cu accesul expirat, dacă ești owner;</li>
        <li><a href="${escHtml(params.pachetUrl)}">Alege un pachet</a> și accesul se reactivează imediat, cu datele neschimbate.</li>
      </ul>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        Primești acest email pentru că ești owner al organizației ${orgName} pe Alexandrit. Dacă ai nevoie de mai mult timp, scrie-ne la
        vlad.placinta@alexandrit.ro.
      </p>
    </div>
  `;
}
