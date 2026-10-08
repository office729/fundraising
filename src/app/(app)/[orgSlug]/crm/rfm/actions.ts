"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { obtineSegmenteReale, type SegmentStat } from "@/lib/segmente-donatori";

export const getSegmenteReale = withOrgSession(async (ctx): Promise<SegmentStat[]> => obtineSegmenteReale(ctx.db, ctx.orgId));
