"use client";

import { Building2, CalendarRange, FileText, ChevronDown, Copy, GitBranch, LayoutGrid, Pencil, Plus, Power, Sparkles, Trash2, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { DropdownMenu, DropdownItem } from "../components/ui/dropdown-menu";
import { EmptyState } from "../components/ui/states";
import { KpiBuilderWizard } from "./kpi-builder-wizard";
import {
  comutaActivDefinitieAction,
  duplicaDefinitieAction,
  listeazaCategoriiAction,
  listeazaDefinitiiAction,
  seedeazaCategoriiDefaultAction,
  stergeDefinitieAction,
  type CategorieRand,
  type DefinitieRand,
} from "./library-actions";

const TIP_LABEL: Record<DefinitieRand["tip"], string> = {
  numeric: "Numeric",
  percentage: "Procent",
  currency: "Monetar",
  boolean: "Da/Nu",
  rating: "Scor",
  duration: "Durată",
  ratio: "Raport",
  milestone: "Etapă",
  custom: "Personalizat",
};
const FRECV_LABEL: Record<DefinitieRand["frecventa"], string> = {
  zilnic: "Zilnic",
  saptamanal: "Săptămânal",
  lunar: "Lunar",
  trimestrial: "Trimestrial",
  anual: "Anual",
  custom: "Interval personalizat",
};

export function KpiLibraryClient({
  orgSlug,
  initialCategorii,
  initialDefinitii,
  esteAdmin,
}: {
  orgSlug: string;
  initialCategorii: CategorieRand[];
  initialDefinitii: DefinitieRand[];
  esteAdmin: boolean;
}) {
  const router = useRouter();
  const [categorii, setCategorii] = useState(initialCategorii);
  const [definitii, setDefinitii] = useState(initialDefinitii);
  const [filtruCategorie, setFiltruCategorie] = useState<string | "toate">("toate");
  const [wizardDeschis, setWizardDeschis] = useState(false);
  const [editDefinitie, setEditDefinitie] = useState<DefinitieRand | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reincarca = async () => {
    const [c, d] = await Promise.all([listeazaCategoriiAction(orgSlug), listeazaDefinitiiAction(orgSlug)]);
    setCategorii(c);
    setDefinitii(d);
  };

  const onSeedeazaCategorii = () => {
    start(async () => {
      try {
        setCategorii(await seedeazaCategoriiDefaultAction(orgSlug));
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onDuplica = (id: string) => {
    start(async () => {
      try {
        await duplicaDefinitieAction(orgSlug, id);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onComutaActiv = (id: string, activ: boolean) => {
    start(async () => {
      try {
        await comutaActivDefinitieAction(orgSlug, id, activ);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSterge = (id: string) => {
    if (!window.confirm("Ștergi definitiv acest KPI? Toate atribuirile și tot istoricul lui, pentru toți angajații, se șterg odată cu el.")) return;
    start(async () => {
      try {
        await stergeDefinitieAction(orgSlug, id);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const definitiiFiltrate = useMemo(
    () => (filtruCategorie === "toate" ? definitii : definitii.filter((d) => d.categorieId === filtruCategorie)),
    [definitii, filtruCategorie],
  );
  const numeCategorie = (id: string | null) => categorii.find((c) => c.id === id)?.nume ?? null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">KPI Library</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Biblioteca de indicatori de performanță a organizației tale — creează, editează, activează/dezactivează.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu trigger={<Button variant="secondary">Dashboard-uri <ChevronDown className="h-3.5 w-3.5" /></Button>}>
            {(close) => (
              <>
                <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/dashboard`); }}>
                  <TrendingUp className="h-3.5 w-3.5" /> Performanța mea
                </DropdownItem>
                <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/atribuiri`); }}>
                  <Users className="h-3.5 w-3.5" /> Atribuiri
                </DropdownItem>
                <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/echipa`); }}>
                  <Users className="h-3.5 w-3.5" /> Echipa mea
                </DropdownItem>
                <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/departament`); }}>
                  <Building2 className="h-3.5 w-3.5" /> Departament
                </DropdownItem>
                <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/rapoarte`); }}>
                  <FileText className="h-3.5 w-3.5" /> Rapoarte
                </DropdownItem>
                {esteAdmin && (
                  <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/organizatie-dashboard`); }}>
                    <LayoutGrid className="h-3.5 w-3.5" /> Organizație
                  </DropdownItem>
                )}
              </>
            )}
          </DropdownMenu>
          {esteAdmin && (
            <DropdownMenu trigger={<Button variant="secondary">Configurare <ChevronDown className="h-3.5 w-3.5" /></Button>}>
              {(close) => (
                <>
                  <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/sezoniere`); }}>
                    <CalendarRange className="h-3.5 w-3.5" /> Profiluri sezoniere
                  </DropdownItem>
                  <DropdownItem onClick={() => { close(); router.push(`/${orgSlug}/crm/kpi/funnel`); }}>
                    <GitBranch className="h-3.5 w-3.5" /> Funnel-uri
                  </DropdownItem>
                </>
              )}
            </DropdownMenu>
          )}
          {esteAdmin && (
            <Button
              onClick={() => {
                setEditDefinitie(null);
                setWizardDeschis(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> KPI nou
            </Button>
          )}
        </div>
      </div>

      {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      {categorii.length === 0 ? (
        esteAdmin && (
          <EmptyState
            title="Nicio categorie încă"
            description="Pornește cu 14 categorii sugerate (editabile/ștergeabile oricând) sau creează-le pe ale tale direct la pasul 2 din KPI Builder."
            action={<Button variant="secondary" size="sm" onClick={onSeedeazaCategorii} disabled={pending}>Adaugă categoriile sugerate</Button>}
          />
        )
      ) : (
        <div className="ci-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltruCategorie("toate")}
            className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${filtruCategorie === "toate" ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}
          >
            Toate ({definitii.length})
          </button>
          {categorii.map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltruCategorie(c.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${filtruCategorie === c.id ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}
            >
              {c.nume} ({definitii.filter((d) => d.categorieId === c.id).length})
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="KPI-uri" subtitle={`${definitiiFiltrate.length} în bibliotecă`} />
        {definitiiFiltrate.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nu ai încă niciun KPI în bibliotecă"
            description="Creează primul KPI — nume, categorie, tip, sursă de date, frecvență."
            action={esteAdmin && <Button size="sm" onClick={() => setWizardDeschis(true)}>Configurează KPI</Button>}
          />
        ) : (
          <div className="space-y-2">
            {definitiiFiltrate.map((d) => (
              <div key={d.id} className={`flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5 ${!d.esteActiv && "opacity-60"}`}>
                <div>
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {numeCategorie(d.categorieId) && <Badge tone="neutral">{numeCategorie(d.categorieId)}</Badge>}
                    <Badge tone="blue">{TIP_LABEL[d.tip]}{d.unitate ? ` · ${d.unitate}` : ""}</Badge>
                    <Badge tone="neutral">{FRECV_LABEL[d.frecventa]}</Badge>
                    {!d.esteActiv && <Badge tone="amber">Inactiv</Badge>}
                  </div>
                </div>
                {esteAdmin && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Editează" onClick={() => { setEditDefinitie(d); setWizardDeschis(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Duplică" onClick={() => onDuplica(d.id)} disabled={pending}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" title={d.esteActiv ? "Dezactivează" : "Activează"} onClick={() => onComutaActiv(d.id, !d.esteActiv)} disabled={pending}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Șterge" onClick={() => onSterge(d.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <KpiBuilderWizard
        key={editDefinitie?.id ?? "nou"}
        open={wizardDeschis}
        onClose={() => setWizardDeschis(false)}
        orgSlug={orgSlug}
        categorii={categorii}
        editId={editDefinitie?.id ?? null}
        initial={editDefinitie ?? undefined}
        onSaved={reincarca}
      />
    </div>
  );
}
