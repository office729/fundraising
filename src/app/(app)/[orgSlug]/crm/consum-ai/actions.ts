"use server";

import { withOrgAdmin } from "@/lib/auth/guard";
import { citesteDateConsum, type DateConsumAi } from "@/lib/ai-org/date-consum";

export type { DateConsumAi };

// Consumul AI al organizației (doar owner/admin, în toate pachetele: contul Anthropic e al organizației).
export const obtineConsumAi = withOrgAdmin(async (ctx): Promise<DateConsumAi> => citesteDateConsum(ctx));
