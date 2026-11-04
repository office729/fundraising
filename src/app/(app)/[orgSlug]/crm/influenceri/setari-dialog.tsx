"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { INFLUENCERI_UI_DICT } from "@/lib/i18n/dictionaries/influenceri-ui";
import type { DateInfluenceri } from "@/lib/influenceri/tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import { setariAction } from "./actions";
import { Camp } from "./ui";

// Setările de urmărire (doar administratorii): când ne reamintește pagina să verificăm sau să revenim. Nimic nu se trimite automat.
export function SetariUrmarireDialog({ orgSlug, setari, onInchide }: { orgSlug: string; setari: DateInfluenceri["setari"]; onInchide: () => void }) {
  const d = INFLUENCERI_UI_DICT[useLocale()].setariUrmarire;
  const router = useRouter();
  const [v, setV] = useState({ verificareZile: String(setari.verificareZile), revenireZile: String(setari.revenireZile), maxReveniri: String(setari.maxReveniri), blocareColegZile: String(setari.blocareColegZile) });
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [ocupat, start] = useTransition();
  const camp = (k: keyof typeof v, eticheta: string, max: number) => (
    <Camp eticheta={eticheta}>
      <Input type="number" min={0} max={max} inputMode="numeric" value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} />
    </Camp>
  );
  const salveaza = () =>
    start(async () => {
      const r = await setariAction(orgSlug, { verificareZile: Number(v.verificareZile), revenireZile: Number(v.revenireZile), maxReveniri: Number(v.maxReveniri), blocareColegZile: Number(v.blocareColegZile) });
      if (r.ok) {
        setMesaj({ ok: true, text: r.mesaj ?? "" });
        router.refresh();
      } else setMesaj({ ok: false, text: r.eroare });
    });
  return (
    <Dialog open onClose={onInchide} title={d.titlu}>
      <div className="space-y-3">
        <p className="text-[13px] text-[var(--ci-text-muted)]">{d.intro}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {camp("verificareZile", d.verificare, 30)}
          {camp("revenireZile", d.revenire, 60)}
          {camp("maxReveniri", d.maxReveniri, 5)}
          {camp("blocareColegZile", d.blocare, 60)}
        </div>
        {mesaj && (
          <p role={mesaj.ok ? "status" : "alert"} className={`rounded-[var(--ci-radius-btn)] px-3 py-2 text-[13px] ${mesaj.ok ? "bg-[var(--ci-green-soft)]" : "bg-[var(--ci-red-soft)]"} text-[var(--ci-text)]`}>
            {mesaj.text}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onInchide}>{d.inchide}</Button>
          <Button variant="primary" onClick={salveaza} loading={ocupat}>
            {d.salveaza}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
