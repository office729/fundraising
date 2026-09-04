import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase pentru server (Server Components, Server Actions, Route Handlers).
//
// `persist: false` (folosit doar la autentificare, când utilizatorul debifează
// „Rămâi conectat") face cookie-ul de sesiune să dispară la închiderea
// browserului — scoatem `maxAge`/`expires` din opțiunile pe care le stabilește
// Supabase, restul comportamentului (refresh token etc.) rămâne neschimbat.
export async function createClient(options?: { persist?: boolean }) {
  const cookieStore = await cookies();
  const persist = options?.persist ?? true;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
              cookieStore.set(
                name,
                value,
                persist ? cookieOptions : { ...cookieOptions, maxAge: undefined, expires: undefined },
              ),
            );
          } catch {
            // Apelat dintr-un Server Component (nu poate seta cookie-uri).
            // Reîmprospătarea sesiunii se face în proxy — se poate ignora.
          }
        },
      },
    },
  );
}
