import { LegalLayout, Sectiune } from "../legal-shared";

const COOKIE_URI = [
  { nume: "sb-*-auth-token", scop: "Menține sesiunea de autentificare (Supabase Auth) — te ține conectat între vizite.", durata: "Sesiune sau persistent, în funcție de „Rămâi conectat” bifat la autentificare" },
  { nume: "sb-*-auth-token-code-verifier", scop: "Verificare tehnică temporară pentru finalizarea autentificării (cod OAuth/email).", durata: "Câteva minute" },
];

export default function CookiesPage() {
  return (
    <LegalLayout eyebrow="Legal" titlu="Politica de cookies" actualizat="[DE COMPLETAT — data publicării]">
      <Sectiune titlu="1. Ce sunt cookie-urile">
        <p>
          Cookie-urile sunt fișiere text mici, stocate în browser, care permit unui site să rețină informații între
          vizite — de exemplu, dacă ești autentificat sau nu.
        </p>
      </Sectiune>

      <Sectiune titlu="2. Cookie-uri strict necesare, folosite efectiv de platformă">
        <p>
          Platforma Fundraising Academy folosește exclusiv cookie-uri <strong>strict necesare</strong> pentru
          autentificare — nu folosim cookie-uri de marketing, publicitate sau analiză a traficului bazate pe
          identificatori individuali.
        </p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-2.5 font-semibold text-ink">Cookie</th>
                <th className="p-2.5 font-semibold text-ink">Scop</th>
                <th className="p-2.5 font-semibold text-ink">Durată</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_URI.map((c) => (
                <tr key={c.nume} className="border-t border-line">
                  <td className="p-2.5 font-mono text-[12px] text-brand-blue">{c.nume}</td>
                  <td className="p-2.5 text-body">{c.scop}</td>
                  <td className="p-2.5 text-muted-2">{c.durata}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sectiune>

      <Sectiune titlu="3. Stocare locală (nu e tehnic un cookie)">
        <p>
          Folosim și <code>localStorage</code> în browser — nu se trimite către server — pentru preferința de temă
          (light/dark) și, în modulul CRM demonstrativ, pentru datele de test introduse local. Se șterge dacă ștergi
          datele site-ului din browser.
        </p>
      </Sectiune>

      <Sectiune titlu="4. Cookie-uri terțe">
        <p>
          Dacă activezi autentificarea cu Google, Google poate seta propriile cookie-uri în timpul procesului de
          autentificare, conform{" "}
          <a href="https://policies.google.com/privacy" className="font-medium text-brand-green" target="_blank" rel="noreferrer">
            politicii de confidențialitate Google
          </a>
          . [DE COMPLETAT — orice alt serviciu terț adăugat ulterior: procesator de plăți, analytics etc.]
        </p>
      </Sectiune>

      <Sectiune titlu="5. Cum gestionezi cookie-urile">
        <p>
          Poți șterge sau bloca cookie-urile din setările browserului — reține că blocarea cookie-ului de sesiune te
          va deconecta din platformă la fiecare vizită.
        </p>
      </Sectiune>
    </LegalLayout>
  );
}
