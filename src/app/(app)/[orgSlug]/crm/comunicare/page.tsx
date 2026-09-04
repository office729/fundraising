"use client";

import { Calendar, Mail, MessageSquare, Phone } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar } from "../components/ui/avatar";
import { Badge, type StatusTone } from "../components/ui/badge";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { formatDataRelativa } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { COMUNICARE_DICT } from "@/lib/i18n/dictionaries/comunicare";
import { COMUNICARI, type Comunicare } from "../mock";

const TIP_ICON: Record<Comunicare["tip"], typeof Mail> = { email: Mail, telefon: Phone, intalnire: Calendar, sms: MessageSquare };
const TIP_TONE: Record<Comunicare["tip"], StatusTone> = { email: "blue", telefon: "green", intalnire: "amber", sms: "neutral" };

export default function ComunicarePage() {
  const locale = useLocale();
  const dict = COMUNICARE_DICT[locale];
  const TIP_LABEL = dict.tipLabel;
  const [tip, setTip] = useState("toate");
  const [autor, setAutor] = useState("toti");

  const autori = useMemo(() => Array.from(new Set(COMUNICARI.map((c) => c.autor))), []);

  const filtered = useMemo(
    () =>
      [...COMUNICARI]
        .filter((c) => (tip === "toate" || c.tip === tip) && (autor === "toti" || c.autor === autor))
        .sort((a, b) => +new Date(b.la) - +new Date(a.la)),
    [tip, autor],
  );

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(filtered.length)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={tip} onChange={(e) => setTip(e.target.value)} className="w-40">
          <option value="toate">{dict.toateTipurile}</option>
          {Object.entries(TIP_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select value={autor} onChange={(e) => setAutor(e.target.value)} className="w-48">
          <option value="toti">{dict.toataEchipa}</option>
          {autori.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={dict.empty.title} description={dict.empty.description} />
      ) : (
        <div className="space-y-0 border-l-2 border-[var(--ci-border)] pl-5">
          {filtered.map((c) => {
            const Icon = TIP_ICON[c.tip];
            return (
              <div key={c.id} className="relative pb-5">
                <span className="absolute top-1 -left-[27px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ci-surface)] bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]">
                  <Icon className="h-3 w-3" />
                </span>
                <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5 shadow-[var(--ci-shadow-sm)]">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={TIP_TONE[c.tip]}>{TIP_LABEL[c.tip]}</Badge>
                      <span className="text-[13px] font-medium text-[var(--ci-text)]">{c.legatDe.nume}</span>
                    </div>
                    <span className="shrink-0 text-[12px] text-[var(--ci-text-muted)]">{formatDataRelativa(c.la)}</span>
                  </div>
                  <p className="text-[13px] text-[var(--ci-text-muted)]">{c.rezumat}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Avatar name={c.autor} size="sm" />
                    <span className="text-[12px] text-[var(--ci-text-faint)]">{c.autor}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
