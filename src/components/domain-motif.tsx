import type { MotifId } from "@/lib/campaign-templates";

// Iconițe decorative, una per domeniu de activitate — randate în puncte
// PUȚINE, de mare vizibilitate (antetul CRM, bannerul de bun-venit, hero-ul
// paginii publice de campanie), nu peste tot. "altele" nu are motiv (rămâne
// neutru) — vezi lib/campaign-templates.ts.
export function DomainMotif({ motiv, className = "h-5 w-5" }: { motiv: MotifId; className?: string }) {
  if (!motiv) return null;
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (motiv) {
    case "balon":
      return (
        <svg {...props} fill="currentColor" stroke="none" aria-hidden="true">
          <path d="M12 2l2.9 6.9 7.5.6-5.7 5 1.7 7.4L12 18l-6.4 3.9L7.3 14.5l-5.7-5 7.5-.6L12 2z" />
        </svg>
      );
    case "puls":
      return (
        <svg {...props} fill="currentColor" stroke="none" aria-hidden="true">
          <path d="M12 21s-7.5-4.5-9.5-9.5C1 7.5 3.5 4 7 4c2 0 3.5 1 5 2.7C13.5 5 15 4 17 4c3.5 0 6 3.5 4.5 7.5C19.5 16.5 12 21 12 21z" />
        </svg>
      );
    case "incluziune":
      return (
        <svg {...props} aria-hidden="true">
          <circle cx="9" cy="12" r="6" />
          <circle cx="15" cy="12" r="6" />
        </svg>
      );
    case "laba":
      return (
        <svg {...props} fill="currentColor" stroke="none" aria-hidden="true">
          <ellipse cx="12" cy="16" rx="5" ry="4" />
          <circle cx="5.5" cy="9" r="2.1" />
          <circle cx="10" cy="5.8" r="2.1" />
          <circle cx="14.5" cy="5.8" r="2" />
          <circle cx="18.2" cy="9" r="2" />
        </svg>
      );
    case "frunza":
      return (
        <svg {...props} fill="currentColor" stroke="none" aria-hidden="true">
          <path d="M12 21C7 17 4 12.5 4 8a8 8 0 0 1 16 0c0 4.5-3 9-8 13z" />
        </svg>
      );
    case "minge":
      return (
        <svg {...props} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" opacity=".55" />
        </svg>
      );
    case "absolvire":
      return (
        <svg {...props} aria-hidden="true">
          <polygon points="12,4 22,9 12,14 2,9" fill="currentColor" stroke="none" />
          <path d="M6 11v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
        </svg>
      );
    case "paleta":
      return (
        <svg {...props} fill="currentColor" stroke="none" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.8 2-1.8 0-.5-.2-.9-.4-1.3-.2-.4-.4-.8-.4-1.2 0-.8.6-1.4 1.4-1.4H17a4 4 0 0 0 4-4c0-4.8-4-8.3-9-8.3z" />
          <circle cx="7.5" cy="10.5" r="1.3" fill="var(--panel)" />
          <circle cx="10.5" cy="7" r="1.3" fill="var(--panel)" />
          <circle cx="15" cy="7.5" r="1.3" fill="var(--panel)" />
          <circle cx="17" cy="11.5" r="1.3" fill="var(--panel)" />
        </svg>
      );
    default:
      return null;
  }
}
