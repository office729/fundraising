import { LegalLayout, Sectiune } from "../legal-shared";

export default function GdprPage() {
  return (
    <LegalLayout eyebrow="Legal" titlu="Politica de confidențialitate (GDPR)" actualizat="[DE COMPLETAT — data publicării]">
      <Sectiune titlu="1. Operator de date">
        <p>
          Operator: [DE COMPLETAT — denumirea legală a entității], sediu [DE COMPLETAT], CUI/CIF [DE COMPLETAT],
          contact: vlad.placinta@fundrasingacademy.ro.
        </p>
      </Sectiune>

      <Sectiune titlu="2. Ce date colectăm">
        <p>Pe site și în platformă putem colecta:</p>
        <ul className="list-disc pl-5">
          <li>Date de cont: nume, email, parolă (stocată criptat prin furnizorul de autentificare).</li>
          <li>Date de contact trimise prin formulare sau email (nume, telefon, mesaj).</li>
          <li>
            Date introduse voluntar de client în CRM-ul propriu din Hub Fundraising (donatori, companii, contracte)
            — acestea aparțin organizației client, nu Fundraising Academy; sunt izolate per organizație.
          </li>
          <li>Date tehnice minime (cookie-uri de sesiune) — vezi Politica de cookies.</li>
        </ul>
      </Sectiune>

      <Sectiune titlu="3. Scopul prelucrării">
        <p>
          Furnizarea serviciilor solicitate (cont, abonament, consiliere), comunicare cu clientul, facturare și
          îndeplinirea obligațiilor legale (contabile, fiscale).
        </p>
      </Sectiune>

      <Sectiune titlu="4. Temeiul legal">
        <p>
          Executarea contractului (art. 6(1)(b) GDPR) pentru furnizarea serviciilor; consimțământul (art. 6(1)(a))
          pentru comunicări opționale; interesul legitim (art. 6(1)(f)) pentru securitate și îmbunătățirea
          serviciului; obligația legală (art. 6(1)(c)) pentru evidențe contabile/fiscale.
        </p>
      </Sectiune>

      <Sectiune titlu="5. Cât timp păstrăm datele">
        <p>
          [DE COMPLETAT — perioade concrete de retenție: date de cont pe durata abonamentului + termenul legal
          ulterior; documente fiscale conform legislației contabile din România (de regulă minimum 10 ani).]
        </p>
      </Sectiune>

      <Sectiune titlu="6. Drepturile persoanelor vizate">
        <p>Conform GDPR, ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate a datelor, opoziție și de a depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).</p>
        <p>
          Pentru exercitarea oricărui drept: <strong>vlad.placinta@fundrasingacademy.ro</strong>.
        </p>
      </Sectiune>

      <Sectiune titlu="7. Sub-procesatori și găzduire">
        <p>
          [DE COMPLETAT — lista furnizorilor tehnici implicați: găzduire aplicație (Vercel), bază de date/autentificare
          (Supabase), procesator de plăți, orice serviciu de email/SMS folosit — cu mențiunea țării/regiunii unde
          sunt găzduite datele.]
        </p>
      </Sectiune>

      <Sectiune titlu="8. Datele din CRM-ul clienților (organizații ONG)">
        <p>
          Pentru organizațiile care folosesc Hub Fundraising, Fundraising Academy acționează ca persoană
          împuternicită (procesator) pentru datele donatorilor/companiilor introduse de organizație în propriul
          CRM — organizația rămâne operator pentru acele date. [DE COMPLETAT — dacă e cazul, un Acord de Prelucrare
          a Datelor (DPA) separat, semnat cu fiecare organizație client.]
        </p>
      </Sectiune>
    </LegalLayout>
  );
}
