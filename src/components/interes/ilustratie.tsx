import type { LucideIcon } from "lucide-react";

// Ilustrația „Mai mult timp pentru tine”: cristalul Alexandrit și etichetele de sticlă (Donatori, Campanii, Echipă). Folosită de pop-up și de pagina /descopera.

// Cristalul din ilustrație: fațete cu degrade verde → albastru, desenate în SVG (clar la orice mărime).
export function Cristal() {
  return (
    <svg viewBox="0 0 300 340" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pf1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ff3ff" />
          <stop offset="1" stopColor="#1e8fe0" />
        </linearGradient>
        <linearGradient id="pf2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4de29a" />
          <stop offset="1" stopColor="#2fb4a6" />
        </linearGradient>
        <linearGradient id="pf3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#58e0e8" />
          <stop offset="1" stopColor="#1578d0" />
        </linearGradient>
        <linearGradient id="pf4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2aa6e6" />
          <stop offset="1" stopColor="#0f58b8" />
        </linearGradient>
        <linearGradient id="pf5" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f6fd6" />
          <stop offset="1" stopColor="#0a3a95" />
        </linearGradient>
        <linearGradient id="pf6" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fbf86" />
          <stop offset="1" stopColor="#1b66c8" />
        </linearGradient>
      </defs>
      <g stroke="rgba(255,255,255,.35)" strokeWidth="1" strokeLinejoin="round">
        <polygon points="150,0 10,125 145,150" fill="url(#pf1)" />
        <polygon points="150,0 145,150 290,85" fill="url(#pf2)" />
        <polygon points="10,125 55,215 145,150" fill="url(#pf3)" />
        <polygon points="145,150 55,215 145,335" fill="url(#pf4)" />
        <polygon points="145,150 145,335 235,265" fill="url(#pf5)" />
        <polygon points="145,150 235,265 290,85" fill="url(#pf6)" />
      </g>
      <polygon points="150,0 118,72 145,150" fill="rgba(255,255,255,.55)" />
      <polygon points="10,125 100,112 145,150" fill="rgba(255,255,255,.3)" />
    </svg>
  );
}

export function Eticheta({ icon: Icon, text, className }: { icon: LucideIcon; text: string; className: string }) {
  return (
    <span className={`absolute flex items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,20,60,.35)] backdrop-blur-sm ${className}`}>
      <Icon className="h-5 w-5 text-[#2de2a8]" aria-hidden />
      {text}
    </span>
  );
}
