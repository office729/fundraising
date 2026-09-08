"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { adaugaAttachmentAction, creeazaTaskAction, finalizeazaTaskAdminAction, stergeTaskAction, type CreeazaTaskState } from "./task-actions";

export type TaskRow = {
  id: string;
  tip: "generala" | "sponsorizare";
  titlu: string;
  descriere: string | null;
  dataLimita: string | null;
  status: "de_facut" | "finalizata";
  companie: string | null;
  suma: number | null;
  textMultumire: string | null;
  canalRecomandat: string | null;
};

const INITIAL: CreeazaTaskState = { error: null, ok: false };

export type AttachmentRow = { id: string; taskId: string; fisierUrl: string; denumire: string };

export function TaskCard({
  orgSlug,
  pageId,
  taskuri,
  attachments,
}: {
  orgSlug: string;
  pageId: string;
  taskuri: TaskRow[];
  attachments: AttachmentRow[];
}) {
  const [state, formAction, pending] = useActionState(creeazaTaskAction.bind(null, orgSlug, pageId), INITIAL);
  const [tip, setTip] = useState<"generala" | "sponsorizare">("generala");
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && !pending && !state.error) window.location.reload();
    if (pending) submitted.current = true;
  }, [pending, state]);

  async function finalizeaza(id: string) {
    await finalizeazaTaskAdminAction(orgSlug, id);
    window.location.reload();
  }

  async function sterge(id: string) {
    if (!window.confirm("Ștergi această sarcină?")) return;
    await stergeTaskAction(orgSlug, id);
    window.location.reload();
  }

  async function incarcaAttachment(taskId: string, fd: FormData) {
    await adaugaAttachmentAction(orgSlug, taskId, { error: null, ok: false }, fd);
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader title="Sarcinile beneficiarului" subtitle="Sarcini generale sau de sponsorizare — beneficiarul e notificat automat" />
      <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-[var(--ci-border)] p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select name="tip" value={tip} onChange={(e) => setTip(e.target.value as "generala" | "sponsorizare")} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm">
            <option value="generala">Sarcină generală</option>
            <option value="sponsorizare">Sponsorizare</option>
          </select>
          <input name="titlu" required placeholder="Titlu sarcină" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
          <input name="dataLimita" type="date" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        </div>
        <textarea name="descriere" rows={2} placeholder="Descriere (opțional)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        {tip === "sponsorizare" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input name="companie" placeholder="Companie sponsor" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
            <input name="suma" type="number" min={1} step={1} placeholder="Sumă sponsorizare" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
            <input name="canalRecomandat" placeholder="Canal recomandat" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
            <textarea name="textMultumire" rows={2} placeholder="Text de mulțumire pentru sponsor" className="col-span-2 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm sm:col-span-3" />
          </div>
        )}
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Se creează..." : "Creează sarcina"}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}

      <div className="mt-4">
        {taskuri.length ? (
          <div className="flex flex-col gap-2">
            {taskuri.map((t) => (
              <div key={t.id} className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--ci-text)]">{t.titlu}</span>
                    {t.tip === "sponsorizare" && (
                      <Badge tone="purple" icon={false}>
                        Sponsorizare
                      </Badge>
                    )}
                    <Badge tone={t.status === "finalizata" ? "green" : "amber"} icon={false}>
                      {t.status === "finalizata" ? "Finalizată" : "De făcut"}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.status === "de_facut" && (
                      <button onClick={() => finalizeaza(t.id)} className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                        Finalizează
                      </button>
                    )}
                    <button onClick={() => sterge(t.id)} className="text-[12px] text-red-600 hover:underline">
                      Șterge
                    </button>
                  </div>
                </div>
                {t.descriere && <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{t.descriere}</p>}
                {t.tip === "sponsorizare" && (
                  <p className="mt-1 text-[12px] text-[var(--ci-text-faint)]">
                    {t.companie} {t.suma ? `· ${t.suma.toLocaleString("ro-RO")} lei` : ""} {t.canalRecomandat ? `· ${t.canalRecomandat}` : ""}
                  </p>
                )}
                {t.dataLimita && <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">Termen: {new Date(t.dataLimita).toLocaleDateString("ro-RO")}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--ci-border)] pt-2">
                  {attachments
                    .filter((a) => a.taskId === t.id)
                    .map((a) => (
                      <a key={a.id} href={a.fisierUrl} target="_blank" rel="noreferrer" className="text-[12px] text-[var(--ci-primary)] hover:underline">
                        📎 {a.denumire}
                      </a>
                    ))}
                  <form action={(fd) => incarcaAttachment(t.id, fd)} encType="multipart/form-data" className="flex items-center gap-1">
                    <input name="fisier" type="file" required accept=".jpg,.jpeg,.png,.webp" className="text-[11px] text-[var(--ci-text-faint)] file:mr-1.5 file:rounded file:border-0 file:bg-[var(--ci-surface-2)] file:px-2 file:py-1 file:text-[11px]" />
                    <button type="submit" className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                      Atașează
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nicio sarcină creată" description="Creează sarcini generale sau de sponsorizare pentru beneficiar." />
        )}
      </div>
    </Card>
  );
}
