import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { incarcaAgentEmail } from "./actions";
import { AgentEmailView } from "./view";

export const dynamic = "force-dynamic";
// Generarea ciornelor cu AI durează (circa 10 secunde pe firmă, până la 10 firme pe apăsare), iar citirea căsuței (IMAP) poate dura și ea.
export const maxDuration = 300;

// „Agent email”: AI scrie primul email către decidentul firmei, colegul îl citește și îl aprobă, iar emailul pleacă din căsuța LUI cu semnătura lui și One Pager-ul atașat.
export default async function AgentEmailPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const locale = await getLocale();
  const d = AGENT_EMAIL_UI_DICT[locale];
  const date = await incarcaAgentEmail(orgSlug);
  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div>
        <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">{d.titlu}</h1>
        <p className="mt-1 max-w-[80ch] text-[13px] text-[var(--ci-text-muted)]">{d.intro}</p>
      </div>
      <AgentEmailView orgSlug={orgSlug} date={date} />
    </div>
  );
}
