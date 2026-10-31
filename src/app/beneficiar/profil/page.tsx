import { requireBeneficiarAccess } from "@/lib/auth/guard";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { ParolaForm } from "./parola-form";

export default async function ProfilPage() {
  const access = await requireBeneficiarAccess();
  const locale = await getLocale();
  const t = BENEFICIAR_PORTAL_UI_DICT[locale].profil;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">{t.cont}</h2>
        <div className="mt-3 flex flex-col gap-2 text-[13.5px]">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">{t.nume}</span>
            <span className="font-medium text-ink">{access.userName || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">{t.email}</span>
            <span className="font-medium text-ink">{access.userEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t.campanie}</span>
            <span className="font-medium text-ink">{access.campaignTitlu}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">{t.schimbaParola}</h2>
        <p className="mt-1 text-[13px] text-muted">{t.parolaDesc}</p>
        <ParolaForm locale={locale} />
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">{t.dezactivare}</h2>
        <p className="mt-2 text-[13.5px] text-muted">{t.dezactivareText(access.orgName)}</p>
      </div>
    </div>
  );
}
