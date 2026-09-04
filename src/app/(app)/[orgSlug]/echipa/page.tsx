import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { listMembers, listPendingInvites } from "./actions";
import { InviteForm } from "./invite-form";

export default async function EchipaPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const dict = SETARI_ECHIPA_DICT[locale].echipa;
  const ROLE_LABELS = dict.roleLabels;
  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${orgSlug}`);
  }

  const [members, pendingInvites] = await Promise.all([
    listMembers(orgSlug),
    listPendingInvites(orgSlug),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink">{dict.title}</h1>
      <p className="mt-1 text-muted">{dict.subtitle(access.orgName)}</p>

      <div className="mt-6">
        <InviteForm orgSlug={orgSlug} locale={locale} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
          {dict.membri(members.length)}
        </h2>
        <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{m.name || m.email}</p>
                {m.name && <p className="text-xs text-muted">{m.email}</p>}
              </div>
              <span className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium text-muted">
                {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {pendingInvites.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
            {dict.invitatiiInAsteptare(pendingInvites.length)}
          </h2>
          <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{inv.email}</p>
                  <p className="text-xs text-muted">
                    {dict.expira(new Date(inv.expiresAt).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-US"))}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium text-muted">
                  {ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
