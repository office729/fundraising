"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const FIELD =
  "h-9 w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-sm text-[var(--ci-text)] placeholder:text-[var(--ci-text-faint)] transition-colors focus:border-[var(--ci-blue)] focus:outline-none";

export function Input({
  className,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ci-text-faint)]">
          {icon}
        </span>
        <input className={cn(FIELD, "pl-9", className)} {...props} />
      </div>
    );
  }
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "h-auto min-h-20 resize-y py-2", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "cursor-pointer appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[var(--ci-text)]">
      {children}
    </label>
  );
}
