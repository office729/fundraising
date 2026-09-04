// Șablonul emailului de reamintire pentru Formularul 230 — separat de
// campanie-email-actions.ts ("use server") pentru că acel fișier poate
// exporta DOAR server actions (funcții async) — funcțiile simple ca acestea
// ar bloca build-ul. Folosit atât de trimiterea manuală, cât și de cron.
export function subiectEmailF230(orgName: string): string {
  return `Redirecționează 3,5% din impozit către ${orgName} — nu te costă nimic`;
}

export function htmlEmailF230(orgName: string, numeDonator: string, link: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună, ${numeDonator}!</p>
      <p>
        Ne-ai fost alături anul acesta și îți mulțumim. Ai putea să ne mai susții,
        fără să te coste nimic — banii sunt oricum reținuți din salariu de stat —
        redirecționând 3,5% din impozitul pe venit către <strong>${orgName}</strong>.
      </p>
      <p>Durează câteva minute, online, cu semnătură electronică:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Completează Formularul 230
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">
        Dacă linkul de mai sus nu funcționează, copiază-l direct în browser: ${link}
      </p>
    </div>
  `;
}
