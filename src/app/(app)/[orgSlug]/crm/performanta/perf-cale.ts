import { usePathname } from "next/navigation";

// Adresa de bază a modulului Echipă & Performanță. În modul demonstrativ (…/performanta/demo) toate legăturile rămân în demo.
export const esteDemoPath = (pathname: string) => /\/performanta\/demo(\/|$)/.test(pathname);

export function useCalePerf(orgSlug: string): { demo: boolean; baza: string } {
  const pathname = usePathname() ?? "";
  const demo = esteDemoPath(pathname);
  return { demo, baza: `/${orgSlug}/crm/performanta${demo ? "/demo" : ""}` };
}
