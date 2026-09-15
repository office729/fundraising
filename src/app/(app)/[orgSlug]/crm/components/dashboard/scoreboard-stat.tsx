// Bloc "scoreboard" — familia îndrăzneț-dinamic (Sport/Educație): cifră mare,
// fără card boxat/umbră, gen panou de scor — energic, nu un tile generic.
export function ScoreboardStat({ label, value, tone = "light" }: { label: string; value: string; tone?: "light" | "dark" }) {
  return (
    <div className="flex flex-col">
      <p
        className={`ci-display ci-tabular text-[28px] leading-none font-extrabold ${
          tone === "dark" ? "text-white" : "text-[var(--ci-text)]"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-1.5 text-[11px] font-bold tracking-wide uppercase ${
          tone === "dark" ? "text-white/70" : "text-[var(--ci-text-muted)]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
