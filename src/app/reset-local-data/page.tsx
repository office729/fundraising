"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Rută de urgență, în AFARA layout-ului CRM (nu trece prin shell, nu apelează
// niciun hook care citește datele din localStorage) — astfel poate fi accesată
// și dacă o pagină din CRM nu se mai încarcă din cauza unui import prea mare
// blocat în localStorage. Șterge doar cheile acestui prototip (prefix "ci-"),
// niciodată tot localStorage-ul (acolo stă și sesiunea de autentificare).
type Rezultat = { status: "se-sterge" | "gata" | "eroare"; numarChei: number };

export default function ResetLocalDataPage() {
  const [rezultat, setRezultat] = useState<Rezultat>({ status: "se-sterge", numarChei: 0 });

  useEffect(() => {
    try {
      const chei = Object.keys(window.localStorage).filter((k) => k.startsWith("ci-"));
      chei.forEach((k) => window.localStorage.removeItem(k));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- acțiune unică imperativă (curăță localStorage), nu sincronizare reactivă
      setRezultat({ status: "gata", numarChei: chei.length });
    } catch {
      setRezultat({ status: "eroare", numarChei: 0 });
    }
  }, []);

  return (
    <main style={{ maxWidth: 440, margin: "96px auto", padding: "0 24px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Resetare date locale</h1>

      {rezultat.status === "se-sterge" && <p style={{ fontSize: 14, color: "#666" }}>Se șterg datele din acest browser…</p>}

      {rezultat.status === "gata" && (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Am șters {rezultat.numarChei} {rezultat.numarChei === 1 ? "cheie locală" : "chei locale"} din acest
            browser — importuri de donatori/companii, notițe, task-uri, sponsorizări adăugate manual etc. Setul
            demonstrativ al aplicației nu e afectat.
          </p>
          <p style={{ fontSize: 14, marginTop: 12 }}>
            <Link href="/" style={{ color: "#2563eb", fontWeight: 500 }}>
              Înapoi la aplicație →
            </Link>
          </p>
        </>
      )}

      {rezultat.status === "eroare" && (
        <p style={{ fontSize: 14, color: "#b91c1c" }}>
          Nu am putut accesa localStorage din acest browser (mod privat sau permisiuni blocate).
        </p>
      )}
    </main>
  );
}
