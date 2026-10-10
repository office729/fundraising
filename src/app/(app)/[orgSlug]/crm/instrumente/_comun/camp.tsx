"use client";

import { cloneElement, useId, type ReactElement } from "react";

import { Label } from "../../components/ui/input";

// Un câmp cu eticheta legată de el (click pe etichetă duce în câmp, iar cititoarele de ecran citesc numele) și text de ajutor asociat.
export function Camp({ eticheta, ajutor, className, actiune, children }: { eticheta: string; ajutor?: string; className?: string; actiune?: React.ReactNode; children: ReactElement<{ id?: string; "aria-describedby"?: string }> }) {
  const id = useId();
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={id}>{eticheta}</Label>
        {actiune}
      </div>
      {cloneElement(children, { id, "aria-describedby": ajutor ? `${id}-a` : undefined })}
      {ajutor && (
        <p id={`${id}-a`} className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
          {ajutor}
        </p>
      )}
    </div>
  );
}
