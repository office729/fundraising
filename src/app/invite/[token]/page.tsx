import Link from "next/link";

import { getAuthUser } from "@/lib/auth/dal";

import { lookupInviteByToken } from "./actions";
import { AcceptButton } from "./accept-button";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membru",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await lookupInviteByToken(token);
  const authUser = await getAuthUser();

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Invitație inexistentă</h1>
        <p className="mt-2 text-muted">Linkul nu mai e valid.</p>
      </main>
    );
  }
  if (invite.accepted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Invitație deja folosită</h1>
        <p className="mt-2 text-muted">
          Ai deja acces la {invite.orgName} — <Link href="/login" className="text-brand-green">autentifică-te</Link>.
        </p>
      </main>
    );
  }
  if (invite.expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Invitație expirată</h1>
        <p className="mt-2 text-muted">Cere administratorului să trimită una nouă.</p>
      </main>
    );
  }

  const loggedInWrongEmail =
    authUser?.email && authUser.email.toLowerCase() !== invite.email.toLowerCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="font-display text-xl font-bold text-ink">Ai fost invitat(ă)</h1>
      <p className="mt-2 text-muted">
        Alătură-te <b className="text-ink">{invite.orgName}</b> ca{" "}
        <b className="text-ink">{ROLE_LABELS[invite.role] ?? invite.role}</b>.
      </p>
      <p className="mt-1 text-sm text-muted">{invite.email}</p>

      {loggedInWrongEmail ? (
        <p className="mt-6 rounded-lg bg-brand-amber-soft px-3 py-2 text-sm text-ink">
          Ești logat cu alt cont ({authUser!.email}). Deconectează-te și intră cu {invite.email}.
        </p>
      ) : authUser ? (
        <div className="mt-6">
          <AcceptButton token={token} />
        </div>
      ) : (
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/signup?invite=${token}`}
            className="rounded-lg bg-brand-green px-5 py-2.5 font-medium text-white transition hover:bg-brand-green-hover"
          >
            Creează cont
          </Link>
          <Link
            href={`/login?invite=${token}`}
            className="rounded-lg border border-line bg-panel px-5 py-2.5 font-medium text-ink transition hover:bg-panel-2"
          >
            Autentificare
          </Link>
        </div>
      )}
    </main>
  );
}
