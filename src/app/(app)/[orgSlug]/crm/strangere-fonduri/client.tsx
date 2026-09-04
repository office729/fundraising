"use client";

import { Check, Copy, ImageUp, Lock, Pencil, Plus, Trash2, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "../components/ui/button";
import { useLocale } from "../lib/locale-context";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { AddPageDialog } from "./add-page-dialog";
import { AddUpdateDialog } from "./add-update-dialog";
import { EditPageDialog, type PaginaEditabila } from "./edit-page-dialog";
import {
  actualizeazaImaginePaginaAction,
  comutaStatusPaginaStrangereFonduri,
  stergeActualizareAction,
  stergePaginaStrangereFonduri,
  type ImaginePaginaState,
} from "./actions";

export function AddPageButton({ orgSlug }: { orgSlug: string }) {
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> {dict.adaugaPagina}
      </Button>
      <AddPageDialog open={open} onClose={() => setOpen(false)} orgSlug={orgSlug} />
    </>
  );
}

export function EditPageButton({ orgSlug, pagina }: { orgSlug: string; pagina: PaginaEditabila }) {
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={dict.editeazaPagina}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <EditPageDialog open={open} onClose={() => setOpen(false)} orgSlug={orgSlug} pagina={pagina} />
    </>
  );
}

export function CopyCreateLinkButton({ orgSlug }: { orgSlug: string }) {
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [copiat, setCopiat] = useState(false);

  async function copiaza() {
    const link = `${window.location.origin}/strangere-fonduri/${orgSlug}/creeaza`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — ignorăm silențios
    }
  }

  return (
    <Button variant="primary" onClick={copiaza}>
      {copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copiat ? dict.linkCopiat : dict.copiazaLinkCreare}
    </Button>
  );
}

export function CopyPageLinkButton({ orgSlug, pageSlug }: { orgSlug: string; pageSlug: string }) {
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [copiat, setCopiat] = useState(false);

  async function copiaza() {
    const link = `${window.location.origin}/strangere-fonduri/${orgSlug}/${pageSlug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — ignorăm silențios
    }
  }

  return (
    <button
      onClick={copiaza}
      title={dict.copiazaLinkPagina}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
    >
      {copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function AddUpdateButton({ orgSlug, pageId }: { orgSlug: string; pageId: string }) {
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> {dict.adaugaActualizare}
      </Button>
      <AddUpdateDialog open={open} onClose={() => setOpen(false)} orgSlug={orgSlug} pageId={pageId} />
    </>
  );
}

export function DeleteUpdateButton({ orgSlug, id }: { orgSlug: string; id: string }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [seSterge, setSeSterge] = useState(false);

  async function sterge() {
    if (!window.confirm(dict.confirmaStergereActualizare)) return;
    setSeSterge(true);
    try {
      await stergeActualizareAction(orgSlug, id);
      router.refresh();
    } finally {
      setSeSterge(false);
    }
  }

  return (
    <button
      onClick={sterge}
      disabled={seSterge}
      title={dict.stergeActualizarea}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)] disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

export function ToggleStatusButton({ orgSlug, id, status }: { orgSlug: string; id: string; status: "activa" | "inchisa" }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [seSchimba, setSeSchimba] = useState(false);
  const inchide = status === "activa";

  async function comuta() {
    setSeSchimba(true);
    try {
      await comutaStatusPaginaStrangereFonduri(orgSlug, id, inchide ? "inchisa" : "activa");
      router.refresh();
    } finally {
      setSeSchimba(false);
    }
  }

  return (
    <button
      onClick={comuta}
      disabled={seSchimba}
      title={inchide ? dict.inchidePagina : dict.redeschidePagina}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)] disabled:opacity-50"
    >
      {inchide ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
    </button>
  );
}

export function DeletePageButton({ orgSlug, id, titlu }: { orgSlug: string; id: string; titlu: string }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const [seSterge, setSeSterge] = useState(false);

  async function sterge() {
    if (!window.confirm(dict.confirmaStergerePagina(titlu))) return;
    setSeSterge(true);
    try {
      const rezultat = await stergePaginaStrangereFonduri(orgSlug, id);
      if (rezultat.error) {
        window.alert(rezultat.error);
        return;
      }
      router.refresh();
    } finally {
      setSeSterge(false);
    }
  }

  return (
    <button
      onClick={sterge}
      disabled={seSterge}
      title={dict.stergePagina}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)] disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

const INITIAL_IMAGINE: ImaginePaginaState = { error: null, ok: false };

export function ImageUploadCard({ orgSlug, pageId, imagineUrl }: { orgSlug: string; pageId: string; imagineUrl: string | null }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].client;
  const action = actualizeazaImaginePaginaAction.bind(null, orgSlug, pageId);
  const [state, formAction, pending] = useActionState(action, INITIAL_IMAGINE);

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.pozaCopertaTitle}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{dict.pozaCopertaDesc}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {imagineUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic, nu merită next/image aici
          <img src={imagineUrl} alt="" className="h-16 w-24 rounded-lg border border-[var(--ci-border)] object-cover" />
        )}
        <form action={formAction} className="flex items-center gap-2">
          <input
            type="file"
            name="imagine"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            className="text-[12px] text-[var(--ci-text-muted)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--ci-surface-2)] file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--ci-text)]"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            <ImageUp className="h-3.5 w-3.5" /> {pending ? dict.seIncarca : imagineUrl ? dict.schimba : dict.incarca}
          </Button>
        </form>
      </div>
      {state.error && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{state.error}</p>}
    </div>
  );
}
