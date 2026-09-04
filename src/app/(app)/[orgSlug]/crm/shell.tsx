"use client";

import {
  Banknote,
  Bell,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Command,
  FileSignature,
  FileText,
  Gauge,
  HandCoins,
  HeartHandshake,
  HelpCircle,
  Landmark,
  LayoutGrid,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  Users,
  Wrench,
  Workflow,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { DASHBOARD_DICT, type DashboardDict } from "@/lib/i18n/dictionaries/dashboard";
import type { Locale } from "@/lib/i18n/config";

import { AddDonorDialog } from "./components/add-donor-dialog";
import { LocaleProvider } from "./lib/locale-context";
import { AddProjectDialog } from "./components/add-project-dialog";
import { Avatar } from "./components/ui/avatar";
import { Dialog } from "./components/ui/dialog";
import { ImportDialog } from "./components/import-dialog";
import { AddCompanyFormDialog } from "./companii/add-company-form-dialog";
import { cn } from "./lib/cn";
import { formatDataRelativa } from "./lib/format";
import {
  getNotificariVazute,
  getTaskStatusOverride,
  getTaskTermenOverride,
  getTaskuriGlobale,
  getTaskuriSterse,
  marcheazaNotificariVazute,
  useLocalStoreValue,
} from "./lib/local-store";
import { useDonatori } from "./lib/use-data";
import { TASKURI, type Task } from "./mock";

const EMPTY_TASKURI_GLOBALE: Task[] = [];
const EMPTY_STATUS_MAP: Record<string, Task["status"]> = {};
const EMPTY_TERMEN_MAP: Record<string, string> = {};
const EMPTY_STERSE_MAP: Record<string, boolean> = {};
const EMPTY_VAZUTE_MAP: Record<string, boolean> = {};

// Etichetele vin din dicționarul RO/EN (vezi lib/i18n/dictionaries/dashboard.ts)
// — restul (href/icon) rămâne fix, doar textul se traduce.
function buildNav(dict: DashboardDict): { section: string; items: { href: string; label: string; icon: typeof Gauge }[] }[] {
  return [
    { section: "", items: [{ href: "", label: dict.nav.home, icon: Gauge }] },
    {
      section: dict.nav.sectionRelatii,
      items: [
        { href: "donatori", label: dict.nav.donatori, icon: Users },
        { href: "donatori/formular-230", label: dict.nav.formular230, icon: FileSignature },
        { href: "companii", label: dict.nav.companii, icon: Building2 },
        { href: "companii?marcaj=d177", label: dict.nav.companiiD177, icon: Landmark },
        { href: "beneficiari", label: dict.nav.beneficiari, icon: HeartHandshake },
      ],
    },
    {
      section: dict.nav.sectionFinanciar,
      items: [
        { href: "donatii", label: dict.nav.donatii, icon: Sparkles },
        { href: "strangere-fonduri", label: dict.nav.strangereFonduri, icon: HandCoins },
        { href: "fonduri-plati", label: dict.nav.fonduriPlati, icon: Banknote },
        { href: "rfm", label: dict.nav.rfm, icon: LayoutGrid },
      ],
    },
    {
      section: dict.nav.sectionOperare,
      items: [
        { href: "comunicare", label: dict.nav.comunicare, icon: MessageSquare },
        { href: "automatizari", label: dict.nav.automatizari, icon: Workflow },
        { href: "taskuri", label: dict.nav.taskuri, icon: ClipboardList },
        { href: "documente", label: dict.nav.documente, icon: FileText },
        { href: "rapoarte", label: dict.nav.rapoarte, icon: FileText },
        { href: "instrumente", label: dict.nav.instrumente, icon: Wrench },
      ],
    },
    { section: "", items: [{ href: "setari", label: dict.nav.setari, icon: Settings }] },
  ];
}

export function CrmShell({
  orgSlug,
  orgName,
  orgLogoUrl,
  orgBrandColor,
  userName,
  locale,
  children,
}: {
  orgSlug: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgBrandColor: string | null;
  userName: string;
  locale: Locale;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const base = `/${orgSlug}/crm`;
  const dict = DASHBOARD_DICT[locale];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const hour = new Date().getHours();
  const salut = hour < 12 ? dict.greeting.morning : hour < 18 ? dict.greeting.afternoon : dict.greeting.evening;

  return (
    <div
      className="ci-root flex min-h-[calc(100vh-73px)]"
      data-brand
      style={orgBrandColor ? ({ "--ci-brand-override": orgBrandColor } as CSSProperties) : undefined}
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
          "ci-sidebar fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--ci-border)] bg-[var(--ci-surface)] duration-200 md:static md:z-auto md:shrink-0 md:transition-[width]",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        <div className="flex h-full flex-col py-4">
          <div className={cn("mb-4 flex items-center justify-between gap-2 px-3", collapsed && "md:justify-center md:px-0")}>
            <div className="flex min-w-0 items-center gap-2">
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
            </div>
            <button
              aria-label="Închide meniul"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="ci-scrollbar flex-1 space-y-4 overflow-y-auto px-2">
            <Suspense fallback={<NavGroups pathname={pathname} base={base} collapsed={collapsed} query="" dict={dict} onNavigate={() => setMobileOpen(false)} />}>
              <NavGroupsWithQuery pathname={pathname} base={base} collapsed={collapsed} dict={dict} onNavigate={() => setMobileOpen(false)} />
            </Suspense>
          </nav>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="mx-2 mt-2 hidden items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)] md:flex"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 md:gap-3 md:px-4">
          <button
            aria-label="Deschide meniul"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)] md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          {/* Căutarea de mai jos e doar pe persoane fizice (mock) — pe Companii,
              unde există deja o căutare reală, server-side, în FilterBar, n-o
              mai afișăm (era redundantă și confuza cu cea reală). */}
          {!pathname.startsWith(`${base}/companii`) && (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center gap-2 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 text-[13px] text-[var(--ci-text-faint)] transition-colors hover:border-[var(--ci-border-strong)] sm:w-auto md:w-72"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 text-left sm:inline">{dict.header.searchPersoane}</span>
              <span className="hidden items-center gap-0.5 rounded border border-[var(--ci-border)] px-1 text-[10px] md:flex">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--ci-primary)] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ci-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            {dict.header.add}
          </button>
          <NotificationsButton base={base} />
          <button
            aria-label="Ajutor"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <Avatar name={userName} size="sm" />
        </header>

        <main className="ci-scrollbar flex-1 overflow-y-auto px-6 py-6">
          <LocaleProvider locale={locale}>{children}</LocaleProvider>
        </main>
      </div>

      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} base={base} pathname={pathname} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} base={base} />
      <span className="sr-only" suppressHydrationWarning>
        {salut}, {userName.split(" ")[0]}.
      </span>
    </div>
  );
}

