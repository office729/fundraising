import { requireOrgAccess } from "@/lib/auth/guard";
import { CRM_VOLUNTARI_HTML } from "@/modules/crm/crm-voluntari/crm-voluntari-html";
import { titluPagina } from "@/lib/page-titles";
import { getLocale } from "@/lib/i18n/get-locale";
import { NotaCrm } from "../crm/components/nota-crm";
import { LocaleProvider } from "../crm/lib/locale-context";
import { CrmToolPage } from "../crm/tool-page";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

const TITLE = "CRM Voluntari";

export async function generateMetadata() {
  return { title: await titluPagina("crmVoluntari") };
}

export default async function CrmVoluntariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      {/* Nota „Ce înseamnă CRM?” deasupra instrumentului; iframe-ul ocupă tot restul spațiului. */}
      <LocaleProvider locale={locale}>
        <div className="flex h-full flex-col">
          <div className="shrink-0 px-4 pt-3 pb-2">
            <NotaCrm id="voluntari" />
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <StandaloneToolFrame html={CRM_VOLUNTARI_HTML} title={TITLE} orgSlug={orgSlug} orgName={access.orgName} orgLogoUrl={access.orgLogoUrl} />
            </div>
          </div>
        </div>
      </LocaleProvider>
    </CrmToolPage>
  );
}
