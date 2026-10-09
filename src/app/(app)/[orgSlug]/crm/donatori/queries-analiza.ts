import { withOrgSession } from "@/lib/auth/guard";
import { citesteAcasaPf, citesteAnalizePf, citesteProiectePf } from "@/lib/donatori-pf-analiza";

export type { AcasaPf, AnalizePf, RandProiect } from "@/lib/donatori-pf-analiza";

// Citirile pentru Acasă, Proiecte și Analize în CRM Persoane fizice; logica e în lib/donatori-pf-analiza.ts (testabilă fără sesiune).
export const getAcasaPf = withOrgSession(async (ctx) => citesteAcasaPf(ctx));
export const getProiectePf = withOrgSession(async (ctx) => citesteProiectePf(ctx));
export const getAnalizePf = withOrgSession(async (ctx) => citesteAnalizePf(ctx));
