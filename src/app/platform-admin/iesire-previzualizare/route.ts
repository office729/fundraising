import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_PREVIZUALIZARE } from "@/lib/previzualizare";

// Ieșirea din previzualizarea navigabilă de suport: șterge cookie-ul de stare și duce înapoi în panoul platformei. Ștergerea unui cookie e inofensivă,
// deci nu cere verificare de drepturi; cine nu are cookie nu pierde nimic.
export async function GET(request: Request) {
  (await cookies()).delete(COOKIE_PREVIZUALIZARE);
  return NextResponse.redirect(new URL("/platform-admin", request.url));
}
