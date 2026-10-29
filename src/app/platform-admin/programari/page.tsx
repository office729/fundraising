import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";

import { incarcaProgramariAction } from "./actions";
import { ProgramariClient } from "./programari-client";

export const dynamic = "force-dynamic";

// Doar pentru contul platformei: calendarul intern de programări (înlocuiește Calendly). Programul disponibil, tipurile de întâlniri, zilele libere, textele
// paginii și programările primite. Pagina publică: /programare.
export default async function ProgramariPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) notFound();

  const { randuri, date } = await incarcaProgramariAction();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">Programări</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Tu alegi când ești disponibil, ce tipuri de întâlniri oferi și ce texte văd oamenii. Calendarul apare pe{" "}
        <Link href="/programare" target="_blank" className="font-semibold text-brand-blue underline">
          /programare
        </Link>
        , pe pagina de prețuri și în panoul organizațiilor. Fiecare programare ajunge și pe email, iar persoana primește confirmare cu link de anulare.
      </p>
      <p className="mt-2 max-w-3xl text-xs text-muted">Calendarul nu vede alte calendare (Google, Outlook): marchează în „Zile libere” zilele în care nu ești disponibil din alte motive.</p>
      <ProgramariClient randuri={randuri} date={date} />
    </main>
  );
}
