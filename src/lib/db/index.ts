import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;
// Tipul parametrului `tx` primit de callback-ul `db.transaction(async (tx) => ...)`
// — util pentru funcții helper reutilizate în mai multe tranzacții (ex. webhook Stripe).
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

// Inițializare LAZY, ca în SOI_CRM: conexiunea se face la prima folosire,
// nu la evaluarea modulului (altfel `next build` ar pica fără env disponibil).
//
// IMPORTANT: DATABASE_URL trebuie să folosească rolul `app_user`
// (NOBYPASSRLS, NU owner de schemă) — vezi documentation/rls-setup.sql.
// Rolul `migrator` (owner) e folosit STRICT de drizzle-kit (MIGRATOR_DATABASE_URL
// în drizzle.config.ts), niciodată de aplicația care rulează în producție.
let cached: DB | null = null;

function getDb(): DB {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL lipsește din mediu (.env.local / Vercel).");
  }
  const client = postgres(connectionString, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
