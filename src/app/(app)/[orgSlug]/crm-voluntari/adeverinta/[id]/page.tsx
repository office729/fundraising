import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";

import { obtineDateAdeverinta } from "./actions";
import { AdeverintaClient } from "./adeverinta-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adeverință de voluntariat", robots: { index: false, follow: false } };

export default async function AdeverintaPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  await requireOrgAccess(orgSlug);
  const date = await obtineDateAdeverinta(orgSlug, decodeURIComponent(id));
  if (!date) notFound();
  return <AdeverintaClient orgSlug={orgSlug} date={date} />;
}
