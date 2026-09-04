import { LegalLayout, Sectiune } from "../legal-shared";

export default function TermeniPage() {
  return (
    <LegalLayout eyebrow="Legal" titlu="Termeni și condiții" actualizat="[DE COMPLETAT — data publicării]">
      <Sectiune titlu="1. Despre acest document">
        <p>
          Acești Termeni și condiții reglementează utilizarea site-ului fundrasingacademy.ro și a platformei
          Fundraising Academy (cursuri, consiliere, Hub Fundraising, servicii de implementare Website Fundraising),
          operate de [DE COMPLETAT — denumirea legală a entității, ex. „Vlad Plăcintă PFA” / „Asociația ...”], cu
          sediul în [DE COMPLETAT — adresă], CUI/CIF [DE COMPLETAT].
        </p>
      </Sectiune>

      <Sectiune titlu="2. Serviciile oferite">
        <p>
          Platforma oferă: (a) cursuri și materiale educaționale de fundraising; (b) sesiuni de consiliere 1 la 1;
          (c) instrumente software prin abonament („Hub Fundraising” — CRM, generator de documente, rapoarte etc.);
          (d) servicii de implementare a unei platforme digitale de fundraising („Website Fundraising”).
        </p>
      </Sectiune>

      <Sectiune titlu="3. Cont și abonament">
        <p>
          Crearea unui cont presupune furnizarea unei adrese de email valide. Abonamentele Hub Fundraising (START,
          CREȘTERE, IMPACT) se facturează lunar sau anual, conform prețurilor afișate pe pagina{" "}
          <code>/hub</code> la momentul înscrierii. Perioada de probă este de 14 zile, fără a fi necesar un card
          bancar.
        </p>
        <p>[DE COMPLETAT — politica exactă de reziliere, rambursare și suspendare a contului.]</p>
      </Sectiune>

      <Sectiune titlu="4. Plăți">
        <p>
          [DE COMPLETAT — procesatorul de plăți folosit, moneda de facturare, condițiile de facturare pentru
          pachetele de implementare Website Fundraising (700€ / 3.500€ / 10.000€), taxe aplicabile.]
        </p>
      </Sectiune>

      <Sectiune titlu="5. Proprietate intelectuală">
        <p>
          Conținutul cursurilor, ghidurile, template-urile și materialele puse la dispoziție rămân proprietatea
          Fundraising Academy. Utilizatorul primește un drept de folosință personal, neexclusiv, pe durata
          abonamentului activ.
        </p>
      </Sectiune>

      <Sectiune titlu="6. Limitarea răspunderii">
        <p>
          [DE COMPLETAT — clauze standard de limitare a răspunderii, aplicabile serviciilor educaționale și software
          oferite; recomandăm redactare de către un avocat specializat, având în vedere caracterul organizației
          (ONG-uri) și natura datelor gestionate prin CRM (date cu caracter personal ale donatorilor).]
        </p>
      </Sectiune>

      <Sectiune titlu="7. Contact">
        <p>
          Pentru întrebări legate de acești termeni: <strong>vlad.placinta@fundrasingacademy.ro</strong>, 0752 753
          540.
        </p>
      </Sectiune>
    </LegalLayout>
  );
}
