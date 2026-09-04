"use client";

import { useMemo } from "react";

import type { Beneficiar } from "../mock/beneficiari";
import { BENEFICIARI } from "../mock/beneficiari";
import type { Companie } from "../mock/companii";
import { COMPANII } from "../mock/companii";
import type { Donator } from "../mock/donatori";
import { DONATORI } from "../mock/donatori";
import { getImportedBeneficiari, getImportedCompanii, getImportedDonatori, useLocalStoreValue } from "./local-store";

const EMPTY: never[] = [];

export function useDonatori(): Donator[] {
  const importate = useLocalStoreValue(() => getImportedDonatori<Donator>(), EMPTY);
  return useMemo(() => [...DONATORI, ...importate], [importate]);
}

export function useDonator(id: string): Donator | undefined {
  const toti = useDonatori();
  return useMemo(() => toti.find((d) => d.id === id), [toti, id]);
}

export function useCompanii(): Companie[] {
  const importate = useLocalStoreValue(() => getImportedCompanii<Companie>(), EMPTY);
  return useMemo(() => [...COMPANII, ...importate], [importate]);
}

export function useCompanie(id: string): Companie | undefined {
  const toate = useCompanii();
  return useMemo(() => toate.find((c) => c.id === id), [toate, id]);
}

export function useBeneficiari(): Beneficiar[] {
  const importate = useLocalStoreValue(() => getImportedBeneficiari<Beneficiar>(), EMPTY);
  return useMemo(() => [...BENEFICIARI, ...importate], [importate]);
}

export function useBeneficiar(id: string): Beneficiar | undefined {
  const toti = useBeneficiari();
  return useMemo(() => toti.find((b) => b.id === id), [toti, id]);
}
