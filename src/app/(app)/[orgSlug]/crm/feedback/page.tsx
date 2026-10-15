import { requireOrgAccess } from "@/lib/auth/guard";

import { obtineDateFeedback } from "./actions";
import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

// Chestionarul de satisfacție și sugestiile utilizatorilor. Deschis tuturor membrilor, pe orice pachet (și în proba gratuită).
export default async function FeedbackPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const date = await obtineDateFeedback(orgSlug);
  return <FeedbackClient orgSlug={orgSlug} initial={date} />;
}
