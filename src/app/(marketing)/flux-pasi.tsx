import { Check } from "lucide-react";

// Cardul din antetul paginilor de marketing: pașii se aprind pe rând, o singură dată, apoi rămân aprinși (vezi globals.css, „fa-flux-*”).
// Înălțimea fiecărui pas urmează textul (fără valori fixe), deci nu se rupe la zoom mare, pe ecran îngust sau în engleză.
export function FluxPasi({ titlu, pasi, nota, numerotat = false }: { titlu: string; pasi: { t: string; d: string }[]; nota: string; numerotat?: boolean }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl shadow-black/20 sm:p-7">
      <p className="text-[12px] font-bold tracking-[0.12em] text-white/80 uppercase">{titlu}</p>
      <ol className="mt-6">
        {pasi.map((p, i) => {
          const ultimul = i === pasi.length - 1;
          return (
            <li key={p.t} className={`relative flex gap-4 ${ultimul ? "" : "pb-6"}`}>
              {!ultimul && (
                <span className="absolute top-10 -bottom-0.5 left-[17px] w-px bg-white/25" aria-hidden="true">
                  <span className="fa-flux-seg block h-full w-px bg-brand-green" style={{ animationDelay: `${i * 1.1 + 0.8}s` }} />
                </span>
              )}
              <span
                className="fa-flux-nod relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[14px] font-bold text-white"
                style={{ animationDelay: `${i * 1.1 + 0.3}s` }}
                aria-hidden="true"
              >
                {numerotat ? i + 1 : <Check className="h-4 w-4" />}
              </span>
              <span className="pt-0.5">
                <span className="fa-flux-text font-display block text-[15.5px] font-bold" style={{ animationDelay: `${i * 1.1 + 0.3}s` }}>
                  {p.t}
                </span>
                <span className="block text-[13px] text-white/80">{p.d}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 border-t border-white/15 pt-4 text-[12.5px] text-white/70">{nota}</p>
    </div>
  );
}
