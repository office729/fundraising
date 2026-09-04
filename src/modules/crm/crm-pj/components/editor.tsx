"use client";

import { useEffect, useState } from "react";

import { CRM_PJ_HTML } from "../crm-pj-html";

// Tool-ul CRM PJ, portat EXACT ca în SOI_CRM (design neatins), rulat într-un
// iframe srcDoc (aceeași origine → localStorage propriu). Orgul și rolul se
// injectează prin înlocuire de placeholder-e în HTML (nu prin postMessage),
// simplu și robust — vezi placeholder-ele __FA_ORG_SLUG__/__FA_ORG_ROLE__ din
// crm-pj.base.html. Numele logat merge în localStorage; tool-ul îl citește la
// boot (config.eu) pentru „alocat către" etc.
export function Editor({
  orgSlug,
  orgRole,
  userName,
}: {
  orgSlug: string;
  orgRole: string;
  userName: string;
}) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (userName) localStorage.setItem("soi-crm-loginname", userName);
    } catch {
      // ignoră
    }
    const html = CRM_PJ_HTML.replaceAll("__FA_ORG_SLUG__", orgSlug).replaceAll(
      "__FA_ORG_ROLE__",
      orgRole,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrcDoc(html);
  }, [orgSlug, orgRole, userName]);

  return (
    <div className="h-full">
      {srcDoc ? (
        <iframe srcDoc={srcDoc} title="CRM Persoane Juridice" className="h-full w-full border-0" />
      ) : null}
    </div>
  );
}
