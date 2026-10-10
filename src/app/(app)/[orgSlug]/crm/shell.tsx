"use client";

import dynamic from "next/dynamic";
import {
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileSignature,
  Gauge,
  GraduationCap,
  HandCoins,
  HandHeart,
  HeartHandshake,
  HelpCircle,
  Landmark,
  LayoutGrid,
  Laptop,
  MapPin,
  LogOut,
  Link2,
  Menu,
  MessageSquare,
  Network,
  Plus,
  Receipt,
  UserPlus,
  ScanFace,
  Settings,
  Target,
  Sparkles,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { DomeniuActivitate } from "@/lib/campaign-templates";
import { AVATAR_DONATOR_ACTIV } from "@/lib/module-ascunse";
import { DASHBOARD_DICT, type DashboardDict } from "@/lib/i18n/dictionaries/dashboard";
import type { Locale } from "@/lib/i18n/config";

import { LogoutForm } from "../logout-form";
import { DomeniuProvider } from "./lib/domeniu-context";
import { LocaleProvider } from "./lib/locale-context";
import { Avatar } from "./components/ui/avatar";
import { Dialog } from "./components/ui/dialog";
import { cn } from "./lib/cn";
import { formatDataRelativa } from "./lib/format";
import {
  getNotificariVazute,
  getSidebarRestrans,
  getTaskStatusOverride,
  getTaskTermenOverride,
  getTaskuriGlobale,
  getTaskuriSterse,
  marcheazaNotificariVazute,
  setSidebarRestrans,
  useLocalStoreValue,
} from "./lib/local-store";
import { TASKURI, type Task } from "./mock";
import { idScurt } from "@/lib/id-scurt";
import { UtilizatorProvider } from "./lib/utilizator-context";
import { useExempleDemo } from "./lib/exemple-demo";
import { useSalut } from "@/lib/use-salut";
import { getOrgCustomization } from "@/lib/org-customizations";

const EMPTY_TASKURI_GLOBALE: Task[] = [];
const EMPTY_STATUS_MAP: Record<string, Task["status"]> = {};
const EMPTY_TERMEN_MAP: Record<string, string> = {};
const EMPTY_STERSE_MAP: Record<string, boolean> = {};
const EMPTY_VAZUTE_MAP: Record<string, boolean> = {};

// Etichetele vin din dicționarul RO/EN (vezi lib/i18n/dictionaries/dashboard.ts)
// — restul (href/icon) rămâne fix, doar textul se traduce.
function buildNav(dict: DashboardDict, orgSlug: string, role: string): { section: string; items: { href: string; label: string; hint?: string; icon: typeof Gauge }[] }[] {
  const baza = [
    { section: "", items: [{ href: "", label: dict.nav.home, hint: dict.hints.home, icon: Gauge }] },
    {
      section: dict.nav.sectionRelatii,
      items: [
        { href: "companii", label: dict.nav.companii, hint: dict.hints.companii, icon: Building2 },
        { href: "d177", label: dict.nav.companiiD177, hint: dict.hints.companiiD177, icon: Landmark },
        { href: "donatori", label: dict.nav.donatori, hint: dict.hints.donatori, icon: Users },
        ...(AVATAR_DONATOR_ACTIV ? [{ href: "avatar-donator", label: dict.nav.avatarDonator, hint: dict.hints.avatarDonator, icon: ScanFace }] : []),
        { href: "donatori/formular-230", label: dict.nav.formular230, hint: dict.hints.formular230, icon: FileSignature },
        { href: "voluntari", label: dict.nav.voluntariPanou, hint: dict.hints.voluntariPanou, icon: Link2 },
        { href: "/crm-voluntari", label: dict.nav.voluntari, hint: dict.hints.voluntari, icon: HandHeart },
        { href: "beneficiari", label: dict.nav.beneficiari, hint: dict.hints.beneficiari, icon: HeartHandshake },
      ],
    },
    {
      section: dict.nav.sectionFinanciar,
      items: [
        { href: "donatii", label: dict.nav.donatii, hint: dict.hints.donatii, icon: Sparkles },
        { href: "strangere-fonduri", label: dict.nav.strangereFonduri, hint: dict.hints.strangereFonduri, icon: HandCoins },
        { href: "fonduri-plati", label: dict.nav.fonduriPlati, hint: dict.hints.fonduriPlati, icon: Banknote },
        { href: "rfm", label: dict.nav.rfm, hint: dict.hints.rfm, icon: LayoutGrid },
        { href: "portal-beneficiari", label: dict.nav.portalBeneficiari, hint: dict.hints.portalBeneficiari, icon: HeartHandshake },
      ],
    },
    {
      section: dict.nav.sectionOperare,
      items: [
        { href: "comunicare", label: dict.nav.comunicare, hint: dict.hints.comunicare, icon: MessageSquare },
      ],
    },
    {
      section: dict.nav.sectionPerformanta,
      items: [
        { href: "performanta", label: dict.nav.performanta, hint: dict.hints.performanta, icon: Target },
        { href: "organizatie", label: dict.nav.organizatie, hint: dict.hints.organizatie, icon: Network },
        // Programul de lucru stă lângă Echipă și Organizare: e despre cine ce face și când.
        { href: "/program-lucru", label: dict.nav.programLucru, hint: dict.hints.programLucru, icon: CalendarClock },
      ],
    },
    {
      section: dict.nav.sectionPlatforma,
      items: [
        { href: "instrumente", label: dict.nav.instrumente, hint: dict.hints.instrumente, icon: Wrench },
        { href: "consultanta", label: dict.nav.consultanta, hint: dict.hints.consultanta, icon: GraduationCap },
        // Facturarea (plan, metodă de plată, facturi) o văd doar proprietarul și administratorii; stă chiar deasupra Setărilor.
        ...(role === "owner" || role === "admin" ? [{ href: "facturare", label: dict.nav.facturare, hint: dict.hints.facturare, icon: Receipt }] : []),
        { href: "setari", label: dict.nav.setari, hint: dict.hints.setari, icon: Settings },
      ],
    },
  ];
  // personalizări agreate cu ONG-ul respectiv (vezi lib/org-customizations.ts) — pentru
  // orice alt cont rămâne meniul standard, neschimbat
  const pers = getOrgCustomization(orgSlug);
  return baza.map((g) => ({
    ...g,
    items: [
      ...g.items
        .filter((i) => !pers.hiddenNav?.includes(i.href))
        .map((i) => (pers.navLabels?.[i.href] ? { ...i, label: pers.navLabels[i.href] } : i)),
    ],
  }));
}

export function CrmShell({
  orgSlug,
  orgName,
  orgLogoUrl,
  orgDomeniuActivitate,
  orgPackage,
  userName,
  role,
  locale,
  children,
}: {
  orgSlug: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgDomeniuActivitate: DomeniuActivitate | null;
  orgPackage: "trial" | "start" | "crestere" | "impact" | "custom";
  userName: string;
  role: string;
  locale: Locale;
  children: ReactNode;
}) {
  const collapsed = useLocalStoreValue(getSidebarRestrans, false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const pathname = usePathname();
  const base = `/${orgSlug}/crm`;
  const dict = DASHBOARD_DICT[locale];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const salut = useSalut(dict.greeting);

  // Bara laterală e lipită sus și are înălțimea părții VIZIBILE a ferestrei: cât antetul platformei încă se vede deasupra,
  // scade din înălțime, iar după ce a ieșit din ecran umple toată fereastra (fără gol sub planul și contul din josul barei).
  const radacina = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = radacina.current;
    if (!el) return;
    const calculeaza = () => {
      const sus = Math.max(0, el.getBoundingClientRect().top);
      el.style.setProperty("--ci-inaltime-bara", `${Math.round(window.innerHeight - sus)}px`);
    };
    calculeaza();
    window.addEventListener("scroll", calculeaza, { passive: true });
    window.addEventListener("resize", calculeaza);
    return () => {
      window.removeEventListener("scroll", calculeaza);
      window.removeEventListener("resize", calculeaza);
    };
  }, []);

  return (
    <div
      ref={radacina}
      className="ci-root flex min-h-[calc(100vh-73px)]"
      data-brand
      data-forma={orgDomeniuActivitate ?? undefined}
    >
      {mobileOpen && (
        <button
          aria-label="Închide meniul"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[var(--ci-text)]/30 md:hidden"
        />
      )}
      <aside
        style={mobileOpen ? { transform: "translateX(0)" } : undefined}
        className={cn(
          "ci-sidebar fixed inset-y-0 left-0 z-50 w-64 overflow-hidden border-r border-[var(--ci-border)] bg-[var(--ci-surface)] duration-200 md:sticky md:top-0 md:z-auto md:h-[var(--ci-inaltime-bara,calc(100vh-73px))] md:shrink-0 md:self-start md:transition-[width]",
          collapsed ? "md:w-16" : "md:w-52",
        )}
      >
        <div className="flex h-full flex-col py-3">
          <div className={cn("mb-3 flex items-center justify-between gap-2 px-3", collapsed && "md:justify-center md:px-0")}>
            <Link prefetch={false} href={base} onClick={() => setMobileOpen(false)} className="flex min-w-0 items-center gap-2">
              {orgLogoUrl && (
                <Image
                  src={orgLogoUrl}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="h-5 w-5 shrink-0 rounded object-contain"
                />
              )}
              <p className={cn("ci-display truncate text-[13px] font-semibold text-[var(--ci-text)]", collapsed && "md:hidden")}>
                {orgName}
              </p>
            </Link>
            <button
              aria-label="Închide meniul"
              onClick={() => setMobileOpen(false)}
              className="rounded-[var(--ci-radius-btn)] p-1.5 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="ci-scrollbar flex-1 space-y-3 overflow-y-auto px-2">
            <Suspense fallback={<NavGroups pathname={pathname} base={base} collapsed={collapsed} query="" dict={dict} role={role} onNavigate={() => setMobileOpen(false)} />}>
              <NavGroupsWithQuery pathname={pathname} base={base} collapsed={collapsed} dict={dict} role={role} onNavigate={() => setMobileOpen(false)} />
            </Suspense>
            {/* Imediat sub ultimul element din meniu; planul și utilizatorul stau fixate jos, în afara derulării meniului */}
            <div className="hidden border-t border-[var(--ci-border)] pt-2 md:block">
              <button
                onClick={() => setSidebarRestrans(!collapsed)}
                title={collapsed ? dict.sidebar.extinde : dict.sidebar.restrange}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--ci-radius-btn)] px-2.5 py-2 text-[13px] font-medium text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]",
                  collapsed ? "justify-center" : "justify-start",
                )}
              >
                {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
                {!collapsed && <span className="truncate">{dict.sidebar.restrange}</span>}
              </button>
            </div>
          </nav>
          <ContSiPlan orgSlug={orgSlug} userName={userName} role={role} orgPackage={orgPackage} collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 md:gap-3 md:px-4">
          <button
            aria-label="Deschide meniul"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)] md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ci-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            {dict.header.add}
          </button>
          <NotificationsButton base={base} orgSlug={orgSlug} />
          <a
            href="/contact"
            target="_blank"
            rel="noopener"
            aria-label="Ajutor"
            title="Ajutor — contactează echipa Alexandrit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
          >
            <HelpCircle className="h-4 w-4" />
          </a>
          <AvatarMenu userName={userName} orgSlug={orgSlug} role={role} />
        </header>

        {/* Nu <main>: layout-ul organizației (app/[orgSlug]/layout.tsx) are deja reperul „main"; două ar fi invalide. */}
        <div className="ci-scrollbar relative flex-1 overflow-y-auto px-6 py-6">
          <DomeniuProvider domeniu={orgDomeniuActivitate}>
            <UtilizatorProvider prenume={userName.includes("@") ? "" : userName.split(" ")[0]}>
              <LocaleProvider locale={locale}>{children}</LocaleProvider>
            </UtilizatorProvider>
          </DomeniuProvider>
        </div>
      </div>

      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} base={base} pathname={pathname} />
      <span className="sr-only" suppressHydrationWarning>
        {userName.includes("@") ? `${salut}.` : `${salut}, ${userName.split(" ")[0]}.`}
      </span>
    </div>
  );
}

