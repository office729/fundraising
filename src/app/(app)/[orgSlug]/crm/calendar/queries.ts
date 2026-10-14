import { withOrgSession } from "@/lib/auth/guard";
import { colecteazaEvenimente } from "@/lib/calendar-evenimente";
import type { EvenimentCalendar } from "@/lib/calendar-fundraising";

// Evenimentele organizației într-un interval (vezi lib/calendar-evenimente.ts); fiecare sursă apare doar dacă pachetul include modulul ei.
export const obtineEvenimente = withOrgSession(async (ctx, de: string, pana: string): Promise<EvenimentCalendar[]> => colecteazaEvenimente(ctx, de, pana));
