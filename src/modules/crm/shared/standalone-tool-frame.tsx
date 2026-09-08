// Instrument portat EXACT ca la CRM PJ (design neatins) — rulat într-un
// iframe srcDoc (aceeași origine → localStorage propriu, izolat per tool).
// Spre deosebire de editor.tsx-ul lui CRM PJ, aceste instrumente NU au
// placeholder-e de organizație/rol de înlocuit — HTML-ul se randează direct,
// fără să fie nevoie de client-side state/effect.
export function StandaloneToolFrame({ html, title }: { html: string; title: string }) {
  return (
    <div className="h-full">
      <iframe srcDoc={html} title={title} className="h-full w-full border-0" />
    </div>
  );
}
