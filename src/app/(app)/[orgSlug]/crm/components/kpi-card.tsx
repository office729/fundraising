"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { formatSuma } from "../lib/format";
import { Tooltip } from "./ui/tooltip";

export function KpiCard({
  label,
  valoare,
  variatie,
  spark,
  explicatie,
  href,
  unitate = "suma",
}: {
  label: string;
  valoare: number;
  variatie: number;
  spark: number[];
  explicatie: string;
  href: string;
  unitate?: "suma" | "count" | "percent";
}) {
  const pozitiv = variatie >= 0;
  const display =
    unitate === "count" ? `${Math.round(valoare)}` : unitate === "percent" ? `${Math.round(valoare)}%` : formatSuma(valoare);
  const data = spark.map((v, i) => ({ i, v }));

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 shadow-[var(--ci-shadow-sm)] transition-shadow hover:shadow-[var(--ci-shadow-md)]"
    >
      <div className="mb-1 flex items-start gap-1.5">
        <p className="line-clamp-1 text-[13px] leading-tight font-medium text-[var(--ci-text-muted)]">{label}</p>
        <Tooltip label={explicatie}>
          <span className="shrink-0 text-[var(--ci-text-faint)]">ⓘ</span>
        </Tooltip>
      </div>
      <p className="ci-display ci-tabular text-[22px] font-bold text-[var(--ci-text)]">{display}</p>
      <div className="mt-1 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${
            pozitiv ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]"
          }`}
        >
          {pozitiv ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(variatie)}%
        </span>
        <span className="h-8 w-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={pozitiv ? "#16A34A" : "#DC2626"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={pozitiv ? "#16A34A" : "#DC2626"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={pozitiv ? "#16A34A" : "#DC2626"}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </span>
      </div>
    </Link>
  );
}
