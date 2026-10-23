"use client";

import { useParams } from "next/navigation";

import { DashboardAcasa } from "./dashboard-acasa";

// Prima pagină a CRM; conținutul e în dashboard-acasa.tsx, ca să-l poată reda și previzualizarea de suport (app/platform-admin/previzualizare).
export default function CrmDashboardPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return <DashboardAcasa orgSlug={orgSlug} />;
}
