"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { DICTIONAR_METRICI, NOTE_LIMITE } from "@/lib/reclame/dictionar";
import { PARAMETRI_META } from "@/lib/reclame/utm";

import { Card } from "../components/ui/card";

// Ghidul de pornire, pentru ONG-ul care își măsoară propriile reclame. Fără termeni tehnici: ce faci, unde dai clic, ce ar trebui să vezi.
// Detaliile pentru dezvoltatori (tabele, comenzi, variabile de server) sunt în documentation/reclame-implementare.md, nu aici.

function Cod({ text }: { text: string }) {
  const [copiat, setCopiat] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-[var(--ci-surface-2)] p-3 pr-24 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-[var(--ci-text)] [overflow-wrap:anywhere]">{text}</pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopiat(true);
            setTimeout(() => setCopiat(false), 1800);
          } catch {
            // clipboard indisponibil: textul rămâne selectabil
          }
        }}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-[11.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
      >
        {copiat ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copiat ? "Copiat" : "Copiază"}
      </button>
    </div>
  );
}

function Pas({ n, titlu, timp, children }: { n: number; titlu: string; timp?: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ci-primary)] text-[13px] font-bold text-white" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[15px] font-semibold text-[var(--ci-text)]">
          {titlu}
          {timp && <span className="ml-2 text-[12px] font-normal text-[var(--ci-text-muted)]">{timp}</span>}
        </p>
        <div className="space-y-2 text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">{children}</div>
      </div>
    </li>
  );
}

function Intrebare({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 py-2.5">
      <summary className="cursor-pointer text-[13.5px] font-semibold text-[var(--ci-text)]">{q}</summary>
      <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{children}</div>
    </details>
  );
}

const SABLON_LINK_PARAMETRI = PARAMETRI_META("cmp_001", "cr_001");

