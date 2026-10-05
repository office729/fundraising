import Link from "next/link";

import { getAuthUser } from "@/lib/auth/dal";
import { ABONAMENT_DICT } from "@/lib/i18n/dictionaries/abonament";
import { getLocale } from "@/lib/i18n/get-locale";

import { lookupInviteByToken } from "./actions";
import { AcceptButton } from "./accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await lookupInviteByToken(token);
  const authUser = await getAuthUser();
  const locale = await getLocale();
  const t = ABONAMENT_DICT[locale].invitatie;

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">{t.inexistentaTitlu}</h1>
        <p className="mt-2 text-muted">{t.inexistentaDesc}</p>
      </main>
    );
  }
  if (invite.accepted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">{t.folositaTitlu}</h1>
        <p className="mt-2 text-muted">
          {t.folositaDesc(invite.orgName)}
          <Link href="/login" className="text-brand-green">
            {t.autentificaTe}
          </Link>
          .
        </p>
      </main>
    );
  }
  if (invite.expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">{t.expiratTitlu}</h1>
        <p className="mt-2 text-muted">{t.expiratDesc}</p>
      </main>
    );
  }

  const loggedInWrongEmail =
    authUser?.email && authUser.email.toLowerCase() !== invite.email.toLowerCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
      <p className="mt-2 text-muted">
        {t.alaturaTe} <b className="text-ink">{invite.orgName}</b> {t.ca}{" "}
        <b className="text-ink">{t.rol[invite.role] ?? invite.role}</b>.
      </p>
      <p className="mt-1 text-sm text-muted">{invite.email}</p>

      {loggedInWrongEmail ? (
        <p className="mt-6 rounded-lg bg-brand-amber-soft px-3 py-2 text-sm text-ink">
          {t.altCont(authUser!.email!, invite.email)}
        </p>
      ) : authUser ? (
        <div className="mt-6">
          <AcceptButton token={token} locale={locale} />
        </div>
      ) : (
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/signup?invite=${token}`}
            className="rounded-lg bg-brand-green px-5 py-2.5 font-medium text-white transition hover:bg-brand-green-hover"
          >
            {t.creeazaCont}
          </Link>
          <Link
            href={`/login?invite=${token}`}
            className="rounded-lg border border-line bg-panel px-5 py-2.5 font-medium text-ink transition hover:bg-panel-2"
          >
            {t.autentificare}
          </Link>
        </div>
      )}
    </main>
  );
}
