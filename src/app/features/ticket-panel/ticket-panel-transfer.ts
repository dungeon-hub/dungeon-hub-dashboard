import {
  TicketPanelCreationModel,
  TicketPanelModel,
  TicketPanelUpdateModel,
} from '@dungeon-hub/api-client';

export const TICKET_PANEL_EXPORT_VERSION = 1;

export interface TicketPanelExport {
  version: number;
  id?: string;
  name?: string;
  panel: TicketPanelCreationModel;
}

export interface TicketPanelImport {
  id?: string;
  name?: string;
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
  return {
    version: TICKET_PANEL_EXPORT_VERSION,
    id: panel.id,
    name: panel.name,
    panel: toTicketPanelCreation(panel),
  };
}

export function serializeTicketPanel(panel: TicketPanelModel): string {
  return JSON.stringify(exportTicketPanel(panel), null, 2);
}

export function isTicketPanelExport(contents: string): boolean {
  try {
    parseTicketPanelExport(contents);
    return true;
  } catch {
    return false;
  }
}

export function parseTicketPanelExport(contents: string): TicketPanelImport {
  const parsed = JSON.parse(contents) as TicketPanelExport;
  const panel = parsed?.panel;
  const invalidPermissions =
    panel?.permissions != null &&
    (typeof panel.permissions !== 'object' || Array.isArray(panel.permissions));
  if (
    parsed?.version !== TICKET_PANEL_EXPORT_VERSION ||
    typeof panel?.name !== 'string' ||
    !panel.name.trim() ||
    typeof panel.closeable !== 'boolean' ||
    typeof panel.closeConfirmation !== 'boolean' ||
    typeof panel.claimable !== 'boolean' ||
    typeof panel.requiresLinking !== 'boolean' ||
    (panel.formQuestions != null && !Array.isArray(panel.formQuestions)) ||
    (panel.supportRoles != null && !Array.isArray(panel.supportRoles)) ||
    (panel.additionalRoles != null && !Array.isArray(panel.additionalRoles)) ||
    (panel.openCategories != null && !Array.isArray(panel.openCategories)) ||
    (panel.closedCategories != null && !Array.isArray(panel.closedCategories)) ||
    invalidPermissions
  ) {
    throw new Error('This is not a supported ticket panel export.');
  }
  return structuredClone({ id: parsed.id, name: parsed.name, panel: parsed.panel });
}

export function findImportConflict(
  panels: TicketPanelModel[],
  imported: Pick<TicketPanelImport, 'id' | 'name'>,
): TicketPanelModel | undefined {
  if (!imported.id || !imported.name) return undefined;
  return panels.find((panel) => panel.id === imported.id && panel.name === imported.name);
}

/** Converts every imported setting into an update, including resets for omitted optional values. */
export function toTicketPanelUpdate(panel: TicketPanelCreationModel): TicketPanelUpdateModel {
  return {
    ...structuredClone(panel),
    resetDisplayName: panel.displayName == null,
    resetEmoji: panel.emoji == null,
    resetOpenChannelName: panel.openChannelName == null,
    resetClaimedChannelName: panel.claimedChannelName == null,
    resetClosedChannelName: panel.closedChannelName == null,
    resetTranscriptChannel: panel.transcriptChannel == null,
    resetTicketMessage: panel.ticketMessage == null,
    resetUserTranscriptDm: panel.userTranscriptDm == null,
    resetRelatedCarryTier: panel.relatedCarryTier == null,
    resetRelatedCarryDifficulty: panel.relatedCarryDifficulty == null,
  };
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
