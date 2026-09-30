import { escHtml } from "@/lib/html-escape";

// Emailul trimis automat owner-ului organizației după ce o plată a
// abonamentului platformei a fost confirmată ȘI factura Oblio a fost emisă
// cu succes (vezi lib/billing/netopia-confirm.ts) — separat de emailul
// propriu al Oblio (sendEmail:1, dependent de un setting din contul lor),
// ca livrarea facturii să nu depindă de o configurare externă.

export function subiectFacturaEmisa(numarFactura: string): string {
  return `Factura ${numarFactura} — abonament Alexandrit`;
}

export function htmlFacturaEmisa(params: {
  orgName: string;
  packageLabel: string;
  sumaLei: number;
  numarFactura: string;
  linkFactura: string;
}): string {
  const orgName = escHtml(params.orgName);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        Am primit plata abonamentului Alexandrit pentru <strong>${orgName}</strong>
        (${escHtml(params.packageLabel)}, ${params.sumaLei} lei) și am emis factura
        <strong>${escHtml(params.numarFactura)}</strong>.
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${escHtml(params.linkFactura)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Descarcă factura
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        Primești acest email pentru că ești administrator/owner al organizației ${orgName} pe Alexandrit.
      </p>
    </div>
  `;
}
