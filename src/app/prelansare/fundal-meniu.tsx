import {
  Award,
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  Gauge,
  GraduationCap,
  HandCoins,
  HandHeart,
  HeartHandshake,
  Landmark,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  MessageSquareHeart,
  Network,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Users,
  Wrench,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

import { DASHBOARD_DICT } from "@/lib/i18n/dictionaries/dashboard";

// Fundalul paginii de pre-lansare: meniul real al platformei (aceleași secțiuni și module ca în CRM, din același dicționar), randat mare și încețoșat,
// ca să se vadă cât de multe face Alexandrit fără să se poată citi date. Decorativ: nu conține date reale, doar forme și etichetele modulelor.
const nav = DASHBOARD_DICT.ro.nav as Record<string, string>;
const hints = DASHBOARD_DICT.ro.hints as Record<string, string>;

type Modul = { cheie: string; icon: LucideIcon };
const SECTIUNI: { titlu: string | null; module: Modul[] }[] = [
  { titlu: null, module: [{ cheie: "home", icon: Gauge }] },
  {
    titlu: nav.sectionRelatii ?? "Relații",
    module: [
      { cheie: "companii", icon: Building2 },
      { cheie: "companiiD177", icon: Landmark },
      { cheie: "donatori", icon: Users },
      { cheie: "formular230", icon: FileSignature },
      { cheie: "voluntariPanou", icon: Link2 },
      { cheie: "voluntari", icon: HandHeart },
      { cheie: "beneficiari", icon: HeartHandshake },
    ],
  },
  {
    titlu: nav.sectionFinanciar ?? "Strângere de fonduri",
    module: [
      { cheie: "donatii", icon: Sparkles },
      { cheie: "strangereFonduri", icon: HandCoins },
      { cheie: "statisticiCampanii", icon: BarChart3 },
      { cheie: "reclame", icon: Megaphone },
      { cheie: "granturi", icon: Award },
      { cheie: "fonduriPlati", icon: Banknote },
      { cheie: "rfm", icon: LayoutGrid },
    ],
  },
  {
    titlu: nav.sectionOperare ?? "Lucru",
    module: [
      { cheie: "calendar", icon: CalendarDays },
      { cheie: "comunicare", icon: MessageSquare },
    ],
  },
  {
    titlu: nav.sectionPerformanta ?? "Performanță",
    module: [
      { cheie: "performanta", icon: Target },
      { cheie: "organizatie", icon: Network },
      { cheie: "programLucru", icon: CalendarClock },
    ],
  },
  {
    titlu: nav.sectionPlatforma ?? "Platformă",
    module: [
      { cheie: "instrumente", icon: Wrench },
      { cheie: "consultanta", icon: GraduationCap },
      { cheie: "feedback", icon: MessageSquareHeart },
      { cheie: "facturare", icon: Receipt },
      { cheie: "setari", icon: Settings },
    ],
  },
];

const TOATE = SECTIUNI.flatMap((s) => s.module).filter((m) => m.cheie !== "home");

export function FundalMeniu() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#08213b]">
      {/* Aplicația, mărită și încețoșată: bara laterală cu tot meniul + o grilă cu toate modulele. */}
      <div className="absolute top-[-4%] left-[1.5%] flex h-[112%] w-[105%] origin-top-left gap-5 select-none">
        <aside className="hidden h-full w-[330px] shrink-0 rounded-2xl bg-white p-5 shadow-2xl blur-[1.2px] sm:block">
          <div className="mb-4 flex items-center gap-2.5 px-1">
            <span className="h-8 w-8 rounded-lg bg-[#154a85]" />
            <span className="h-3.5 w-28 rounded bg-[#154a85]/70" />
          </div>
          <div className="space-y-3.5">
            {SECTIUNI.map((s, i) => (
              <div key={i}>
                {s.titlu && <p className="px-2 pb-1 text-[11.5px] font-bold tracking-widest text-slate-500 uppercase">{s.titlu}</p>}
                <ul className="space-y-0.5">
                  {s.module.map((m) => {
                    const Icon = m.icon;
                    const activ = m.cheie === "strangereFonduri";
                    return (
                      <li key={m.cheie} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[15px] font-medium ${activ ? "bg-[#154a85] text-white" : "text-slate-800"}`}>
                        <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" />
                        <span className="truncate">{nav[m.cheie]}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5 blur-[3px]">
          <div className="flex h-14 shrink-0 items-center justify-between rounded-2xl bg-white/90 px-5 shadow-xl">
            <span className="h-3.5 w-56 rounded bg-slate-300" />
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-full bg-[#3fa85c]/80" />
              <span className="h-3 w-24 rounded bg-slate-300" />
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-white/90 p-4 shadow-xl">
                <span className="block h-2.5 w-20 rounded bg-slate-300" />
                <span className="mt-3 block h-7 w-24 rounded bg-[#154a85]/80" />
                <span className="mt-3 block h-2 w-32 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-hidden lg:grid-cols-3 xl:grid-cols-4">
            {TOATE.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.cheie} className="rounded-2xl bg-white/90 p-4 shadow-xl">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#154a85]/10 text-[#154a85]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3 text-[15px] leading-tight font-bold text-slate-800">{nav[m.cheie]}</p>
                  <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-slate-500">{hints[m.cheie] ?? ""}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Peste el: albastrul mărcii, ca textul din față să rămână lizibil, și o lumină verde, discretă, în colț. */}
      <div className="absolute inset-0 bg-[#0b3157]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_58%_62%_at_52%_50%,rgba(8,33,59,0.93)_0%,rgba(8,33,59,0.8)_52%,rgba(8,33,59,0)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#08213b] to-transparent" />
      <div className="absolute top-[-18%] right-[-8%] h-[520px] w-[520px] rounded-full bg-[#3fa85c]/25 blur-[120px]" />
      <div className="absolute bottom-[-24%] left-[-10%] h-[560px] w-[560px] rounded-full bg-[#3d6fb0]/35 blur-[130px]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:26px_26px]" />
    </div>
  );
}
