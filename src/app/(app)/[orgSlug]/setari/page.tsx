import { redirect } from "next/navigation";

// Toate setările organizației sunt acum în CRM → Setări. Păstrăm vechea adresă (linkuri din emailuri, Canva, plăți),
// cu parametrii din adresă (ex. ?canva=ok); fragmentul (#dpa) îl păstrează browserul.
export default async function SetariPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const interogare = qs.toString();
  redirect(`/${orgSlug}/crm/setari${interogare ? `?${interogare}` : ""}`);
}
