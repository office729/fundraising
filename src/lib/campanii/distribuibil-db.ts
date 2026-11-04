import { and, eq, or } from "drizzle-orm";

import { fundraisingPages } from "@/lib/db/schema";

// Aceeași regulă ca poateFiDistribuit (distribuibil.ts), pentru interogările Drizzle pe fundraising_pages.
export const filtruDistribuibil = () =>
  and(
    eq(fundraisingPages.status, "activa"),
    eq(fundraisingPages.consimtamantGdpr, true),
    eq(fundraisingPages.anonimizat, false),
    eq(fundraisingPages.acordRetras, false),
    or(eq(fundraisingPages.minor, false), eq(fundraisingPages.acordDistribuireMinor, true)),
  );
