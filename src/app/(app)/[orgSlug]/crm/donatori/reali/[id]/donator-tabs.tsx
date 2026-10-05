"use client";

import type { ReactNode } from "react";

import { Tabs } from "../../../components/ui/tabs";

// Wrapper client pentru Tabs: primește panourile ca noduri deja randate pe server (nu o funcție).
export function DonatorTabs({ tabs, panels }: { tabs: { key: string; label: string }[]; panels: Record<string, ReactNode> }) {
  return <Tabs tabs={tabs}>{(active) => panels[active] ?? null}</Tabs>;
}
