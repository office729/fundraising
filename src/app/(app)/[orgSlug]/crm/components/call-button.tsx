"use client";

import type { Call, Device } from "@twilio/voice-sdk";
import { Loader2, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { normalizeazaTelefonE164 } from "@/lib/telefon";

type Stare = "idle" | "conectare" | "sunand" | "activ" | "eroare";

function formatDurata(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Apel real prin Twilio Voice SDK, direct din browser (fără telefonul
// agentului) — vezi src/lib/twilio.ts + src/app/api/twilio/**. Inert (butonul
// arată eroare clară) până când variabilele TWILIO_* sunt configurate.
export function CallButton({ telefon, nume, companyId }: { telefon: string; nume?: string; companyId?: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [stare, setStare] = useState<Stare>("idle");
  const [durata, setDurata] = useState(0);
  const [muted, setMuted] = useState(false);
  const [eroare, setEroare] = useState("");
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function inchide() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    try {
      callRef.current?.disconnect();
      deviceRef.current?.destroy();
    } catch {
      // dispozitivul poate fi deja distrus — ignorăm
    }
    callRef.current = null;
    deviceRef.current = null;
    setStare("idle");
    setDurata(0);
    setMuted(false);
  }

  async function suna() {
    setEroare("");
    const e164 = normalizeazaTelefonE164(telefon);
    if (!e164) {
      setEroare("Numărul de telefon nu pare valid.");
      setStare("eroare");
      return;
    }
    setStare("conectare");
    try {
      const r = await fetch(`/api/${orgSlug}/twilio-token`);
      const data = await r.json();
      if (!r.ok || !data.token) {
        setEroare(
          data.error === "twilio_neconfigurat"
            ? "Apelarea din CRM nu e încă activată pentru această platformă."
            : "Nu am putut porni apelul.",
        );
        setStare("eroare");
        return;
      }

      const { Device } = await import("@twilio/voice-sdk");
      const device = new Device(data.token);
      deviceRef.current = device;
      await device.register();

      const call = await device.connect({ params: { To: e164, companyId: companyId ?? "", catreNume: nume ?? "" } });
      callRef.current = call;
      setStare("sunand");

      call.on("accept", () => {
        setStare("activ");
        timerRef.current = setInterval(() => setDurata((d) => d + 1), 1000);
      });
      call.on("disconnect", inchide);
      call.on("cancel", inchide);
      call.on("error", (e) => {
        setEroare(e.message || "Eroare la apel.");
        setStare("eroare");
      });
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu am putut porni apelul.");
      setStare("eroare");
    }
  }

  function toggleMute() {
    if (!callRef.current) return;
    const nou = !muted;
    callRef.current.mute(nou);
    setMuted(nou);
  }

  if (stare === "idle" || stare === "eroare") {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={suna}
          title={`Sună ${telefon}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-green-soft)] hover:text-[var(--ci-green)]"
        >
          <Phone className="h-3.5 w-3.5" />
        </button>
        {eroare && <span className="text-[11px] text-[var(--ci-red)]">{eroare}</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface)] py-1 pr-1 pl-2.5">
      {stare === "conectare" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ci-text-muted)]" />
          <span className="text-[12px] text-[var(--ci-text-muted)]">Se conectează…</span>
        </>
      )}
      {stare === "sunand" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ci-amber)]" />
          <span className="text-[12px] text-[var(--ci-text-muted)]">Sună…</span>
        </>
      )}
      {stare === "activ" && (
        <>
          <span className="ci-tabular text-[12px] font-medium text-[var(--ci-green)]">{formatDurata(durata)}</span>
          <button
            type="button"
            onClick={toggleMute}
            title={muted ? "Activează microfonul" : "Dezactivează microfonul"}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
          >
            {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={inchide}
        title="Închide apelul"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ci-red-soft)] text-[var(--ci-red)] hover:opacity-80"
      >
        <PhoneOff className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