// Citește query-ul curent — separat de NavGroups ca boundary-ul de Suspense
// cerut de useSearchParams() să nu blocheze randarea restului shell-ului.
function NavGroupsWithQuery(props: { pathname: string | null; base: string; collapsed: boolean; dict: DashboardDict; role: string; onNavigate: () => void }) {
  const searchParams = useSearchParams();
  return <NavGroups {...props} query={searchParams.toString()} />;
}

// Unele link-uri din meniu (ex. „Companii D177") duc la aceeași rută, doar cu
// alt query — activ trebuie decis pe pathname ȘI query, altfel fie niciun
// link cu query nu se aprinde vreodată, fie varianta „simplă" (fără query)
// rămâne aprinsă greșit c​ât timp ești pe orice variantă filtrată a aceleiași rute.
function NavGroups({
  pathname,
  base,
  collapsed,
  query,
  dict,
  role,
  onNavigate,
}: {
  pathname: string | null;
  base: string;
  collapsed: boolean;
  query: string;
  dict: DashboardDict;
  role: string;
  onNavigate: () => void;
}) {
  const nav = buildNav(dict, base.split("/")[1] ?? "", role);
  // Nav-ul e o listă plată, nu o ierarhie reală — dar unele rute (ex.
  // „Formularul 230" la donatori/formular-230) sunt sub-căi ale altui item
  // (donatori), și altele (ex. „Companii D177") au ACELAȘI path, doar alt
  // query. Fără asta, ambele s-ar aprinde deodată. Regula: câștigă mereu cel
  // mai specific (path mai lung) care se potrivește ȘI pe query — câștigătorul
  // se ține minte după item.href BRUT (unic per item), nu după path-ul deja
  // calculat (care poate fi identic între „Companii" și „Companii D177").
  // href care începe cu "/" e ABSOLUT față de organizație (ex. „/crm-voluntari"
  // stă la /[orgSlug]/crm-voluntari, în afara /crm) — celelalte sunt relative la /crm.
  const root = base.replace(/\/crm$/, "");
  const rezolva = (itemPath: string) => (itemPath.startsWith("/") ? `${root}${itemPath}` : itemPath ? `${base}/${itemPath}` : base);
  const toate = nav.flatMap((g) => g.items);
  let castigator: string | null = null;
  let castigatorLen = -1;
  for (const item of toate) {
    const [itemPath, itemQuery = ""] = item.href.split("?");
    const href = rezolva(itemPath);
    const potrivit = (pathname === href || (itemPath !== "" && pathname?.startsWith(href + "/"))) && itemQuery === query;
    if (potrivit && href.length > castigatorLen) {
      castigator = item.href;
      castigatorLen = href.length;
    }
  }

  return (
    <>
      {nav.map((group, gi) => (
        <div key={gi}>
          {group.section && (
            <p
              className={cn(
                "px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase",
                collapsed && "md:hidden",
              )}
            >
              {group.section}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const [itemPath, itemQuery = ""] = item.href.split("?");
              const href = rezolva(itemPath);
              const active = item.href === castigator;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={itemQuery ? `${href}?${itemQuery}` : href}
                  // Paginile sunt dinamice și nu au loading.tsx: prefetch-ul nu aducea nimic util, dar lansa ~16
                  // cereri (fiecare cu verificare de sesiune + tranzacție) la FIECARE pagină deschisă.
                  prefetch={false}
                  onClick={onNavigate}
                  title={collapsed ? `${item.label}${item.hint ? ` — ${item.hint}` : ""}` : item.hint}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--ci-radius-btn)] px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    collapsed && "md:justify-center md:px-0",
                    active
                      ? "bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
                      : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn("min-w-0 leading-tight break-words", collapsed && "md:hidden")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// Ce pagină ești pe ea decide ce opțiuni de adăugare are sens să vezi —
// pe Companii n-are rost să-ți arăt și „Donator"/„Proiect"/„Task". Pe pagini
// fără o legătură clară (Acasă, Rapoarte, Setări etc.) rămân toate, ca „+
// Adaugă" să nu devină un buton mort acolo.
type AddContext = "donatori" | "companii" | "beneficiari" | "taskuri" | "performanta" | "organizatie" | "fonduri" | "voluntari" | null;

function contextDinPathname(pathname: string | null, base: string): AddContext {
  if (!pathname) return null;
  if (pathname.startsWith(`${base}/donatori`)) return "donatori";
  if (pathname.startsWith(`${base}/companii`)) return "companii";
  if (pathname.startsWith(`${base}/beneficiari`)) return "beneficiari";
  if (pathname.startsWith(`${base}/taskuri`)) return "taskuri";
  if (pathname.startsWith(`${base}/performanta`)) return "performanta";
  if (pathname.startsWith(`${base}/organizatie`)) return "organizatie";
  // Pagina „Voluntari” (și „Link și campanii”), plus CRM Voluntari, care stă lângă /crm: aici se adaugă sarcini online sau activități pe teren.
  if (pathname.startsWith(`${base}/voluntari`) || pathname.startsWith(`${base}-voluntari`)) return "voluntari";
  // Donații, pagini de strângere de fonduri și alocări/plăți: aici se adaugă o pagină de campanie sau un proiect.
  if (pathname.startsWith(`${base}/donatii`) || pathname.startsWith(`${base}/strangere-fonduri`) || pathname.startsWith(`${base}/fonduri-plati`)) return "fonduri";
  return null;
}

// Formularele din dialogul „Adaugă" se încarcă abia când e apăsat un buton, nu pe fiecare pagină din CRM.
const AddDonorDialog = dynamic(() => import("./components/add-donor-dialog").then((m) => m.AddDonorDialog), { ssr: false });
const AddProjectDialog = dynamic(() => import("./components/add-project-dialog").then((m) => m.AddProjectDialog), { ssr: false });
const ImportDialog = dynamic(() => import("./components/import-dialog").then((m) => m.ImportDialog), { ssr: false });
const AddCompanyFormDialog = dynamic(() => import("./companii/add-company-form-dialog").then((m) => m.AddCompanyFormDialog), { ssr: false });

function AddDialog({
  open,
  onClose,
  base,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  pathname: string | null;
}) {
  const router = useRouter();
  const [importTip, setImportTip] = useState<"donatori" | "companii" | null>(null);
  const [donorOpen, setDonorOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  // Dacă meniul e deschis dintr-o listă filtrată după marcaj (ex. companii?marcaj=d177), firma nouă primește marcajul
  // și rămâi pe listă.
  const [companyMarcaje, setCompanyMarcaje] = useState<string[]>([]);

  const context = contextDinPathname(pathname, base);
  const pentru = (c: AddContext) => context === null || context === c;

  // Pe paginile Echipă & Performanță se adaugă lucruri din acest modul; formularul se deschide la destinație, prin ?nou=….
  // În exemplul demonstrativ rămân pe paginile demo (nu se salvează nimic). Pe Organizație & Echipă se adaugă departamente, roluri și oameni.
  const demoPerf = pathname?.startsWith(`${base}/performanta/demo`) ?? false;
  const perf = demoPerf ? `${base}/performanta/demo` : `${base}/performanta`;
  const OPTIUNI = [
    { context: "performanta" as const, label: "Obiectiv", icon: Target, action: () => router.push(`${perf}/obiective?nou=obiectiv`) },
    { context: "performanta" as const, label: "Activitate", icon: ClipboardList, action: () => router.push(`${perf}/saptamana?nou=activitate`) },
    { context: "performanta" as const, label: "Discuție sau evaluare", icon: MessageSquare, action: () => router.push(`${perf}/discutii`) },
    { context: "organizatie" as const, label: "Departament", icon: Network, action: () => router.push(`${base}/organizatie?nou=departament`) },
    { context: "organizatie" as const, label: "Rol", icon: ClipboardList, action: () => router.push(`${base}/organizatie?nou=rol`) },
    { context: "organizatie" as const, label: "Membru în echipă", icon: UserPlus, action: () => router.push(`${base}/organizatie?nou=membru`) },
    { context: "voluntari" as const, label: "Sarcină online pentru voluntari", icon: Laptop, action: () => router.push(`${base}/voluntari?nou=sarcina`) },
    { context: "voluntari" as const, label: "Activitate pe teren", icon: MapPin, action: () => router.push(`${base}/voluntari?nou=activitate`) },
    { context: "fonduri" as const, label: "Pagină de strângere de fonduri (campanie)", icon: HandCoins, action: () => router.push(`${base}/strangere-fonduri?nou=pagina`) },
    { context: "fonduri" as const, label: "Proiect (beneficiar al fondurilor)", icon: HeartHandshake, action: () => setProjectOpen(true) },
    { context: "donatori" as const, label: "Donator (persoană fizică)", icon: Users, action: () => setDonorOpen(true) },
    { context: "beneficiari" as const, label: "Proiect", icon: HeartHandshake, action: () => setProjectOpen(true) },
    // Companie — server action REALĂ (adaugaFirma), nu mock; vezi
    // companii/add-company-form-dialog.tsx.
    { context: "companii" as const, label: "Companie", icon: Building2, action: () => {
        const m = new URLSearchParams(window.location.search).getAll("marcaj").filter((x) => x === "d177" || x === "decembrie" || x === "caz");
        setCompanyMarcaje(m);
        setCompanyOpen(true);
      },
    },
    // „Task” din această pagină ducea la ea însăși; activitățile reale (salvate pe server, cu responsabil și termen) se adaugă din Echipă & Performanță.
    { context: "taskuri" as const, label: "Activitate (salvată pe server)", icon: ClipboardList, action: () => router.push(`${base}/performanta/saptamana?nou=activitate`) },
    { context: "donatori" as const, label: "Importă persoane fizice (CSV, Excel, JSON)", icon: Upload, action: () => setImportTip("donatori") },
    { context: "companii" as const, label: "Importă persoane juridice / companii (CSV, Excel, JSON)", icon: Upload, action: () => setImportTip("companii") },
  ].filter((o) => pentru(o.context));

  return (
    <>
      <Dialog open={open} onClose={onClose} title={context === "performanta" ? "Ce vrei să adaugi în echipă?" : context === "organizatie" ? "Ce vrei să adaugi în organizație?" : context === "fonduri" ? "Ce vrei să adaugi la strângerea de fonduri?" : context === "voluntari" ? "Ce vrei să adaugi pentru voluntari?" : "Ce vrei să adaugi?"}>
        <div className="space-y-1.5">
          {OPTIUNI.map((o) => (
            <button
              key={o.label}
              onClick={() => {
                onClose();
                o.action();
              }}
              className="flex w-full items-center gap-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 py-2.5 text-left text-sm font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
            >
              <o.icon className="h-4 w-4 text-[var(--ci-text-muted)]" />
              {o.label}
            </button>
          ))}
        </div>
      </Dialog>
      {importTip && <ImportDialog open={!!importTip} onClose={() => setImportTip(null)} tip={importTip} />}
      {donorOpen && (
        <AddDonorDialog
          open={donorOpen}
          onClose={() => setDonorOpen(false)}
          onCreated={(id) => router.push(id ? `${base}/donatori/reali/${id}` : `${base}/donatori`)}
        />
      )}
      {projectOpen && (
        <AddProjectDialog
          open={projectOpen}
          onClose={() => setProjectOpen(false)}
          onCreated={(b) => router.push(`${base}/beneficiari/${b.id}`)}
        />
      )}
      {companyOpen && (
        <AddCompanyFormDialog
          open={companyOpen}
          onClose={() => setCompanyOpen(false)}
          marcaje={companyMarcaje}
          onCreated={(id) => {
            setCompanyOpen(false);
            if (companyMarcaje.length > 0) router.refresh();
            else router.push(`${base}/companii/${idScurt(id)}`);
          }}
        />
      )}
    </>
  );
}

// Jos, în bara laterală: planul activ și cine e autentificat, cu deconectare dintr-un clic.
const ETICHETA_PLAN: Record<string, string> = { trial: "PROBĂ", start: "START", crestere: "CREȘTERE", impact: "IMPACT", custom: "PERSONALIZAT" };
const ETICHETA_ROL: Record<string, string> = { owner: "Proprietar", admin: "Administrator", member: "Membru" };

function ContSiPlan({ orgSlug, userName, role, orgPackage, collapsed }: { orgSlug: string; userName: string; role: string; orgPackage: string; collapsed: boolean }) {
  const admin = role === "owner" || role === "admin";
  const proba = orgPackage === "trial";
  const insigna = (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide", proba ? "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]" : "bg-[var(--ci-primary)] text-white")}>
      {ETICHETA_PLAN[orgPackage] ?? orgPackage.toUpperCase()}
    </span>
  );
  return (
    <div className={cn("border-t border-[var(--ci-border)] px-3 pt-3", collapsed && "md:px-1.5")}>
      <div className={cn("flex items-center justify-between gap-2", collapsed && "md:hidden")}>
        <span className="text-[10.5px] font-bold tracking-wider text-[var(--ci-text-muted)] uppercase">Plan activ</span>
        {admin ? (
          <Link prefetch={false} href={`/${orgSlug}/crm/facturare`} title="Facturare și abonament" className="rounded-full focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            {insigna}
          </Link>
        ) : (
          insigna
        )}
      </div>
      <div className={cn("mt-2.5 flex items-center gap-2", collapsed && "md:mt-0 md:flex-col")}>
        <Avatar name={userName} size="sm" />
        <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
          <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]" title={userName}>
            {userName}
          </p>
          <p className="truncate text-[11.5px] text-[var(--ci-text-muted)]">{ETICHETA_ROL[role] ?? role}</p>
        </div>
        <LogoutForm className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-red)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          <LogOut className="h-4 w-4" aria-label="Deconectare" />
        </LogoutForm>
      </div>
    </div>
  );
}

// Antetul CRM (spre deosebire de bara de sus a platformei, din layout.tsx)
// nu avea nicio cale spre Deconectare — omul trebuia să știe să caute mai sus,
// într-un link mic de text. Avatarul devine acum un meniu, ca-n orice SaaS.
function AvatarMenu({ userName, orgSlug, role }: { userName: string; orgSlug: string; role: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-avatar-menu]")) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className="relative" data-avatar-menu>
      <button aria-label="Cont" onClick={() => setOpen((v) => !v)} className="rounded-full">
        <Avatar name={userName} size="sm" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1.5 w-56 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1.5 shadow-[var(--ci-shadow-md)]">
          <p className="truncate px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--ci-text)]">{userName}</p>
          {(role === "owner" || role === "admin") && (
            <Link prefetch={false}
              href={`/${orgSlug}/echipa`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
            >
              <Users className="h-3.5 w-3.5 text-[var(--ci-text-muted)]" /> Echipă
            </Link>
          )}
          {(role === "owner" || role === "admin") && (
            <Link prefetch={false}
              href={`/${orgSlug}/crm/facturare`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
            >
              <Receipt className="h-3.5 w-3.5 text-[var(--ci-text-muted)]" /> Facturare
            </Link>
          )}
          <Link prefetch={false}
            href={`/${orgSlug}/crm/setari`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
          >
            <Settings className="h-3.5 w-3.5 text-[var(--ci-text-muted)]" /> Setări
          </Link>
          <div className="my-1 border-t border-[var(--ci-border)]" />
          <LogoutForm className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-[var(--ci-red)] hover:bg-[var(--ci-surface-2)]">
            <LogOut className="h-3.5 w-3.5" /> Deconectare
          </LogoutForm>
        </div>
      )}
    </div>
  );
}

function NotificationsButton({ base, orgSlug }: { base: string; orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const exemple = useExempleDemo(orgSlug);

  const globale = useLocalStoreValue(getTaskuriGlobale, EMPTY_TASKURI_GLOBALE);
  const statusOverride = useLocalStoreValue(getTaskStatusOverride, EMPTY_STATUS_MAP);
  const termenOverride = useLocalStoreValue(getTaskTermenOverride, EMPTY_TERMEN_MAP);
  const sterse = useLocalStoreValue(getTaskuriSterse, EMPTY_STERSE_MAP);
  const vazute = useLocalStoreValue(getNotificariVazute, EMPTY_VAZUTE_MAP);

  const intarziate = useMemo(() => {
    // Taskurile demonstrative intră în clopoțel doar când utilizatorul a cerut exemplele; altfel un cont nou ar vedea alerte inventate.
    const mock = exemple
      ? TASKURI.filter((t) => !sterse[t.id]).map((t) => ({
          ...t,
          status: statusOverride[t.id] ?? t.status,
          termenLa: termenOverride[t.id] ?? t.termenLa,
        }))
      : [];
    return [...globale, ...mock].filter((t) => t.status === "intarziat");
  }, [globale, statusOverride, termenOverride, sterse, exemple]);
  const neVazute = intarziate.filter((t) => !vazute[t.id]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-notificari]")) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className="relative" data-notificari>
      <button
        aria-label={neVazute.length > 0 ? `Notificări: ${neVazute.length} noi` : "Notificări"}
        onClick={() => {
          setOpen((v) => !v);
          if (intarziate.length) marcheazaNotificariVazute(intarziate.map((t) => t.id));
        }}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-[var(--ci-radius-btn)] transition-colors",
          neVazute.length > 0
            ? "bg-[var(--ci-red)] text-white hover:opacity-90"
            : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]",
        )}
      >
        <Bell className="h-4 w-4" />
        {neVazute.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--ci-red)] ring-1 ring-[var(--ci-red)]"
          >
            {neVazute.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1.5 w-80 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 shadow-[var(--ci-shadow-md)]">
          <p className="px-2 py-1.5 text-[12px] font-semibold text-[var(--ci-text)]">
            {intarziate.length > 0 ? `${intarziate.length} task-uri întârziate` : "Nicio notificare"}
          </p>
          {intarziate.length > 0 ? (
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {intarziate.slice(0, 8).map((t) => (
                <Link prefetch={false}
                  key={t.id}
                  href={`${base}/${t.legatDe.tip === "companie" ? "companii" : "donatori"}/${t.legatDe.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-[var(--ci-radius-btn)] px-2 py-1.5 hover:bg-[var(--ci-surface-2)]"
                >
                  <p className="truncate text-[12.5px] font-medium text-[var(--ci-text)]">{t.titlu}</p>
                  <p className="truncate text-[11px] text-[var(--ci-text-muted)]">
                    {t.legatDe.nume} · termen {formatDataRelativa(t.termenLa)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-2 py-2 text-[12px] text-[var(--ci-text-faint)]">Ești la zi cu task-urile.</p>
          )}
          <p className="px-2 pb-1 text-[11px] text-[var(--ci-text-faint)]">Taskurile din această listă sunt exemple demonstrative, păstrate doar în acest browser.</p>
          <Link prefetch={false}
            href={`${base}/taskuri`}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-[var(--ci-radius-btn)] px-2 py-1.5 text-center text-[12px] font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
          >
            Vezi toate task-urile
          </Link>
        </div>
      )}
    </div>
  );
}

