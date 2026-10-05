import { escHtml } from "@/lib/html-escape";

// Emailul trimis automat către cel invitat într-o organizație (vezi
// [orgSlug]/echipa/actions.ts) — linkul e valabil 7 zile.

export function subiectInvitatie(orgName: string): string {
  return `Invitație în ${orgName} pe Alexandrit`;
}

export function htmlInvitatie(params: { orgName: string; invitatDe: string | null; rol: "admin" | "member"; link: string }): string {
  const orgName = escHtml(params.orgName);
  const cine = params.invitatDe ? `${escHtml(params.invitatDe)} te-a invitat` : "Ai fost invitat(ă)";
  const rol = params.rol === "admin" ? "administrator" : "membru";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>
        ${cine} să te alături organizației <strong>${orgName}</strong> pe Alexandrit, ca ${rol}.
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${escHtml(params.link)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Acceptă invitația
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">Linkul e valabil 7 zile. Dacă nu te așteptai la această invitație, poți ignora emailul.</p>
    </div>
  `;
}
