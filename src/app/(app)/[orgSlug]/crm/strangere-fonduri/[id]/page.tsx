import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { withOrgSession } from "@/lib/auth/guard";
import { fundraisingBeneficiaries, fundraisingBeneficiaryInvites, fundraisingCampaignAgents, fundraisingDonations, fundraisingPages, fundraisingUpdates } from "@/lib/db/schema";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { formatDataOra } from "../../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { AddOfflineDonationButton, AddUpdateButton, CopyPageLinkButton, DeleteUpdateButton, ImageUploadCard, ToggleStatusButton } from "../client";
import { BeneficiarCard } from "../beneficiar-card";
import { AgentCard } from "../agent-card";
import { listMesajeCampanie } from "../agent-actions";
import { MesajeCard } from "../mesaje-card";
import { listCalendarCampanie, listContinutCampanie } from "../continut-actions";
import { CalendarCard } from "../calendar-card";
import { ContinutCard } from "../continut-card";
import {
  listComunicatCampanie,
  listGrupuriPublicateCampanie,
  listLocalGroupsCampanie,
  listMediaContacteCampanie,
  listOutreachIstoric,
} from "../presa-actions";
import { PresaCard } from "../presa-card";
import { GrupuriLocaleCard } from "../grupuri-locale-card";
import { listFacturiCampanie } from "../invoice-actions";
import { FacturiCard } from "../facturi-card";
import { listAttachmentsCampanie, listTaskuriCampanie } from "../task-actions";
import { TaskCard } from "../task-card";
import { listMembers } from "../../../echipa/actions";

const STATUS_TONE = { in_asteptare: "amber", reusita: "green", esuata: "red", rambursata: "orange" } as const;

const getPaginaSiDonatii = withOrgSession(async (ctx, id: string) => {
  const pagina = await ctx.db
    .select()
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.id, id), eq(fundraisingPages.orgId, ctx.orgId)))
    .limit(1);
  if (!pagina[0]) return null;

  const donatii = await ctx.db
    .select()
    .from(fundraisingDonations)
    .where(eq(fundraisingDonations.pageId, id))
    .orderBy(desc(fundraisingDonations.createdAt))
    .limit(300);

  const actualizari = await ctx.db
    .select()
    .from(fundraisingUpdates)
    .where(eq(fundraisingUpdates.pageId, id))
    .orderBy(desc(fundraisingUpdates.createdAt));

  // Fără JOIN pe app_users — staff-ul nu are politică RLS care să-i permită
  // să vadă rândul app_users al beneficiarului; email e denormalizat pe
  // fundraising_beneficiaries la acceptarea invitației (vezi schema).
  const beneficiarRows = await ctx.db
    .select({ id: fundraisingBeneficiaries.id, createdAt: fundraisingBeneficiaries.createdAt, email: fundraisingBeneficiaries.email })
    .from(fundraisingBeneficiaries)
    .where(and(eq(fundraisingBeneficiaries.campaignPageId, id), eq(fundraisingBeneficiaries.status, "activ")))
    .limit(1);

  let inviteActiv = null;
  if (!beneficiarRows[0]) {
    const inviteRows = await ctx.db
      .select()
      .from(fundraisingBeneficiaryInvites)
      .where(and(eq(fundraisingBeneficiaryInvites.campaignPageId, id), eq(fundraisingBeneficiaryInvites.orgId, ctx.orgId)))
      .orderBy(desc(fundraisingBeneficiaryInvites.createdAt))
      .limit(1);
    if (inviteRows[0] && !inviteRows[0].acceptedAt && inviteRows[0].expiresAt.getTime() > Date.now()) {
      inviteActiv = inviteRows[0];
    }
  }

  const agentRows = await ctx.db
    .select({
      id: fundraisingCampaignAgents.id,
      agentUserId: fundraisingCampaignAgents.agentUserId,
      bio: fundraisingCampaignAgents.bio,
      programDisponibilitate: fundraisingCampaignAgents.programDisponibilitate,
      contactAprobat: fundraisingCampaignAgents.contactAprobat,
      nume: fundraisingCampaignAgents.agentNume,
      email: fundraisingCampaignAgents.agentEmail,
    })
    .from(fundraisingCampaignAgents)
    .where(and(eq(fundraisingCampaignAgents.campaignPageId, id), eq(fundraisingCampaignAgents.active, true)))
    .limit(1);

  return { pagina: pagina[0], donatii, actualizari, beneficiar: beneficiarRows[0] ?? null, inviteActiv, agent: agentRows[0] ?? null };
});

