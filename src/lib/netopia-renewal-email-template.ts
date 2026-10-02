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
