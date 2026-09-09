import { requireBeneficiarAccess } from "@/lib/auth/guard";

import { ParolaForm } from "./parola-form";

export default async function ProfilPage() {
  const access = await requireBeneficiarAccess();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Profil și securitate</h1>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">Contul tău</h2>
        <div className="mt-3 flex flex-col gap-2 text-[13.5px]">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">Nume</span>
            <span className="font-medium text-ink">{access.userName || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">Email</span>
            <span className="font-medium text-ink">{access.userEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Campanie asociată</span>
            <span className="font-medium text-ink">{access.campaignTitlu}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">Schimbă parola</h2>
        <p className="mt-1 text-[13px] text-muted">Alege o parolă nouă, de cel puțin 8 caractere.</p>
        <ParolaForm />
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">Dezactivare cont</h2>
        <p className="mt-2 text-[13.5px] text-muted">
          Contul tău e asociat exclusiv campaniei de mai sus și e gestionat de echipa {access.orgName}. Pentru dezactivare sau
          orice altă modificare a contului, contactează echipa direct — nu poți face asta singur, ca măsură de siguranță
          pentru datele campaniei.
        </p>
      </div>
    </div>
  );
}
