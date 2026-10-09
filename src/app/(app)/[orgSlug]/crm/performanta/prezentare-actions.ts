"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { incarcaPrezentare } from "@/lib/performanta-prezentare";

export const obtinePrezentare = withOrgSession(async (ctx, cod: string | null, departmentId: string | null) => incarcaPrezentare(ctx, cod, departmentId));
