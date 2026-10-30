"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { EroareUtilizator } from "@/lib/erori";
import { actualizeaza, listeazaAdmin, uneste, type IdeeAdmin, type ModificareIdee } from "@/lib/inovare/admin";

// Doar contul platformei: ideele ONG-urilor din Centrul de inovare (stare, efort, răspuns, ascundere, unire de duplicate).
async function cerePlatformAdmin(): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
}

export type RezultatInovare = { ok: true } | { ok: false; eroare: string };

export async function listeazaIdeiAction(): Promise<IdeeAdmin[]> {
  await cerePlatformAdmin();
  return listeazaAdmin();
}

export async function actualizeazaIdeeAction(id: string, modificare: ModificareIdee): Promise<RezultatInovare> {
  await cerePlatformAdmin();
  const r = await actualizeaza(String(id), modificare ?? {});
  revalidatePath("/platform-admin/inovare");
  return r.ok ? { ok: true } : { ok: false, eroare: r.eroare ?? "Nu am putut salva." };
}

export async function unesteIdeiAction(dublatId: string, inId: string): Promise<RezultatInovare> {
  await cerePlatformAdmin();
  const r = await uneste(String(dublatId), String(inId));
  revalidatePath("/platform-admin/inovare");
  return r.ok ? { ok: true } : { ok: false, eroare: r.eroare ?? "Nu am putut uni ideile." };
}