export default async function PaginaDetaliuPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const [data, membri, mesaje, calendarItems, continutItems, comunicat, mediaContacte, grupuriLocale, grupuriPublicate, facturi, taskuri, taskAttachments] =
    await Promise.all([
      getPaginaSiDonatii(orgSlug, id),
      listMembers(orgSlug),
      listMesajeCampanie(orgSlug, id),
      listCalendarCampanie(orgSlug, id),
      listContinutCampanie(orgSlug, id),
      listComunicatCampanie(orgSlug, id),
      listMediaContacteCampanie(orgSlug, id),
      listLocalGroupsCampanie(orgSlug, id),
      listGrupuriPublicateCampanie(orgSlug, id),
      listFacturiCampanie(orgSlug, id),
      listTaskuriCampanie(orgSlug, id),
      listAttachmentsCampanie(orgSlug, id),
    ]);
  if (!data) notFound();

  const outreachTrimis = comunicat ? await listOutreachIstoric(orgSlug, comunicat.id) : [];

  const { pagina, donatii, actualizari, beneficiar, inviteActiv, agent } = data;
  const locale = await getLocale();
  const dict = STRANGERE_FONDURI_DICT[locale];
  const dictDetail = dict.detail;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb
        items={[{ label: dict.breadcrumb, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: pagina.titlu }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{pagina.titlu}</h1>
            <Badge tone={pagina.status === "activa" ? "green" : "neutral"} icon={false}>
              {pagina.status === "activa" ? dict.page.activa : dict.page.inchisa}
            </Badge>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {dictDetail.organizatDe(pagina.numeCreator, pagina.emailCreator)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddOfflineDonationButton orgSlug={orgSlug} pageId={pagina.id} />
          <CopyPageLinkButton orgSlug={orgSlug} pageSlug={pagina.slug} />
          <ToggleStatusButton orgSlug={orgSlug} id={pagina.id} status={pagina.status} />
        </div>
      </div>

      <ImageUploadCard orgSlug={orgSlug} pageId={pagina.id} imagineUrl={pagina.imagineUrl} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dictDetail.strans}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{pagina.sumaStransa.toLocaleString("ro-RO")} lei</p>
        </Card>
        {pagina.sumaTinta && (
          <Card>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{dictDetail.tinta}</p>
            <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{pagina.sumaTinta.toLocaleString("ro-RO")} lei</p>
          </Card>
        )}
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dictDetail.donatiiReusite}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-primary)]">
            {donatii.filter((d) => d.status === "reusita").length}
          </p>
        </Card>
      </div>

      <BeneficiarCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        beneficiar={beneficiar ? { id: beneficiar.id, email: beneficiar.email, createdAt: beneficiar.createdAt.toISOString() } : null}
        invite={inviteActiv ? { id: inviteActiv.id, email: inviteActiv.email, token: inviteActiv.token, expiresAt: inviteActiv.expiresAt.toISOString() } : null}
      />

      <AgentCard orgSlug={orgSlug} pageId={pagina.id} agent={agent} membri={membri} />

      <MesajeCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        mesaje={mesaje.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />

      <CalendarCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        items={calendarItems.map((it) => ({ id: it.id, ziua: it.ziua, obiectiv: it.obiectiv, textPregatit: it.textPregatit, status: it.status }))}
      />

      <ContinutCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        items={continutItems.map((it) => ({ id: it.id, canal: it.canal, titlu: it.titlu, textComplet: it.textComplet, status: it.status }))}
      />

      <PresaCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        comunicat={comunicat ? { id: comunicat.id, continut: comunicat.continut, status: comunicat.status } : null}
        contacte={mediaContacte.map((c) => ({ id: c.id, numeRedactie: c.numeRedactie, judet: c.judet, email: c.email, telefon: c.telefon }))}
        trimisIds={outreachTrimis.map((o) => o.mediaContactId)}
      />

      <GrupuriLocaleCard
        orgSlug={orgSlug}
        grupuri={grupuriLocale.map((g) => ({ id: g.id, nume: g.nume, platforma: g.platforma, link: g.link, localitate: g.localitate }))}
        publicateIds={grupuriPublicate}
      />

      <FacturiCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        facturi={facturi.map((f) => ({ id: f.id, denumire: f.denumire, suma: f.suma, categorie: f.categorie, status: f.status, fisierUrl: f.fisierUrl, createdAt: f.createdAt.toISOString() }))}
      />

      <TaskCard
        orgSlug={orgSlug}
        pageId={pagina.id}
        taskuri={taskuri.map((t) => ({
          id: t.id,
          tip: t.tip,
          titlu: t.titlu,
          descriere: t.descriere,
          dataLimita: t.dataLimita,
          status: t.status,
          companie: t.companie,
          suma: t.suma,
          textMultumire: t.textMultumire,
          canalRecomandat: t.canalRecomandat,
        }))}
        attachments={taskAttachments.map((a) => ({ id: a.id, taskId: a.taskId, fisierUrl: a.fisierUrl, denumire: a.denumire }))}
      />

      <Card>
        <CardHeader title={dictDetail.donatori.title} subtitle={dictDetail.donatori.subtitle(donatii.length)} />
        {donatii.length ? (
          <div className="space-y-2">
            {donatii.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">
                    {d.anonim || !d.numeDonator ? dict.page.sustinatorAnonim : d.numeDonator}
                  </p>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {d.emailDonator || dictDetail.faraEmail} · {formatDataOra(d.createdAt.toISOString())}
                    {d.mesaj ? ` · „${d.mesaj}"` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.recurenta && !d.abonamentActiv && (
                    <Badge tone="neutral" icon={false}>
                      {dictDetail.abonamentOprit}
                    </Badge>
                  )}
                  <Badge tone={STATUS_TONE[d.status]} icon={false}>
                    {dictDetail.statusLabel[d.status]}
                  </Badge>
                  <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{d.suma.toLocaleString("ro-RO")} lei</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dictDetail.niciodonatie.title} description={dictDetail.niciodonatie.description} />
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeader title={dictDetail.actualizari.title} subtitle={dictDetail.actualizari.subtitle} />
          <AddUpdateButton orgSlug={orgSlug} pageId={pagina.id} />
        </div>
        {actualizari.length ? (
          <div className="space-y-2">
            {actualizari.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{a.titlu}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[var(--ci-text-muted)]">{a.continut}</p>
                  <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">{formatDataOra(a.createdAt.toISOString())}</p>
                </div>
                <DeleteUpdateButton orgSlug={orgSlug} id={a.id} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dictDetail.nicioActualizare.title} description={dictDetail.nicioActualizare.description} />
        )}
      </Card>
    </div>
  );
}
