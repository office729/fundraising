type Donatie = {
  id: string;
  numeDonator: string | null;
  suma: number;
  anonim: boolean;
  createdAt: Date;
};

function acumRelativ(data: Date): string {
  const secunde = Math.max(0, (Date.now() - data.getTime()) / 1000);
  if (secunde < 60) return "chiar acum";
  const minute = Math.round(secunde / 60);
  if (minute < 60) return `acum ${minute} min`;
  const ore = Math.round(minute / 60);
  if (ore < 24) return `acum ${ore} ${ore === 1 ? "oră" : "ore"}`;
  const zile = Math.round(ore / 24);
  return `acum ${zile} ${zile === 1 ? "zi" : "zile"}`;
}

// Listă compactă, sub butonul de donat — lista completă (cu "Top donatori"
// separat) rămâne mai jos pe pagină; aici e doar un extras rapid, ca omul să
// vadă imediat că alții au donat deja, fără să scroleze.
export function RecentDonationsList({ donatii }: { donatii: Donatie[] }) {
  const extras = donatii.slice(0, 5);

  if (!donatii.length) {
    return (
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Donatori</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-2">
          Nicio donație încă — fii primul care susține această campanie!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
        {donatii.length} {donatii.length === 1 ? "donație" : "donații"}
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {extras.map((d) => {
          const nume = d.anonim || !d.numeDonator ? "Susținător anonim" : d.numeDonator;
          return (
            <div key={d.id} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-[13px] font-bold text-brand-blue">
                {nume.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{nume}</p>
                <p className="text-[11.5px] text-muted-2">
                  {d.suma.toLocaleString("ro-RO")} lei · {acumRelativ(d.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {donatii.length > extras.length && (
        <a href="#toate-donatiile" className="mt-3 inline-block text-[12.5px] font-bold text-brand-blue hover:underline">
          Vezi toate donațiile →
        </a>
      )}
    </div>
  );
}
