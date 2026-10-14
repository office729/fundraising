"use server";

import { guardModul } from "@/lib/auth/guard-modul";
import { obtineSegmenteReale, type SegmentStat } from "@/lib/segmente-donatori";

const { withOrgSession } = guardModul("analiza-baze");

export const getSegmenteReale = withOrgSession(async (ctx): Promise<SegmentStat[]> => obtineSegmenteReale(ctx.db, ctx.orgId));
