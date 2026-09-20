"use client";

import { FileSignature, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { trimiteDocumentLaSemnat, verificaStatusDocument } from "./actions";

type Trimis = { documentId: string; titlu: string; la: string; status: string };

const STATUS_RO: Record<string, string> = {
  InProgress: "Așteaptă semnături",
  Completed: "Semnat de toți",
  Declined: "Refuzat",
  Expired: "Expirat",
  Revoked: "Retras",
  Draft: "Ciornă",
};

// Lista documentelor trimise se ține în browser (per organizație); statusul real
// vine de la BoldSign la fiecare „Actualizează".
const ABONATI = new Set<() => void>();
function citeste(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}
function useTrimise(orgSlug: string) {
  const key = `ci-semnatura-${orgSlug}`;
  const raw = useSyncExternalStore(
    (cb) => {
      ABONATI.add(cb);
      return () => ABONATI.delete(cb);
    },
    () => citeste(key),
    () => "[]",
  );
  let lista: Trimis[] = [];
  try {
    lista = JSON.parse(raw);
  } catch {
    lista = [];
  }
  function salveaza(next: Trimis[]) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* stocare blocată — lista nu se păstrează */
    }
    ABONATI.forEach((cb) => cb());
  }
  return [lista, salveaza] as const;
}

export function SemnaturaForm({ orgSlug, configurat }: { orgSlug: string; configurat: boolean }) {
  const [semnatari, setSemnatari] = useState([{ nume: "", email: "" }]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesajOk, setMesajOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lista, salveaza] = useTrimise(orgSlug);
  const [seActualizeaza, setSeActualizeaza] = useState<string | null>(null);

  function trimite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formular = e.currentTarget;
    const fd = new FormData(formular);
    setEroare(null);
    setMesajOk(null);
    startTransition(async () => {
      const r = await trimiteDocumentLaSemnat(orgSlug, fd);
      if (!r.ok) {
        setEroare(r.error);
        return;
      }
      salveaza([{ documentId: r.documentId!, titlu: r.titlu!, la: new Date().toISOString(), status: "InProgress" }, ...lista]);
      setMesajOk("Documentul a fost trimis. Semnatarii primesc un email cu linkul de semnare.");
      formular.reset();
      setSemnatari([{ nume: "", email: "" }]);
    });
  }

  async function actualizeaza(documentId: string) {
    setSeActualizeaza(documentId);
    const r = await verificaStatusDocument(orgSlug, documentId);
    setSeActualizeaza(null);
    if (!r.ok) {
      setEroare(r.error);
      return;
    }
    salveaza(lista.map((d) => (d.documentId === documentId ? { ...d, status: r.doc.status } : d)));
  }

  return (
    <div className="space-y-5">
      {!configurat && (
        <p className="rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-text)]">
          Integrarea BoldSign nu e configurată încă pentru această platformă (lipsește cheia API). Formularul de mai jos devine activ după ce cheia e adăugată.
          Integrările nu sunt incluse în prețul abonamentului — se fac la cerere.
        </p>
      )}

      <Card>
        <CardHeader title="Document nou" subtitle="Doar PDF, cel mult 10 MB" />
        <form onSubmit={trimite} className="space-y-4">
          <div>
            <Label>Fișier PDF</Label>
            <input type="file" name="fisier" accept="application/pdf,.pdf" required className="block w-full text-[13px]" />
          </div>
          <div>
            <Label>Titlu</Label>
            <Input name="titlu" placeholder="ex. Contract de sponsorizare — Companie SRL" required />
          </div>
          <div>
            <Label>Mesaj pentru semnatari (opțional)</Label>
            <textarea
              name="mesaj"
              rows={2}
              className="w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label>Semnatari</Label>
            {semnatari.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input
                  name="semnatar_nume"
                  placeholder="Nume"
                  value={s.nume}
                  onChange={(e) => setSemnatari(semnatari.map((x, j) => (j === i ? { ...x, nume: e.target.value } : x)))}
                  className="min-w-40 flex-1"
                />
                <Input
                  name="semnatar_email"
                  type="email"
                  placeholder="email@exemplu.ro"
                  value={s.email}
                  onChange={(e) => setSemnatari(semnatari.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                  className="min-w-48 flex-1"
                />
                {semnatari.length > 1 && (
                  <button type="button" aria-label="Șterge semnatarul" onClick={() => setSemnatari(semnatari.filter((_, j) => j !== i))} className="text-[var(--ci-text-muted)] hover:text-[var(--ci-red)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {semnatari.length < 10 && (
              <button type="button" onClick={() => setSemnatari([...semnatari, { nume: "", email: "" }])} className="flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                <Plus className="h-3.5 w-3.5" /> Adaugă semnatar
              </button>
            )}
            <p className="text-[12px] text-[var(--ci-text-muted)]">Câmpul de semnătură al fiecărui semnatar apare în josul primei pagini.</p>
          </div>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
          {mesajOk && <p className="text-[13px] text-[var(--ci-green)]">{mesajOk}</p>}

          <Button type="submit" variant="primary" disabled={pending || !configurat}>
            <FileSignature className="h-3.5 w-3.5" /> {pending ? "Se trimite…" : "Trimite la semnat"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Documente trimise" subtitle="Din acest browser — statusul real vine de la BoldSign" />
        {lista.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun document trimis încă.</p>
        ) : (
          <ul className="divide-y divide-[var(--ci-border)]">
            {lista.map((d) => (
              <li key={d.documentId} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{d.titlu}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{new Date(d.la).toLocaleString("ro-RO")}</p>
                </div>
                <Badge tone={d.status === "Completed" ? "green" : d.status === "Declined" || d.status === "Expired" ? "red" : "neutral"}>
                  {STATUS_RO[d.status] ?? d.status}
                </Badge>
                <Button variant="secondary" size="sm" onClick={() => actualizeaza(d.documentId)} disabled={seActualizeaza === d.documentId}>
                  <RefreshCw className="h-3.5 w-3.5" /> Actualizează
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
