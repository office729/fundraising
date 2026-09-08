import Link from "next/link";

import { getAuthUser } from "@/lib/auth/dal";

import { lookupBeneficiaryInviteByToken } from "./actions";
import { AcceptButton } from "./accept-button";

export default async function InviteBeneficiarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await lookupBeneficiaryInviteByToken(token);
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
          Ai deja acces la panoul tău — <Link href="/login" className="text-brand-green">autentifică-te</Link>.
        </p>
      </main>
    );
  }
  if (invite.expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Invitație expirată</h1>
        <p className="mt-2 text-muted">Cere echipei asociației să trimită una nouă.</p>
      </main>
    );
  }

  const loggedInWrongEmail = authUser?.email && authUser.email.toLowerCase() !== invite.email.toLowerCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="font-display text-xl font-bold text-ink">Ai fost invitat(ă)</h1>
      <p className="mt-2 text-muted">
        Panoul tău dedicat pentru campania <b className="text-ink">{invite.campaignTitlu}</b>, susținută de{" "}
        <b className="text-ink">{invite.orgName}</b>.
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
            href={`/signup?beneficiarInvite=${token}`}
            className="rounded-lg bg-brand-green px-5 py-2.5 font-medium text-white transition hover:bg-brand-green-hover"
          >
            Creează cont
          </Link>
          <Link
            href={`/login?beneficiarInvite=${token}`}
            className="rounded-lg border border-line bg-panel px-5 py-2.5 font-medium text-ink transition hover:bg-panel-2"
          >
            Autentificare
          </Link>
        </div>
      )}
    </main>
  );
}
