"use server";

import { redirect } from "next/navigation";

import { withOrgSession } from "@/lib/auth/guard";
import { reinnoiesteAcceptareTermeni } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Reacceptarea Termenilor/Politicii (poarta din layout). Permisă și când accesul
// e blocat de paywall — acceptarea nu trebuie să depindă de abonament.
export const acceptaTermeniAction = withOrgSession(
  async (ctx) => {
    await reinnoiesteAcceptareTermeni(ctx.db, ctx.userId);
  },
  { permiteAccesBlocat: true },
);
