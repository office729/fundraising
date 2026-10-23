import "server-only";

import { notFound, redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/billing/trial";
import { EroareUtilizator } from "@/lib/erori";

import { getAuthUser } from "./dal";

// Gardă pentru paginile și acțiunile echipei platformei (administratorii globali din lib/billing/trial.ts). Separată de withOrgSession/withOrgAdmin: acelea sunt
// scopate la O organizație și cer apartenență; aici lucrăm peste toate organizațiile, dar fără acces la datele lor.

// Pagini: nelogat → /login; logat fără drept → 404 (nu confirmăm că ruta există).
export async function cerePlatformAdminPagina(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();
  return authUser.email;
}

// Acțiuni server: aceleași reguli, dar cu eroare în loc de 404.
export async function cerePlatformAdminActiune(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
  return authUser.email;
}
