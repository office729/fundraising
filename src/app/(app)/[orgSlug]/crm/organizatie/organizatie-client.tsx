"use client";

import { AlertTriangle, Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";
import { useLocale } from "../lib/locale-context";
import {
  actualizeazaAngajatAction,
  actualizeazaDepartamentAction,
  actualizeazaRolAction,
  creeazaAngajatAction,
  creeazaDepartamentAction,
  creeazaRolAction,
  listeazaAngajatiAction,
  listeazaDepartamenteAction,
  listeazaRoluriAction,
  stergeAngajatAction,
  stergeDepartamentAction,
  stergeRolAction,
  type AngajatInput,
  type AngajatRand,
  type DepartamentRand,
  type RolRand,
} from "./actions";

const STATUS_TONE = { activ: "green", concediu: "amber", suspendat: "orange", inactiv: "neutral" } as const;
const STATUS_LABEL_RO: Record<AngajatRand["status"], string> = { activ: "Activ", concediu: "Concediu", suspendat: "Suspendat", inactiv: "Inactiv" };
const NIVEL_LABEL_RO: Record<AngajatRand["nivelAcces"], string> = { membru: "Membru", manager: "Manager", admin_departament: "Admin departament" };

export function OrganizatieClient({
  initialDepartamente,
  initialRoluri,
  initialAngajati,
  esteAdmin,
}: {
  initialDepartamente: DepartamentRand[];
  initialRoluri: RolRand[];
  initialAngajati: AngajatRand[];
  esteAdmin: boolean;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const ro = locale !== "en";

  const [departamente, setDepartamente] = useState(initialDepartamente);
  const [roluriLista, setRoluriLista] = useState(initialRoluri);
  const [angajatiLista, setAngajatiLista] = useState(initialAngajati);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reincarca = async () => {
    const [d, r, a] = await Promise.all([listeazaDepartamenteAction(orgSlug), listeazaRoluriAction(orgSlug), listeazaAngajatiAction(orgSlug)]);
    setDepartamente(d);
    setRoluriLista(r);
    setAngajatiLista(a);
  };

  const harta = {
    departament: (id: string | null) => departamente.find((d) => d.id === id)?.nume ?? null,
    rol: (id: string | null) => roluriLista.find((r) => r.id === id)?.nume ?? null,
    angajat: (id: string | null) => {
      const a = angajatiLista.find((x) => x.id === id);
      return a ? `${a.nume} ${a.prenume ?? ""}`.trim() : null;
    },
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: ro ? "Instrumente" : "Tools", href: `/${orgSlug}/crm/instrumente` }, { label: ro ? "Organizație & Echipă" : "Organization & Team" }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{ro ? "Organizație & Echipă" : "Organization & Team"}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          {ro
            ? "Structura ta: departamente, roluri, oameni. Fiecare ONG își definește propria organizare."
            : "Your structure: departments, roles, people. Every NGO defines its own setup."}
        </p>
      </div>

      {eroare && (
        <p className="flex items-center gap-1.5 text-[13px] text-[var(--ci-red)]">
          <AlertTriangle className="h-3.5 w-3.5" /> {eroare}
        </p>
      )}

      <Tabs
        tabs={[
          { key: "departamente", label: ro ? `Departamente (${departamente.length})` : `Departments (${departamente.length})` },
          { key: "roluri", label: ro ? `Roluri (${roluriLista.length})` : `Roles (${roluriLista.length})` },
          { key: "angajati", label: ro ? `Echipă (${angajatiLista.length})` : `Team (${angajatiLista.length})` },
        ]}
      >
        {(activ) =>
          activ === "departamente" ? (
            <DepartamenteTab orgSlug={orgSlug} ro={ro} esteAdmin={esteAdmin} departamente={departamente} pending={pending} start={start} setEroare={setEroare} reincarca={reincarca} />
          ) : activ === "roluri" ? (
            <RoluriTab orgSlug={orgSlug} ro={ro} esteAdmin={esteAdmin} roluri={roluriLista} departamente={departamente} harta={harta} pending={pending} start={start} setEroare={setEroare} reincarca={reincarca} />
          ) : (
            <AngajatiTab
              orgSlug={orgSlug}
              ro={ro}
              esteAdmin={esteAdmin}
              angajati={angajatiLista}
              roluri={roluriLista}
              departamente={departamente}
              harta={harta}
              pending={pending}
              start={start}
              setEroare={setEroare}
              reincarca={reincarca}
            />
          )
        }
      </Tabs>
    </div>
  );
}

type Start = (fn: () => Promise<void>) => void;

// --- Departamente --------------------------------------------------------

function DepartamenteTab({
  orgSlug,
  ro,
  esteAdmin,
  departamente,
  pending,
  start,
  setEroare,
  reincarca,
}: {
  orgSlug: string;
  ro: boolean;
  esteAdmin: boolean;
  departamente: DepartamentRand[];
  pending: boolean;
  start: Start;
  setEroare: (e: string | null) => void;
  reincarca: () => Promise<void>;
}) {
  const [editDeschis, setEditDeschis] = useState<DepartamentRand | null | "nou">(null);
  const [nume, setNume] = useState("");
  const [descriere, setDescriere] = useState("");
  const [functiePrincipala, setFunctiePrincipala] = useState("");

  const deschideNou = () => {
    setNume("");
    setDescriere("");
    setFunctiePrincipala("");
    setEditDeschis("nou");
  };
  const deschideEdit = (d: DepartamentRand) => {
    setNume(d.nume);
    setDescriere(d.descriere ?? "");
    setEditDeschis(d);
  };

  const onSalveaza = () => {
    setEroare(null);
    start(async () => {
      try {
        if (editDeschis === "nou") await creeazaDepartamentAction(orgSlug, nume, descriere || null, functiePrincipala || null);
        else if (editDeschis) await actualizeazaDepartamentAction(orgSlug, editDeschis.id, nume, descriere || null);
        setEditDeschis(null);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSterge = (id: string) => {
    setEroare(null);
    start(async () => {
      try {
        await stergeDepartamentAction(orgSlug, id);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <Card>
      <CardHeader
        title={ro ? "Departamente" : "Departments"}
        subtitle={ro ? "Ex. Fundraising, Comunicare, Proiecte — orice structură are nevoie organizația ta." : "e.g. Fundraising, Communication, Programs — whatever structure your NGO needs."}
        action={esteAdmin && <Button size="sm" onClick={deschideNou}><Plus className="h-3.5 w-3.5" /> {ro ? "Adaugă" : "Add"}</Button>}
      />
      {departamente.length === 0 ? (
        <EmptyState icon={Building2} title={ro ? "Niciun departament încă" : "No departments yet"} description={ro ? "Creează primul departament ca să-ți organizezi echipa." : "Create your first department to organize your team."} action={esteAdmin && <Button size="sm" onClick={deschideNou}>{ro ? "Adaugă departament" : "Add department"}</Button>} />
      ) : (
        <div className="space-y-2">
          {departamente.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                {d.descriere && <p className="text-[12px] text-[var(--ci-text-muted)]">{d.descriere}</p>}
              </div>
              {esteAdmin && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => deschideEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onSterge(d.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editDeschis !== null} onClose={() => setEditDeschis(null)} title={editDeschis === "nou" ? (ro ? "Departament nou" : "New department") : ro ? "Editează departament" : "Edit department"}>
        <div className="space-y-3.5">
          <div>
            <Label>{ro ? "Nume" : "Name"}</Label>
            <Input value={nume} onChange={(e) => setNume(e.target.value)} />
          </div>
          <div>
            <Label>{ro ? "Descriere (opțional)" : "Description (optional)"}</Label>
            <Textarea value={descriere} onChange={(e) => setDescriere(e.target.value)} rows={2} />
          </div>
          {editDeschis === "nou" && (
            <div>
              <Label>{ro ? "Funcție principală (opțional)" : "Main function (optional)"}</Label>
              <Input value={functiePrincipala} onChange={(e) => setFunctiePrincipala(e.target.value)} placeholder={ro ? "ex. Corporate Fundraiser" : "e.g. Corporate Fundraiser"} />
              <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                {ro ? "Adaugă direct funcția/rolul colegului din acest departament — îl poți completa oricând mai târziu, din tab-ul Roluri." : "Add the colleague's role in this department directly — you can also do this later from the Roles tab."}
              </p>
            </div>
          )}
          <Button onClick={onSalveaza} disabled={pending || !nume.trim()}>{ro ? "Salvează" : "Save"}</Button>
        </div>
      </Dialog>
    </Card>
  );
}

// --- Roluri ----------------------------------------------------------------

function RoluriTab({
  orgSlug,
  ro,
  esteAdmin,
  roluri,
  departamente,
  harta,
  pending,
  start,
  setEroare,
  reincarca,
}: {
  orgSlug: string;
  ro: boolean;
  esteAdmin: boolean;
  roluri: RolRand[];
  departamente: DepartamentRand[];
  harta: { departament: (id: string | null) => string | null };
  pending: boolean;
  start: Start;
  setEroare: (e: string | null) => void;
  reincarca: () => Promise<void>;
}) {
  const [editDeschis, setEditDeschis] = useState<RolRand | null | "nou">(null);
  const [nume, setNume] = useState("");
  const [descriere, setDescriere] = useState("");
  const [responsabilitati, setResponsabilitati] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const deschideNou = () => {
    setNume("");
    setDescriere("");
    setResponsabilitati("");
    setDepartmentId("");
    setEditDeschis("nou");
  };
  const deschideEdit = (r: RolRand) => {
    setNume(r.nume);
    setDescriere(r.descriere ?? "");
    setResponsabilitati(r.responsabilitati ?? "");
    setDepartmentId(r.departmentId ?? "");
    setEditDeschis(r);
  };

  const onSalveaza = () => {
    setEroare(null);
    start(async () => {
      try {
        if (editDeschis === "nou") await creeazaRolAction(orgSlug, nume, descriere || null, responsabilitati || null, departmentId || null);
        else if (editDeschis) await actualizeazaRolAction(orgSlug, editDeschis.id, nume, descriere || null, responsabilitati || null, departmentId || null);
        setEditDeschis(null);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSterge = (id: string) => {
    setEroare(null);
    start(async () => {
      try {
        await stergeRolAction(orgSlug, id);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <Card>
      <CardHeader
        title={ro ? "Roluri" : "Roles"}
        subtitle={ro ? "Ex. Fundraiser corporate, Manager proiect, Coordonator voluntari — orice rol are nevoie organizația ta." : "e.g. Corporate Fundraiser, Project Manager — whatever roles your NGO needs."}
        action={esteAdmin && <Button size="sm" onClick={deschideNou}><Plus className="h-3.5 w-3.5" /> {ro ? "Adaugă" : "Add"}</Button>}
      />
      {roluri.length === 0 ? (
        <EmptyState icon={Users} title={ro ? "Niciun rol încă" : "No roles yet"} description={ro ? "Creează primul rol ca să poți atribui KPI pe el." : "Create your first role to assign KPIs to it."} action={esteAdmin && <Button size="sm" onClick={deschideNou}>{ro ? "Adaugă rol" : "Add role"}</Button>} />
      ) : (
        <div className="space-y-2">
          {roluri.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-[var(--ci-text)]">{r.nume}</p>
                <p className="text-[12px] text-[var(--ci-text-muted)]">
                  {harta.departament(r.departmentId) ?? (ro ? "fără departament" : "no department")}
                  {r.descriere && ` · ${r.descriere}`}
                </p>
              </div>
              {esteAdmin && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => deschideEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onSterge(r.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editDeschis !== null} onClose={() => setEditDeschis(null)} title={editDeschis === "nou" ? (ro ? "Rol nou" : "New role") : ro ? "Editează rol" : "Edit role"}>
        <div className="space-y-3.5">
          <div>
            <Label>{ro ? "Nume" : "Name"}</Label>
            <Input value={nume} onChange={(e) => setNume(e.target.value)} />
          </div>
          <div>
            <Label>{ro ? "Departament (opțional)" : "Department (optional)"}</Label>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{ro ? "— niciunul —" : "— none —"}</option>
              {departamente.map((d) => <option key={d.id} value={d.id}>{d.nume}</option>)}
            </Select>
          </div>
          <div>
            <Label>{ro ? "Descriere (opțional)" : "Description (optional)"}</Label>
            <Textarea value={descriere} onChange={(e) => setDescriere(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>{ro ? "Responsabilități (opțional)" : "Responsibilities (optional)"}</Label>
            <Textarea value={responsabilitati} onChange={(e) => setResponsabilitati(e.target.value)} rows={3} />
          </div>
          <Button onClick={onSalveaza} disabled={pending || !nume.trim()}>{ro ? "Salvează" : "Save"}</Button>
        </div>
      </Dialog>
    </Card>
  );
}

// --- Angajați ----------------------------------------------------------------

const GOL_ANGAJAT: AngajatInput = {
  nume: "",
  prenume: "",
  email: "",
  telefon: "",
  roleId: null,
  departmentId: null,
  managerId: null,
  dataInceperii: null,
  status: "activ",
  programLucru: null,
  normaProcent: 100,
  locatie: "",
  responsabilitati: "",
  nivelAcces: "membru",
};

function AngajatiTab({
  orgSlug,
  ro,
  esteAdmin,
  angajati,
  roluri,
  departamente,
  harta,
  pending,
  start,
  setEroare,
  reincarca,
}: {
  orgSlug: string;
  ro: boolean;
  esteAdmin: boolean;
  angajati: AngajatRand[];
  roluri: RolRand[];
  departamente: DepartamentRand[];
  harta: { departament: (id: string | null) => string | null; rol: (id: string | null) => string | null; angajat: (id: string | null) => string | null };
  pending: boolean;
  start: Start;
  setEroare: (e: string | null) => void;
  reincarca: () => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | "nou" | null>(null);
  const [form, setForm] = useState<AngajatInput>(GOL_ANGAJAT);

  const deschideNou = () => {
    setForm(GOL_ANGAJAT);
    setEditId("nou");
  };
  const deschideEdit = (a: AngajatRand) => {
    setForm({ ...a });
    setEditId(a.id);
  };

  const onSalveaza = () => {
    setEroare(null);
    start(async () => {
      try {
        if (editId === "nou") await creeazaAngajatAction(orgSlug, form);
        else if (editId) await actualizeazaAngajatAction(orgSlug, editId, form);
        setEditId(null);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSterge = (id: string) => {
    setEroare(null);
    start(async () => {
      try {
        await stergeAngajatAction(orgSlug, id);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <Card>
      <CardHeader
        title={ro ? "Echipă" : "Team"}
        subtitle={ro ? "Oamenii organizației tale — cu sau fără cont de login pe platformă." : "Your organization's people — with or without a platform login."}
        action={esteAdmin && <Button size="sm" onClick={deschideNou}><Plus className="h-3.5 w-3.5" /> {ro ? "Adaugă" : "Add"}</Button>}
      />
      {angajati.length === 0 ? (
        <EmptyState icon={Users} title={ro ? "Niciun membru încă" : "No team members yet"} description={ro ? "Adaugă primul membru al echipei." : "Add your first team member."} action={esteAdmin && <Button size="sm" onClick={deschideNou}>{ro ? "Adaugă membru" : "Add member"}</Button>} />
      ) : (
        <div className="space-y-2">
          {angajati.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-[var(--ci-text)]">{a.nume} {a.prenume}</p>
                <p className="text-[12px] text-[var(--ci-text-muted)]">
                  {harta.rol(a.roleId) ?? (ro ? "fără rol" : "no role")} · {harta.departament(a.departmentId) ?? (ro ? "fără departament" : "no department")}
                  {a.managerId && ` · ${ro ? "manager:" : "manager:"} ${harta.angajat(a.managerId)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[a.status]}>{ro ? STATUS_LABEL_RO[a.status] : a.status}</Badge>
                {a.nivelAcces !== "membru" && <Badge tone="blue">{ro ? NIVEL_LABEL_RO[a.nivelAcces] : a.nivelAcces}</Badge>}
                {esteAdmin && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => deschideEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onSterge(a.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editId !== null} onClose={() => setEditId(null)} title={editId === "nou" ? (ro ? "Membru nou" : "New member") : ro ? "Editează membru" : "Edit member"} width="max-w-xl">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <Label>{ro ? "Nume" : "Last name"}</Label>
            <Input value={form.nume} onChange={(e) => setForm({ ...form, nume: e.target.value })} />
          </div>
          <div>
            <Label>{ro ? "Prenume" : "First name"}</Label>
            <Input value={form.prenume ?? ""} onChange={(e) => setForm({ ...form, prenume: e.target.value || null })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value || null })} />
          </div>
          <div>
            <Label>{ro ? "Telefon" : "Phone"}</Label>
            <Input value={form.telefon ?? ""} onChange={(e) => setForm({ ...form, telefon: e.target.value || null })} />
          </div>
          <div>
            <Label>{ro ? "Rol" : "Role"}</Label>
            <Select value={form.roleId ?? ""} onChange={(e) => setForm({ ...form, roleId: e.target.value || null })}>
              <option value="">{ro ? "— niciunul —" : "— none —"}</option>
              {roluri.map((r) => <option key={r.id} value={r.id}>{r.nume}</option>)}
            </Select>
          </div>
          <div>
            <Label>{ro ? "Departament" : "Department"}</Label>
            <Select value={form.departmentId ?? ""} onChange={(e) => setForm({ ...form, departmentId: e.target.value || null })}>
              <option value="">{ro ? "— niciunul —" : "— none —"}</option>
              {departamente.map((d) => <option key={d.id} value={d.id}>{d.nume}</option>)}
            </Select>
          </div>
          <div>
            <Label>{ro ? "Manager direct" : "Direct manager"}</Label>
            <Select value={form.managerId ?? ""} onChange={(e) => setForm({ ...form, managerId: e.target.value || null })}>
              <option value="">{ro ? "— niciunul —" : "— none —"}</option>
              {angajati.filter((a) => a.id !== editId).map((a) => <option key={a.id} value={a.id}>{a.nume} {a.prenume}</option>)}
            </Select>
          </div>
          <div>
            <Label>{ro ? "Data începerii" : "Start date"}</Label>
            <Input type="date" value={form.dataInceperii ?? ""} onChange={(e) => setForm({ ...form, dataInceperii: e.target.value || null })} />
          </div>
          <div>
            <Label>{ro ? "Status" : "Status"}</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AngajatInput["status"] })}>
              <option value="activ">{ro ? "Activ" : "Active"}</option>
              <option value="concediu">{ro ? "Concediu" : "On leave"}</option>
              <option value="suspendat">{ro ? "Suspendat" : "Suspended"}</option>
              <option value="inactiv">{ro ? "Inactiv" : "Inactive"}</option>
            </Select>
          </div>
          <div>
            <Label>{ro ? "Program de lucru" : "Work schedule"}</Label>
            <Select value={form.programLucru ?? ""} onChange={(e) => setForm({ ...form, programLucru: (e.target.value || null) as AngajatInput["programLucru"] })}>
              <option value="">{ro ? "— nespecificat —" : "— unspecified —"}</option>
              <option value="norma_intreaga">{ro ? "Normă întreagă" : "Full-time"}</option>
              <option value="part_time">{ro ? "Part-time" : "Part-time"}</option>
            </Select>
          </div>
          <div>
            <Label>{ro ? "Normă (%)" : "Workload (%)"}</Label>
            <Input type="number" min={1} max={100} value={form.normaProcent} onChange={(e) => setForm({ ...form, normaProcent: Number(e.target.value) || 100 })} />
          </div>
          <div>
            <Label>{ro ? "Locație (opțional)" : "Location (optional)"}</Label>
            <Input value={form.locatie ?? ""} onChange={(e) => setForm({ ...form, locatie: e.target.value || null })} />
          </div>
          <div className="col-span-2">
            <Label>{ro ? "Nivel acces KPI" : "KPI access level"}</Label>
            <Select value={form.nivelAcces} onChange={(e) => setForm({ ...form, nivelAcces: e.target.value as AngajatInput["nivelAcces"] })}>
              <option value="membru">{ro ? "Membru — vede doar propriile KPI" : "Member — sees only own KPIs"}</option>
              <option value="manager">{ro ? "Manager — vede echipa din subordine" : "Manager — sees their reports"}</option>
              <option value="admin_departament">{ro ? "Admin departament — vede tot departamentul" : "Department admin — sees the whole department"}</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>{ro ? "Responsabilități (opțional)" : "Responsibilities (optional)"}</Label>
            <Textarea value={form.responsabilitati ?? ""} onChange={(e) => setForm({ ...form, responsabilitati: e.target.value || null })} rows={2} />
          </div>
          <div className="col-span-2">
            <Button onClick={onSalveaza} disabled={pending || !form.nume.trim()}>{ro ? "Salvează" : "Save"}</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
