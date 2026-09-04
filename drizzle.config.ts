import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit rulează ca CLI separat de Next.js, deci încărcăm manual .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Migrările rulează ca rol `migrator` (owner de schemă), pe conexiunea directă (5432).
    url: process.env.MIGRATOR_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
