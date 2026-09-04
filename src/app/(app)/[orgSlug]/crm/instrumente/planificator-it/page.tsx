"use client";

import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import {
  addProiectIT,
  getProiecteIT,
  setFazaProiectIT,
  stergeProiectIT,
  useLocalStoreValue,
  type FazaProiectIT,
} from "../../lib/local-store";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

const FAZE_KEYS: FazaProiectIT[] = ["brief", "design", "dezvoltare", "testare", "live"];

export default function PlanificatorItPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const proiecte = useLocalStoreValue(getProiecteIT, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.planificatorIt;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {dict.proiectNou}
        </Button>
      </div>

      {proiecte.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {FAZE_KEYS.map((fazaKey) => (
            <div key={fazaKey} className="space-y-2">
              <p className="px-1 text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{dict.faze[fazaKey]}</p>
              <div className="space-y-2">
                {proiecte.filter((p) => p.faza === fazaKey).map((p) => (
                  <Card key={p.id} padded={false} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--ci-text)]">{p.nume}</p>
                      <Badge tone={p.tip === "client" ? "amber" : "blue"}>{p.tip}</Badge>
                    </div>
                    {p.pagini.length > 0 && (
                      <p className="text-[11px] text-[var(--ci-text-muted)]">{dict.pagini(p.pagini.length, p.pagini.join(", "))}</p>
                    )}
                    {p.domeniu && <p className="text-[11px] text-[var(--ci-text-muted)]">🌐 {p.domeniu}</p>}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {FAZE_KEYS.filter((x) => x !== p.faza).map((x) => (
                        <button
                          key={x}
                          onClick={() => setFazaProiectIT(p.id, x)}
                          className="rounded-md border border-[var(--ci-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ci-text-muted)] hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"
                        >
                          → {dict.faze[x]}
                        </button>
                      ))}
                      <button onClick={() => stergeProiectIT(p.id)} className="rounded-md border border-[var(--ci-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ci-red)] hover:bg-[var(--ci-red-soft)]">
                        {dict.sterge}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={dict.niciunProiect.title} description={dict.niciunProiect.description} />
      )}

      <ProiectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function ProiectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale();
  const dict = INSTRUMENTE_DICT[locale].planificatorIt.dialog;
  const [nume, setNume] = useState("");
  const [tip, setTip] = useState<"intern" | "client">("intern");
  const [pagini, setPagini] = useState("");
  const [domeniu, setDomeniu] = useState("");
  const [acces, setAcces] = useState("");
  const [brief, setBrief] = useState("");

  function reset() {
    setNume(""); setTip("intern"); setPagini(""); setDomeniu(""); setAcces(""); setBrief("");
  }
  function inchide() { reset(); onClose(); }
  function salveaza() {
    if (!nume.trim()) return;
    addProiectIT({
      nume: nume.trim(),
      tip,
      pagini: pagini.split(",").map((p) => p.trim()).filter(Boolean),
      domeniu: domeniu.trim(),
      acces: acces.trim(),
      brief: brief.trim(),
    });
    inchide();
  }

  return (
    <Dialog open={open} onClose={inchide} title={dict.title} width="max-w-sm">
      <div className="space-y-4">
        <div>
          <Label>{dict.numeProiect}</Label>
          <Input autoFocus value={nume} onChange={(e) => setNume(e.target.value)} placeholder={dict.numeProiectPlaceholder} />
        </div>
        <div>
          <Label>{dict.tip}</Label>
          <Select value={tip} onChange={(e) => setTip(e.target.value as "intern" | "client")}>
            <option value="intern">{dict.intern}</option>
            <option value="client">{dict.client}</option>
          </Select>
        </div>
        <div>
          <Label>{dict.pagini}</Label>
          <Input value={pagini} onChange={(e) => setPagini(e.target.value)} placeholder={dict.paginiPlaceholder} />
        </div>
        <div>
          <Label>{dict.domeniu}</Label>
          <Input value={domeniu} onChange={(e) => setDomeniu(e.target.value)} placeholder="exemplu.ro" />
        </div>
        <div>
          <Label>{dict.acces}</Label>
          <Input value={acces} onChange={(e) => setAcces(e.target.value)} placeholder={dict.accesPlaceholder} />
        </div>
        <div>
          <Label>{dict.brief}</Label>
          <Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={dict.briefPlaceholder} />
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button variant="secondary" onClick={inchide}>{dict.anuleaza}</Button>
          <Button variant="primary" onClick={salveaza} disabled={!nume.trim()}>{dict.adaugaProiect}</Button>
        </div>
      </div>
    </Dialog>
  );
}