// Citește query-ul curent — separat de NavGroups ca boundary-ul de Suspense
// cerut de useSearchParams() să nu blocheze randarea restului shell-ului.
function NavGroupsWithQuery(props: { pathname: string | null; base: string; collapsed: boolean; dict: DashboardDict; onNavigate: () => void }) {
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
  onNavigate,
}: {
  pathname: string | null;
  base: string;
  collapsed: boolean;
  query: string;
  dict: DashboardDict;
  onNavigate: () => void;
}) {
  const nav = buildNav(dict);
  // Nav-ul e o listă plată, nu o ierarhie reală — dar unele rute (ex.
  // „Formularul 230" la donatori/formular-230) sunt sub-căi ale altui item
  // (donatori), și altele (ex. „Companii D177") au ACELAȘI path, doar alt
  // query. Fără asta, ambele s-ar aprinde deodată. Regula: câștigă mereu cel
  // mai specific (path mai lung) care se potrivește ȘI pe query — câștigătorul
  // se ține minte după item.href BRUT (unic per item), nu după path-ul deja
  // calculat (care poate fi identic între „Companii" și „Companii D177").
  const toate = nav.flatMap((g) => g.items);
  let castigator: string | null = null;
  let castigatorLen = -1;
  for (const item of toate) {
    const [itemPath, itemQuery = ""] = item.href.split("?");
    const href = itemPath ? `${base}/${itemPath}` : base;
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
                "px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase",
                collapsed && "md:hidden",
              )}
            >
              {group.section}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const [itemPath, itemQuery = ""] = item.href.split("?");
              const href = itemPath ? `${base}/${itemPath}` : base;
              const active = item.href === castigator;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={itemQuery ? `${href}?${itemQuery}` : href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                    collapsed && "md:justify-center md:px-0",
                    active
                      ? "bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
                      : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
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
type AddContext = "donatori" | "companii" | "beneficiari" | "taskuri" | null;

function contextDinPathname(pathname: string | null, base: string): AddContext {
  if (!pathname) return null;
  if (pathname.startsWith(`${base}/donatori`)) return "donatori";
  if (pathname.startsWith(`${base}/companii`)) return "companii";
  if (pathname.startsWith(`${base}/beneficiari`)) return "beneficiari";
  if (pathname.startsWith(`${base}/taskuri`)) return "taskuri";
  return null;
}

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

  const context = contextDinPathname(pathname, base);
  const pentru = (c: AddContext) => context === null || context === c;

  const OPTIUNI = [
    { context: "donatori" as const, label: "Donator (persoană fizică)", icon: Users, action: () => setDonorOpen(true) },
    { context: "beneficiari" as const, label: "Proiect", icon: HeartHandshake, action: () => setProjectOpen(true) },
    // Companie — server action REALĂ (adaugaFirma), nu mock; vezi
    // companii/add-company-form-dialog.tsx.
    { context: "companii" as const, label: "Companie", icon: Building2, action: () => setCompanyOpen(true) },
    { context: "taskuri" as const, label: "Task", icon: ClipboardList, action: () => router.push(`${base}/taskuri`) },
    { context: "donatori" as const, label: "Importă persoane fizice (CSV, Excel, JSON)", icon: Upload, action: () => setImportTip("donatori") },
    { context: "companii" as const, label: "Importă persoane juridice / companii (CSV, Excel, JSON)", icon: Upload, action: () => setImportTip("companii") },
  ].filter((o) => pentru(o.context));

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Ce vrei să adaugi?">
        <div className="space-y-1.5">
          {OPTIUNI.map((o) => (
            <button
              key={o.label}
              onClick={() => {
                onClose();
                o.action();
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5 text-left text-sm font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
            >
              <o.icon className="h-4 w-4 text-[var(--ci-text-muted)]" />
              {o.label}
            </button>
          ))}
        </div>
      </Dialog>
      {importTip && <ImportDialog open={!!importTip} onClose={() => setImportTip(null)} tip={importTip} />}
      <AddDonorDialog
        open={donorOpen}
        onClose={() => setDonorOpen(false)}
        onCreated={(d) => router.push(`${base}/donatori/${d.id}`)}
      />
      <AddProjectDialog
        open={projectOpen}
        onClose={() => setProjectOpen(false)}
        onCreated={(b) => router.push(`${base}/beneficiari/${b.id}`)}
      />
      <AddCompanyFormDialog
        open={companyOpen}
        onClose={() => setCompanyOpen(false)}
        onCreated={(id) => {
          setCompanyOpen(false);
          router.push(`${base}/companii/${id}`);
        }}
      />
    </>
  );
}

function NotificationsButton({ base }: { base: string }) {
  const [open, setOpen] = useState(false);

  const globale = useLocalStoreValue(getTaskuriGlobale, EMPTY_TASKURI_GLOBALE);
  const statusOverride = useLocalStoreValue(getTaskStatusOverride, EMPTY_STATUS_MAP);
  const termenOverride = useLocalStoreValue(getTaskTermenOverride, EMPTY_TERMEN_MAP);
  const sterse = useLocalStoreValue(getTaskuriSterse, EMPTY_STERSE_MAP);
  const vazute = useLocalStoreValue(getNotificariVazute, EMPTY_VAZUTE_MAP);

  const intarziate = useMemo(() => {
    const mock = TASKURI.filter((t) => !sterse[t.id]).map((t) => ({
      ...t,
      status: statusOverride[t.id] ?? t.status,
      termenLa: termenOverride[t.id] ?? t.termenLa,
    }));
    return [...globale, ...mock].filter((t) => t.status === "intarziat");
  }, [globale, statusOverride, termenOverride, sterse]);
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
        aria-label="Notificări"
        onClick={() => {
          setOpen((v) => !v);
          if (intarziate.length) marcheazaNotificariVazute(intarziate.map((t) => t.id));
        }}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          neVazute.length > 0
            ? "bg-[var(--ci-red)] text-white hover:opacity-90"
            : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]",
        )}
      >
        <Bell className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1.5 w-80 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 shadow-[var(--ci-shadow-md)]">
          <p className="px-2 py-1.5 text-[12px] font-semibold text-[var(--ci-text)]">
            {intarziate.length > 0 ? `${intarziate.length} task-uri întârziate` : "Nicio notificare"}
          </p>
          {intarziate.length > 0 ? (
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {intarziate.slice(0, 8).map((t) => (
                <Link
                  key={t.id}
                  href={`${base}/${t.legatDe.tip === "companie" ? "companii" : "donatori"}/${t.legatDe.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-1.5 hover:bg-[var(--ci-surface-2)]"
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
          <Link
            href={`${base}/taskuri`}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg px-2 py-1.5 text-center text-[12px] font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
          >
            Vezi toate task-urile
          </Link>
        </div>
      )}
    </div>
  );
}

function SearchDialog({ open, onClose, base }: { open: boolean; onClose: () => void; base: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const DONATORI = useDonatori();

  // Doar donatori (persoane fizice) — modulul Companii e conectat la date
  // reale (potențial multe firme), nu la array-ul mock; căutarea de firme
  // reale se face direct în /crm/companii (are propriul câmp de căutare,
  // server-side), deci nu amestecăm cele două aici.
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    return DONATORI.filter((x) => x.nume.toLowerCase().includes(needle))
      .map((x) => ({ label: x.nume, sub: "Donator", href: `${base}/donatori/${x.id}` }))
      .slice(0, 8);
  }, [q, base, DONATORI]);

  return (
    <Dialog open={open} onClose={onClose} title="Căutare persoane fizice">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nume donator…"
        className="h-10 w-full rounded-lg border border-[var(--ci-border)] px-3 text-sm focus:border-[var(--ci-blue)] focus:outline-none"
      />
      <div className="mt-3 space-y-1">
        {results.length === 0 && q.trim() && (
          <p className="px-1 py-2 text-[13px] text-[var(--ci-text-muted)]">Niciun rezultat pentru „{q}”.</p>
        )}
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => {
              onClose();
              setQ("");
              router.push(r.href);
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--ci-surface-2)]"
          >
            <span className="font-medium text-[var(--ci-text)]">{r.label}</span>
            <span className="text-[12px] text-[var(--ci-text-muted)]">{r.sub}</span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