export function TabGhid() {
  return (
    <div className="space-y-5">
      <Card className="space-y-2">
        <h2 className="text-[17px] font-bold text-[var(--ci-text)]">Cum pornești, în 4 pași</h2>
        <p className="text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">
          Nu ai nevoie de programator. Prima dată durează cam o jumătate de oră, apoi pagina se actualizează singură. Ce obții: vezi cât ai cheltuit pe reclame și câți bani au intrat prin donațiile venite din ele.
        </p>
      </Card>

      <Card className="space-y-5">
        <ol className="space-y-6">
          <Pas n={1} titlu="Fă un link pentru reclama ta" timp="2 minute">
            <p>
              Mergi la fila <strong className="text-[var(--ci-text)]">Linkuri UTM</strong>, alege „Facebook, reclamă” (sau Instagram), lipește adresa paginii tale de donații din Alexandrit și apasă <strong className="text-[var(--ci-text)]">Copiază linkul</strong>.
            </p>
            <p>E un link obișnuit, cu câteva cuvinte-cod la coadă. Prin ele, Alexandrit știe de unde a venit donatorul. Codurile sunt neutre (cmp_001); numele cazului sau al beneficiarului nu intră niciodată în link.</p>
            <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[var(--ci-text)]">
              <strong>Important:</strong> reclama trebuie să ducă direct la pagina de campanie din Alexandrit. Dacă duce pe site-ul organizației și donația se face prin butonul de pe site, donația nu mai poate fi legată de reclamă.
            </p>
          </Pas>

          <Pas n={2} titlu="Pune linkul în reclama de pe Facebook / Instagram" timp="3 minute">
            <p>
              În Ads Manager, deschide reclama, la „Destinație” lipește linkul în câmpul <strong className="text-[var(--ci-text)]">Website URL</strong> (adresa site-ului) și publică. Pentru fiecare reclamă diferită, fă alt link: așa vezi care dintre ele aduce donații.
            </p>
            <p>Variantă mai comodă, dacă ai multe reclame: lasă adresa paginii în Website URL și lipești doar textul de mai jos în câmpul <strong className="text-[var(--ci-text)]">URL parameters</strong>, schimbând cmp_001 și cr_001 cu codurile tale din fila Linkuri UTM.</p>
            <Cod text={SABLON_LINK_PARAMETRI} />
          </Pas>

          <Pas n={3} titlu="Adu cheltuielile din Meta" timp="10 minute prima dată">
            <p>Ai două variante. Alege-o pe cea care ți se pare mai simplă:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-[var(--ci-text)]">Automat (recomandat):</strong> în fila <strong className="text-[var(--ci-text)]">Conexiuni</strong> lipești numărul contului de reclame și o cheie de acces (doar pentru citire), o singură dată. De acolo, cheltuielile vin singure. Pașii pentru cheie sunt scriși în aceeași filă, simplu.
              </li>
              <li>
                <strong className="text-[var(--ci-text)]">Fără conectare:</strong> din Ads Manager descarci un raport (fișier CSV) cu zilele și suma cheltuită și îl încarci la fila <strong className="text-[var(--ci-text)]">Import costuri</strong>. Îl refaci când vrei cifre noi, de exemplu o dată pe săptămână.
              </li>
            </ul>
            <p>Alexandrit doar citește: nu poate schimba bugete și nu poate porni sau opri reclame.</p>
          </Pas>

          <Pas n={4} titlu="Verifică dacă merge" timp="5 minute">
            <p>
              Deschide linkul de la pasul 1 și fă o donație mică (de exemplu 10 lei, sau în modul de test al plăților, dacă îl ai activat). După ce plata e confirmată, în fila <strong className="text-[var(--ci-text)]">Rezumat</strong> apare la „Donații confirmate atribuite reclamelor”. Dacă o vezi acolo, totul e în regulă.
            </p>
            <p>Dacă nu apare după câteva minute, deschide „Calitatea datelor” din Rezumat: spune ce lipsește.</p>
          </Pas>
        </ol>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Cum citești pagina în 30 de secunde</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">
          <li>
            <strong className="text-[var(--ci-text)]">Cheltuieli reclame:</strong> cât ai dat pe reclame în perioada aleasă.
          </li>
          <li>
            <strong className="text-[var(--ci-text)]">Donații confirmate atribuite:</strong> plăți reale, confirmate, la care donatorul venise dintr-o reclamă.
          </li>
          <li>
            <strong className="text-[var(--ci-text)]">Lei donați la 1 leu cheltuit:</strong> dacă e peste 1,00×, donațiile atribuite au acoperit costul reclamei; sub 1,00× nu încă. Atenție: unele donații nu pot fi legate de reclamă, deci cifra e un minim, nu totalul efectului.
          </li>
          <li>
            <strong className="text-[var(--ci-text)]">Cost per donație:</strong> cât te costă, în medie, o donație venită din reclame.
          </li>
        </ul>
      </Card>

      <Card className="space-y-2.5">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Dacă ceva nu iese</h2>
        <Intrebare q="Nu văd nicio donație atribuită reclamelor">
          <p>Verifică pe rând: (1) reclama duce la linkul făcut aici, cu codurile la coadă; (2) donatorul a plătit efectiv, nu doar a apăsat „Donează” (se numără doar plățile confirmate); (3) ai ales în pagină o perioadă care include ziua donației.</p>
          <p>Donațiile făcute prin transfer bancar, SMS sau prin butonul de pe site-ul propriu nu au cum să fie legate de o reclamă.</p>
        </Intrebare>
        <Intrebare q="Scrie că o cheltuială e „nealocată”">
          <p>Înseamnă că Alexandrit nu știe care cod din link aparține acelei campanii de la Meta. Deschide campania din tabel și scrie codul folosit în linkuri (de exemplu cmp_001). Dacă pui codul chiar în numele campaniei din Meta, legătura se face singură.</p>
        </Intrebare>
        <Intrebare q="Cifrele nu coincid cu cele din Ads Manager">
          <p>Alexandrit numără donații reale confirmate de procesatorul de plăți, nu conversiile raportate de Meta, deci cifrele diferă. Pot diferi și zilele (Meta folosește fusul orar al contului de reclame) și rambursările. Cheltuielile ar trebui să fie aceleași; dacă nu sunt, verifică perioada și moneda.</p>
        </Intrebare>
        <Intrebare q="Conexiunea scrie „Necesită reconectare”">
          <p>Cheia de acces a expirat sau a fost retrasă. Generează una nouă (pașii sunt în fila Conexiuni) și apasă Reconectează. Ce ai adus până atunci rămâne.</p>
        </Intrebare>
        <Intrebare q="Ce se întâmplă cu datele donatorilor?">
          <p>Nimic din acest modul nu trimite date către Facebook sau alte platforme. Alexandrit păstrează doar de unde a venit donația (codurile din link) și momentul vizitei. Fără acordul pentru statistici al vizitatorului nu se scrie nimic în browserul lui.</p>
        </Intrebare>
      </Card>

      <Card className="space-y-2.5">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Ce e bine de știut</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          {NOTE_LIMITE.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <details className="pt-1">
          <summary className="cursor-pointer text-[13.5px] font-semibold text-[var(--ci-text)]">Cum se calculează fiecare cifră</summary>
          <dl className="mt-2 divide-y divide-[var(--ci-border)]">
            {DICTIONAR_METRICI.map((d) => (
              <div key={d.cheie} className="py-2.5">
                <dt className="text-[13.5px] font-semibold text-[var(--ci-text)]">{d.nume}</dt>
                <dd className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
                  {d.formula}
                  {d.nota && <span className="mt-0.5 block text-[12.5px]">{d.nota}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </Card>
    </div>
  );
}
