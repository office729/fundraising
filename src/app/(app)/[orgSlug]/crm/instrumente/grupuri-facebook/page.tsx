"use client";

import { Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label, Select } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import {
  addGrupFacebook,
  getGrupuriFacebook,
  stergeGrupFacebook,
  useLocalStoreValue,
  type GrupFacebook,
} from "../../lib/local-store";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];

export default function GrupuriFacebookPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const grupuri = useLocalStoreValue(getGrupuriFacebook, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.grupuriFacebook;

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {dict.grupNou}
        </Button>
      </div>

      {grupuri.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESPONSABILI.map((r) => {
            const ale = grupuri.filter((g) => g.responsabil === r);
            if (!ale.length) return null;
            return (
              <Card key={r}>
                <CardHeader title={r} subtitle={dict.grupuriMembri(ale.length, ale.reduce((s, g) => s + g.membri, 0).toLocaleString("ro-RO"))} />
                <div className="space-y-2">
                  {ale.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3 py-2">
                      <div>
                        <p className="text-[13px] font-medium text-[var(--ci-text)]">{g.nume}</p>
                        <p className="ci-tabular text-[11px] text-[var(--ci-text-muted)]">{g.membri.toLocaleString("ro-RO")} {dict.membri}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="blue">{dict.frecventaLabel[g.frecventaPostari]}</Badge>
                        <button onClick={() => stergeGrupFacebook(g.id)} className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title={dict.niciunGrup.title} description={dict.niciunGrup.description} />
      )}

      {dialogOpen && <GrupDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function GrupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale();
  const dict = INSTRUMENTE_DICT[locale].grupuriFacebook;
  const [nume, setNume] = useState("");
  const [link, setLink] = useState("");
  const [membri, setMembri] = useState("");
  const [responsabil, setResponsabil] = useState(RESPONSABILI[0]);
  const [frecventaPostari, setFrecventaPostari] = useState<GrupFacebook["frecventaPostari"]>("saptamanal");

  function inchide() {
    setNume(""); setLink(""); setMembri(""); setResponsabil(RESPONSABILI[0]); setFrecventaPostari("saptamanal");
    onClose();
  }
  function salveaza() {
    if (!nume.trim()) return;
    addGrupFacebook({ nume: nume.trim(), link: link.trim(), membri: Number(membri) || 0, responsabil, frecventaPostari });
    inchide();
  }

  return (
    <Dialog open={open} onClose={inchide} title={dict.dialog.title} width="max-w-sm">
      <div className="space-y-4">
        <div>
          <Label>{dict.dialog.numeGrup}</Label>
          <Input autoFocus value={nume} onChange={(e) => setNume(e.target.value)} placeholder={dict.dialog.numeGrupPlaceholder} />
        </div>
        <div>
          <Label>{dict.dialog.linkOptional}</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="facebook.com/groups/..." />
        </div>
        <div>
          <Label>{dict.dialog.nrMembri}</Label>
          <Input type="number" min="0" value={membri} onChange={(e) => setMembri(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>{dict.dialog.responsabil}</Label>
          <Select value={responsabil} onChange={(e) => setResponsabil(e.target.value)}>
            {RESPONSABILI.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div>
          <Label>{dict.dialog.frecventaPostari}</Label>
          <Select value={frecventaPostari} onChange={(e) => setFrecventaPostari(e.target.value as GrupFacebook["frecventaPostari"])}>
            <option value="zilnic">{dict.frecventaLabel.zilnic}</option>
            <option value="saptamanal">{dict.frecventaLabel.saptamanal}</option>
            <option value="lunar">{dict.frecventaLabel.lunar}</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button variant="secondary" onClick={inchide}>{dict.dialog.anuleaza}</Button>
          <Button variant="primary" onClick={salveaza} disabled={!nume.trim()}>{dict.dialog.adaugaGrup}</Button>
        </div>
      </div>
    </Dialog>
  );
}
