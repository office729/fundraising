"use server";

import { revalidatePath } from "next/cache";

import { withOrgAdmin } from "@/lib/auth/guard";
import { creeazaToken, citesteVersiuneWebhook, regenereazaWebhook } from "@/lib/waalaxy-server";

// Adresa secretă a webhook-ului Waalaxy al organizației (răspunsuri și acceptări de invitație pe LinkedIn). Doar owner și administratorii o văd sau o regenerează;
// regenerarea o înlocuiește pe cea veche, care încetează să mai funcționeze. Token-ul e semnat (nu se păstrează în baza de date), vezi lib/waalaxy-server.ts.
const OPTIUNI = { modul: "prospectare-multi" as const };
const BAZA = () => process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro";
const adresa = (orgId: string, versiune: number) => `${BAZA()}/api/waalaxy/webhook?t=${creeazaToken(orgId, versiune)}`;

export type AdresaWebhook = { adresa: string | null };

export const getAdresaWebhookWaalaxy = withOrgAdmin(async (ctx): Promise<AdresaWebhook> => {
  const v = await citesteVersiuneWebhook(ctx.db, ctx.orgId);
  return { adresa: v ? adresa(ctx.orgId, v) : null };
}, OPTIUNI);

export const regenereazaAdresaWebhookWaalaxy = withOrgAdmin(async (ctx): Promise<AdresaWebhook> => {
  const v = await regenereazaWebhook(ctx.db, ctx.orgId);
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { adresa: adresa(ctx.orgId, v) };
}, OPTIUNI);
