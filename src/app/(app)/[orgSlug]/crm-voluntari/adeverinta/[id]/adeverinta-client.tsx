"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

import type { DateAdeverinta } from "./actions";

const azi = () => new Date().toISOString().slice(0, 10);
const ro = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "…");

const camp = "w-full rounded-lg border border-[#d4cdc6] bg-white px-3 py-2 text-[14px] text-[#25211e] focus:border-[#1c4f8a] focus:ring-2 focus:ring-[#1c4f8a]/20 focus:outline-none";

// Adeverința de voluntariat: pagină A4 de tipărit sau salvat ca PDF. Activitatea din platformă e completată automat (distribuiri în
// campanii, sarcini îndeplinite); numărul, adresa, orele, scopul și semnatarul se scriu aici, înainte de tipărire.
export function AdeverintaClient({ orgSlug, date }: { orgSlug: string; date: DateAdeverinta }) {
  const prima = date.panou.prima ?? date.voluntar.dataInscriere ?? "";
  const activitatiImplicite = [
    date.panou.distribuiri > 0 ? `a dat mai departe campaniile organizației (${date.panou.distribuiri} ${date.panou.distribuiri === 1 ? "distribuire" : "distribuiri"}${date.panou.campanii.length ? `, campanii: ${date.panou.campanii.join(", ")}` : ""})` : "",
    date.sarcini.finalizate > 0 ? `a îndeplinit ${date.sarcini.finalizate} ${date.sarcini.finalizate === 1 ? "sarcină" : "sarcini"}${date.sarcini.texte.length ? `: ${date.sarcini.texte.join("; ")}` : ""}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  const [nr, setNr] = useState("");
  const [dataEmitere, setDataEmitere] = useState(azi());
  const [adresa, setAdresa] = useState("");
  const [de, setDe] = useState(prima.slice(0, 10));
  const [pana, setPana] = useState(date.panou.ultima ?? azi());
  const [ore, setOre] = useState("");
  const [scop, setScop] = useState("");
  const [activitati, setActivitati] = useState(activitatiImplicite);
  const [semnatar, setSemnatar] = useState("");
  const [functie, setFunctie] = useState("");

  const eticheta = (t: string) => <span className="mb-1 block text-[12.5px] font-semibold text-[#4a423c]">{t}</span>;

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#eeeae5] text-[#25211e]" style={{ colorScheme: "light" }}>
      <style>{`
        @page { size: A4; margin: 18mm; }
        @media print {
          body * { visibility: hidden !important; }
          #adeverinta, #adeverinta * { visibility: visible !important; }
          #adeverinta { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
        }
      `}</style>

      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 p-4 lg:flex-row lg:items-start">
        {/* Câmpuri de completat (nu se tipăresc) */}
        <aside className="w-full shrink-0 space-y-3 rounded-2xl border border-[#ded7d0] bg-white p-4 lg:sticky lg:top-4 lg:w-[340px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[17px] font-bold">Adeverință de voluntariat</h1>
              <a href={`/${orgSlug}/crm-voluntari`} className="text-[12.5px] font-medium text-[#1c4f8a] hover:underline">
                ← CRM Voluntari
              </a>
            </div>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1c4f8a] px-3.5 py-2 text-[14px] font-semibold text-white hover:bg-[#163f6f] focus-visible:ring-2 focus-visible:ring-[#1c4f8a] focus-visible:ring-offset-2 focus-visible:outline-none">
              <Printer className="size-4" aria-hidden /> Tipărește
            </button>
          </div>
          <p className="text-[12.5px] text-[#6a6159]">Activitatea din platformă e completată automat. Verifică și completează restul, apoi tipărește sau salvează ca PDF.</p>

          <label className="block">
            {eticheta("Număr adeverință")}
            <input className={camp} value={nr} onChange={(e) => setNr(e.target.value)} placeholder="ex. 12" />
          </label>
          <label className="block">
            {eticheta("Data emiterii")}
            <input className={camp} type="date" value={dataEmitere} onChange={(e) => setDataEmitere(e.target.value)} />
          </label>
          <label className="block">
            {eticheta("Domiciliul voluntarului")}
            <input className={camp} value={adresa} onChange={(e) => setAdresa(e.target.value)} placeholder="Localitate, stradă, număr" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              {eticheta("Din data")}
              <input className={camp} type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label className="block">
              {eticheta("Până la")}
              <input className={camp} type="date" value={pana} onChange={(e) => setPana(e.target.value)} />
            </label>
          </div>
          <label className="block">
            {eticheta("Număr de ore")}
            <input className={camp} inputMode="numeric" value={ore} onChange={(e) => setOre(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="ex. 40" />
          </label>
          <label className="block">
            {eticheta("Activitatea desfășurată")}
            <textarea className={`${camp} min-h-[110px]`} value={activitati} onChange={(e) => setActivitati(e.target.value)} />
          </label>
          <label className="block">
            {eticheta("Scopul adeverinței")}
            <input className={camp} value={scop} onChange={(e) => setScop(e.target.value)} placeholder="ex. depunere la facultate" />
          </label>
          <label className="block">
            {eticheta("Semnatar (nume)")}
            <input className={camp} value={semnatar} onChange={(e) => setSemnatar(e.target.value)} />
          </label>
          <label className="block">
            {eticheta("Funcția semnatarului")}
            <input className={camp} value={functie} onChange={(e) => setFunctie(e.target.value)} placeholder="ex. Președinte" />
          </label>
        </aside>

        {/* Documentul */}
        <article id="adeverinta" className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-[18mm] text-[12.5pt] leading-[1.6] shadow-[0_2px_18px_rgba(0,0,0,.12)]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          <header className="border-b border-[#25211e] pb-3">
            <p className="text-[15pt] font-bold">{date.org.nume}</p>
            {(date.org.cif || date.org.adresa) && (
              <p className="text-[10.5pt] text-[#4a423c]">
                {date.org.cif ? `CIF ${date.org.cif}` : ""}
                {date.org.cif && date.org.adresa ? " · " : ""}
                {date.org.adresa ?? ""}
              </p>
            )}
          </header>

          <p className="mt-6 text-right text-[11pt]">
            Nr. {nr || "……"} / {ro(dataEmitere)}
          </p>
          <h2 className="mt-4 text-center text-[17pt] font-bold tracking-wide">ADEVERINȚĂ DE VOLUNTARIAT</h2>

          <p className="mt-8 text-justify">
            Se adeverește prin prezenta că <strong>{date.voluntar.nume || "……………"}</strong>
            {adresa ? `, domiciliat(ă) în ${adresa},` : ""} a desfășurat activitate de voluntariat în cadrul organizației {date.org.nume}, în perioada {ro(de)} – {ro(pana)}
            {ore ? `, însumând ${ore} ${ore === "1" ? "oră" : "ore"} de voluntariat` : ""}.
          </p>
          {activitati.trim() && (
            <p className="mt-4 text-justify">
              În această perioadă, voluntarul {activitati.trim().replace(/[.;\s]+$/, "")}.
            </p>
          )}
          <p className="mt-4 text-justify">
            Prezenta adeverință se eliberează la cererea persoanei interesate{scop ? `, pentru ${scop}` : ""}.
          </p>

          <div className="mt-16 flex justify-end">
            <div className="w-[70mm] text-center">
              <p className="font-semibold">{functie || "Reprezentant"}</p>
              <p>{semnatar || "………………………"}</p>
              <p className="mt-10 border-t border-[#25211e] pt-1 text-[10.5pt] text-[#4a423c]">semnătura și ștampila</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
