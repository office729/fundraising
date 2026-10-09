import type { MetadataRoute } from "next";

// Doar site-ul de prezentare e destinat indexării; aplicația, autentificarea, API-ul și linkurile publice
// cu date personale (formular 230, dezabonare, invitații) rămân în afara cautărilor.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/auth/",
          "/invite/",
          "/invite-beneficiar/",
          "/f230/",
          "/voluntar/",
          "/dezabonare",
          "/abonament/",
          "/platform-admin",
          "/beneficiar",
          "/reset-local-data",
        ],
      },
    ],
    sitemap: "https://alexandrit.ro/sitemap.xml",
  };
}
