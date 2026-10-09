"use client";

import { Check, Copy, ExternalLink, Mail, MessageCircle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { CANALE_VOLUNTAR, construiesteMesaj, type CanalId } from "@/lib/voluntari-panou";

import { bifeazaAction } from "../../actions";

type Props = {
  cod: string;
  campaignId: string;
  titlu: string;
  poveste: string;
  linkBaza: string; // linkul campaniei, deja cu ?utm_source=voluntari
  mesajPropriu: string | null; // textul echipei (per campanie sau implicit)
  variantaInitiala: number;
  bifateInitial: CanalId[];
  inMisiune: CanalId[];
  canalInitial: CanalId | null;
};

const buton = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold transition active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:ring-offset-2 focus-visible:outline-none";

export function CampanieClient(p: Props) {
  const router = useRouter();
  const [varianta, setVarianta] = useState(p.variantaInitiala);
  const [copiat, setCopiat] = useState<"mesaj" | "link" | null>(null);
  const [bifate, setBifate] = useState<Set<CanalId>>(new Set(p.bifateInitial));
  const [eroare, setEroare] = useState("");
  const [, start] = useTransition();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const mesaj = construiesteMesaj({ titlu: p.titlu, poveste: p.poveste, link: p.linkBaza, custom: p.mesajPropriu, varianta });
  const cuCanal = (canal: string) => mesaj.replaceAll(p.linkBaza, `${p.linkBaza}&utm_medium=${canal}`);
  const linkCanal = (canal: string) => `${p.linkBaza}&utm_medium=${canal}`;

  async function copiaza(text: string, ce: "mesaj" | "link") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback pentru browsere fără clipboard API (sau fără permisiune): selectăm textul și îl copiem.
      const el = areaRef.current;
      if (el && ce === "mesaj") {
        el.focus();
        el.select();
        document.execCommand("copy");
      }
    }
    setCopiat(ce);
    setTimeout(() => setCopiat(null), 2200);
    // Următoarea copiere începe cu altă frază (doar dacă textul e generat de platformă).
    if (ce === "mesaj" && !p.mesajPropriu?.trim()) setVarianta((v) => v + 1);
  }

  async function distribuieNativ() {
    const date = { title: p.titlu, text: mesaj.replace(p.linkBaza, "").trim(), url: linkCanal("alta") };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(date);
      } catch {
        /* anulat de utilizator */
      }
    } else {
      await copiaza(cuCanal("alta"), "mesaj");
    }
  }

  function comuta(canal: CanalId) {
    const nou = !bifate.has(canal);
    const urmator = new Set(bifate);
    if (nou) urmator.add(canal);
    else urmator.delete(canal);
    setBifate(urmator); // optimist
    setEroare("");
    start(async () => {
      const r = await bifeazaAction(p.cod, p.campaignId, canal, nou);
      if (!r.ok) {
        setBifate(bifate); // revenim
        setEroare(r.eroare);
      } else {
        router.refresh();
      }
    });
  }

  const cardPas = "rounded-2xl border border-[var(--vp-line)] bg-white p-4";
  const numarPas = "mb-2 flex items-center gap-2.5 font-display text-[16.5px] font-bold";
  const bulina = "flex size-6 items-center justify-center rounded-full bg-[var(--vp-brand)] text-[12px] text-white";

  return (
    <div className="space-y-4">
      <section className={cardPas} aria-labelledby="pas1">
        <h2 id="pas1" className={numarPas}>
          <span className={bulina}>1</span> Copiază mesajul
        </h2>
        <textarea
          ref={areaRef}
          readOnly
          rows={7}
          value={mesaj}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Mesajul de distribuit"
          className="w-full resize-none rounded-xl border border-[var(--vp-line)] bg-[#faf6f2] p-3 text-[14.5px] leading-relaxed text-[var(--vp-ink)] focus:ring-2 focus:ring-[var(--vp-brand)]/30 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => copiaza(mesaj, "mesaj")} className={`${buton} flex-1 bg-[var(--vp-brand)] text-white`}>
            {copiat === "mesaj" ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
            {copiat === "mesaj" ? "Copiat" : "Copiază mesajul"}
          </button>
          {!p.mesajPropriu?.trim() && (
            <button type="button" onClick={() => setVarianta((v) => v + 1)} className={`${buton} border border-[var(--vp-line)] bg-white`}>
              Alt început
            </button>
          )}
        </div>
        <p className="mt-2 text-[12.5px] text-[var(--vp-muted)]">La fiecare copiere, mesajul începe diferit, ca să nu pară trimis în serie.</p>
      </section>

      <section className={cardPas} aria-labelledby="pas2">
        <h2 id="pas2" className={numarPas}>
          <span className={bulina}>2</span> Trimite prietenilor
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(cuCanal("whatsapp"))}`} target="_blank" rel="noopener noreferrer" className={`${buton} bg-[#1f9d55] text-white`}>
            <MessageCircle className="size-5" aria-hidden /> WhatsApp
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkCanal("facebook"))}`} target="_blank" rel="noopener noreferrer" className={`${buton} bg-[#1877f2] text-white`}>
            <Share2 className="size-5" aria-hidden /> Facebook
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(p.titlu)}&body=${encodeURIComponent(cuCanal("email"))}`} className={`${buton} border border-[var(--vp-line)] bg-white`}>
            <Mail className="size-5" aria-hidden /> Email
          </a>
          <button type="button" onClick={() => copiaza(linkCanal("alta"), "link")} className={`${buton} border border-[var(--vp-line)] bg-white`}>
            {copiat === "link" ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
            {copiat === "link" ? "Link copiat" : "Copiază linkul"}
          </button>
        </div>
        <button type="button" onClick={distribuieNativ} className={`${buton} mt-2 w-full border border-[var(--vp-line)] bg-white`}>
          Distribuie din telefon…
        </button>
      </section>

      <section className={cardPas} aria-labelledby="pas3">
        <h2 id="pas3" className={numarPas}>
          <span className={bulina}>3</span> Bifează unde ai distribuit azi
        </h2>
        <p className="mb-3 text-[13px] text-[var(--vp-muted)]">Bifează după ce ai trimis. Poți debifa oricând, doar pentru azi.</p>
        <ul className="space-y-2">
          {CANALE_VOLUNTAR.map((c) => {
            const bifat = bifate.has(c.id);
            const vizat = p.inMisiune.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={bifat}
                  onClick={() => comuta(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none ${
                    bifat ? "border-[#bfe5cb] bg-[var(--vp-green-bg)]" : p.canalInitial === c.id ? "border-[var(--vp-gold-line)] bg-[var(--vp-gold-bg)]" : "border-[var(--vp-line)] bg-white"
                  }`}
                >
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${bifat ? "border-[var(--vp-green)] bg-[var(--vp-green)] text-white" : "border-[#d8cdc3]"}`} aria-hidden>
                    {bifat && <Check className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{c.nume}</span>
                    <span className="block text-[12.5px] text-[var(--vp-muted)]">{c.actiune}</span>
                  </span>
                  {vizat && <span className="shrink-0 rounded-full bg-[var(--vp-gold-bg)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--vp-gold)]">în misiune</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {eroare && (
          <p role="alert" className="mt-3 rounded-lg bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#9b2c20]">
            {eroare}
          </p>
        )}
      </section>

      <a href={p.linkBaza} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-[var(--vp-brand)] hover:underline">
        Vezi pagina campaniei <ExternalLink className="size-4" aria-hidden />
      </a>
    </div>
  );
}
