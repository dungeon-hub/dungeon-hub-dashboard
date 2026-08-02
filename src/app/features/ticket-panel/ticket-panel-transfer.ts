import { TicketPanelCreationModel, TicketPanelModel } from '@dungeon-hub/api-client';

export const TICKET_PANEL_EXPORT_VERSION = 1;

export interface TicketPanelExport {
  version: number;
  panel: TicketPanelCreationModel;
}

/** Builds a detached creation model so transfer operations can never mutate the source panel. */
export function toTicketPanelCreation(panel: TicketPanelModel): TicketPanelCreationModel {
  return structuredClone({
    name: panel.name,
    displayName: panel.displayName,
    emoji: panel.emoji,
    closeable: panel.closeable,
    closeConfirmation: panel.closeConfirmation,
    claimable: panel.claimable,
    openChannelName: panel.openChannelName,
    claimedChannelName: panel.claimedChannelName,
    closedChannelName: panel.closedChannelName,
    transcriptChannel: panel.transcriptChannel?.id,
    ticketMessage: panel.ticketMessage,
    requiresLinking: panel.requiresLinking,
    closeTranscriptTarget: panel.closeTranscriptTarget,
    deleteTranscriptTarget: panel.deleteTranscriptTarget,
    userTranscriptDm: panel.userTranscriptDm,
    formQuestions: panel.formQuestions,
    relatedCarryTier: panel.relatedCarryTier?.id,
    relatedCarryDifficulty: panel.relatedCarryDifficulty?.id,
    supportRoles: panel.supportRoles?.map((role) => role.id),
    additionalRoles: panel.additionalRoles?.map((role) => role.id),
    openCategories: panel.openCategories,
    closedCategories: panel.closedCategories,
    permissions: panel.permissions,
  });
}

export function exportTicketPanel(panel: TicketPanelModel): TicketPanelExport {
  return { version: TICKET_PANEL_EXPORT_VERSION, panel: toTicketPanelCreation(panel) };
}

export function parseTicketPanelExport(contents: string): TicketPanelCreationModel {
  const parsed = JSON.parse(contents) as TicketPanelExport;
  if (parsed?.version !== TICKET_PANEL_EXPORT_VERSION || !parsed.panel?.name) {
    throw new Error('This is not a supported ticket panel export.');
  }
  return structuredClone(parsed.panel);
}

export function hasDuplicatePanelName(
  panels: Pick<TicketPanelModel, 'name' | 'displayName'>[],
  name: string,
  displayName: string,
): boolean {
  const normalizedName = name.trim().toLocaleLowerCase();
  const normalizedDisplayName = displayName.trim().toLocaleLowerCase();
  return panels.some(
    (panel) =>
      panel.name.trim().toLocaleLowerCase() === normalizedName ||
      (!!normalizedDisplayName &&
        panel.displayName?.trim().toLocaleLowerCase() === normalizedDisplayName),
  );
}
