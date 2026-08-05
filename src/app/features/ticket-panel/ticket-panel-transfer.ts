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

type UntrustedTicketPanel = Partial<Record<keyof TicketPanelCreationModel, unknown>>;

interface UntrustedTicketPanelExport {
  version?: unknown;
  id?: unknown;
  name?: unknown;
  panel?: unknown;
}

const TRANSCRIPT_TARGETS = new Set(['None', 'User', 'TranscriptChannel', 'Both']);
const FORM_TYPES = new Set(['Predefined', 'TextInput', 'StringSelect', 'TextDisplay']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value == null || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function isFormQuestions(value: unknown): boolean {
  return (
    value == null ||
    (Array.isArray(value) &&
      value.every(
        (question) =>
          isRecord(question) &&
          typeof question['type'] === 'string' &&
          FORM_TYPES.has(question['type']) &&
          typeof question['data'] === 'string',
      ))
  );
}

function isPermissions(value: unknown): boolean {
  return (
    value == null ||
    (isRecord(value) &&
      Object.values(value).every(
        (permission) =>
          isRecord(permission) &&
          Object.values(permission).every((bitSet) => typeof bitSet === 'string'),
      ))
  );
}

const ticketPanelFieldValidators = {
  name: (value: unknown) => typeof value === 'string' && !!value.trim(),
  displayName: isOptionalString,
  emoji: isOptionalString,
  closeable: (value: unknown) => typeof value === 'boolean',
  closeConfirmation: (value: unknown) => typeof value === 'boolean',
  claimable: (value: unknown) => typeof value === 'boolean',
  openChannelName: isOptionalString,
  claimedChannelName: isOptionalString,
  closedChannelName: isOptionalString,
  transcriptChannel: isOptionalString,
  ticketMessage: isOptionalString,
  requiresLinking: (value: unknown) => typeof value === 'boolean',
  closeTranscriptTarget: (value: unknown) =>
    value === undefined || (typeof value === 'string' && TRANSCRIPT_TARGETS.has(value)),
  deleteTranscriptTarget: (value: unknown) =>
    value === undefined || (typeof value === 'string' && TRANSCRIPT_TARGETS.has(value)),
  userTranscriptDm: isOptionalString,
  formQuestions: isFormQuestions,
  relatedCarryTier: isOptionalString,
  relatedCarryDifficulty: isOptionalString,
  supportRoles: isOptionalStringArray,
  additionalRoles: isOptionalStringArray,
  openCategories: isOptionalStringArray,
  closedCategories: isOptionalStringArray,
  permissions: isPermissions,
} satisfies Record<keyof TicketPanelCreationModel, (value: unknown) => boolean>;

function copyTicketPanelCreation(panel: TicketPanelCreationModel): TicketPanelCreationModel {
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
    transcriptChannel: panel.transcriptChannel,
    ticketMessage: panel.ticketMessage,
    requiresLinking: panel.requiresLinking,
    closeTranscriptTarget: panel.closeTranscriptTarget,
    deleteTranscriptTarget: panel.deleteTranscriptTarget,
    userTranscriptDm: panel.userTranscriptDm,
    formQuestions: panel.formQuestions,
    relatedCarryTier: panel.relatedCarryTier,
    relatedCarryDifficulty: panel.relatedCarryDifficulty,
    supportRoles: panel.supportRoles,
    additionalRoles: panel.additionalRoles,
    openCategories: panel.openCategories,
    closedCategories: panel.closedCategories,
    permissions: panel.permissions,
  } satisfies TicketPanelCreationModel & Record<keyof TicketPanelCreationModel, unknown>);
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
  } satisfies TicketPanelCreationModel & Record<keyof TicketPanelCreationModel, unknown>);
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
  const parsed: unknown = JSON.parse(contents);
  if (!isRecord(parsed)) {
    throw new Error('This is not a supported ticket panel export.');
  }
  const candidate = parsed as UntrustedTicketPanelExport;
  if (!isRecord(candidate.panel)) {
    throw new Error('This is not a supported ticket panel export.');
  }
  const panel = candidate.panel as UntrustedTicketPanel;
  const hasInvalidPanelField = Object.entries(ticketPanelFieldValidators).some(
    ([field, validate]) => !validate(panel[field as keyof TicketPanelCreationModel]),
  );
  if (
    candidate.version !== TICKET_PANEL_EXPORT_VERSION ||
    !isOptionalString(candidate.id) ||
    !isOptionalString(candidate.name) ||
    hasInvalidPanelField ||
    (candidate.name !== undefined && candidate.name !== panel.name) ||
    typeof panel.name !== 'string'
  ) {
    throw new Error('This is not a supported ticket panel export.');
  }
  return {
    id: candidate.id,
    name: candidate.name,
    panel: copyTicketPanelCreation(panel as unknown as TicketPanelCreationModel),
  };
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
