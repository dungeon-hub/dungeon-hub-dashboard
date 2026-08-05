import type {
	TicketPanelCreationModel,
	TicketPanelModel,
	TicketPanelUpdateModel,
} from "@dungeon-hub/api-client";

export const TICKET_PANEL_EXPORT_VERSION = 1;

export interface TicketPanelExport {
	version: number;
	id?: string;
	name?: string;
	server?: string;
	panel: TicketPanelCreationModel;
}

export interface TicketPanelImport {
	id?: string;
	name?: string;
	server?: string;
	panel: TicketPanelCreationModel;
}

export interface TicketPanelBackup {
	version: number;
	panels: TicketPanelExport[];
}

type UntrustedTicketPanel = Partial<
	Record<keyof TicketPanelCreationModel, unknown>
>;

interface UntrustedTicketPanelExport {
	version?: unknown;
	id?: unknown;
	name?: unknown;
	server?: unknown;
	panel?: unknown;
	panels?: unknown;
}

const TRANSCRIPT_TARGETS = new Set([
	"None",
	"User",
	"TranscriptChannel",
	"Both",
]);
const FORM_TYPES = new Set([
	"Predefined",
	"TextInput",
	"StringSelect",
	"TextDisplay",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
	return value === undefined || typeof value === "string";
}

function isNullableOptionalString(
	value: unknown,
): value is string | null | undefined {
	return value == null || typeof value === "string";
}

function isOptionalExportId(
	value: unknown,
): value is string | number | undefined {
	return (
		value === undefined ||
		typeof value === "string" ||
		typeof value === "number"
	);
}

function isNullableOptionalStringOrNumber(
	value: unknown,
): value is string | number | null | undefined {
	return (
		value == null || typeof value === "string" || typeof value === "number"
	);
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
	return (
		value == null ||
		(Array.isArray(value) && value.every((item) => typeof item === "string"))
	);
}

function isFormQuestions(value: unknown): boolean {
	return (
		value == null ||
		(Array.isArray(value) &&
			value.every(
				(question) =>
					isRecord(question) &&
					typeof question["type"] === "string" &&
					FORM_TYPES.has(question["type"]) &&
					typeof question["data"] === "string",
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
					Object.values(permission).every(
						(bitSet) =>
							typeof bitSet === "string" || typeof bitSet === "number",
					),
			))
	);
}

function undefinedIfNull<T>(value: T | null | undefined): T | undefined {
	return value ?? undefined;
}

function stringIfNotNull(
	value: string | number | null | undefined,
): string | undefined {
	return value == null ? undefined : String(value);
}

function normalizePermissions(
	permissions: TicketPanelCreationModel["permissions"] | null | undefined,
): TicketPanelCreationModel["permissions"] | undefined {
	if (permissions == null) return undefined;
	return Object.fromEntries(
		Object.entries(permissions).map(([scope, values]) => [
			scope,
			Object.fromEntries(
				Object.entries(values).map(([state, bitSet]) => [
					state,
					String(bitSet),
				]),
			),
		]),
	);
}

function normalizePanelName(name: string): string {
	return name.trim().toLowerCase();
}

const ticketPanelFieldValidators = {
	name: (value: unknown) => typeof value === "string" && !!value.trim(),
	displayName: isNullableOptionalString,
	emoji: isNullableOptionalString,
	closeable: (value: unknown) => typeof value === "boolean",
	closeConfirmation: (value: unknown) => typeof value === "boolean",
	claimable: (value: unknown) => typeof value === "boolean",
	openChannelName: isNullableOptionalString,
	claimedChannelName: isNullableOptionalString,
	closedChannelName: isNullableOptionalString,
	transcriptChannel: isNullableOptionalString,
	ticketMessage: isNullableOptionalString,
	requiresLinking: (value: unknown) => typeof value === "boolean",
	closeTranscriptTarget: (value: unknown) =>
		value == null ||
		(typeof value === "string" && TRANSCRIPT_TARGETS.has(value)),
	deleteTranscriptTarget: (value: unknown) =>
		value == null ||
		(typeof value === "string" && TRANSCRIPT_TARGETS.has(value)),
	userTranscriptDm: isNullableOptionalString,
	formQuestions: isFormQuestions,
	relatedCarryTier: isNullableOptionalStringOrNumber,
	relatedCarryDifficulty: isNullableOptionalStringOrNumber,
	supportRoles: isOptionalStringArray,
	additionalRoles: isOptionalStringArray,
	openCategories: isOptionalStringArray,
	closedCategories: isOptionalStringArray,
	permissions: isPermissions,
} satisfies Record<keyof TicketPanelCreationModel, (value: unknown) => boolean>;

function copyTicketPanelCreation(
	panel: TicketPanelCreationModel,
): TicketPanelCreationModel {
	return structuredClone({
		name: panel.name,
		displayName: undefinedIfNull(panel.displayName),
		emoji: undefinedIfNull(panel.emoji),
		closeable: panel.closeable,
		closeConfirmation: panel.closeConfirmation,
		claimable: panel.claimable,
		openChannelName: undefinedIfNull(panel.openChannelName),
		claimedChannelName: undefinedIfNull(panel.claimedChannelName),
		closedChannelName: undefinedIfNull(panel.closedChannelName),
		transcriptChannel: undefinedIfNull(panel.transcriptChannel),
		ticketMessage: undefinedIfNull(panel.ticketMessage),
		requiresLinking: panel.requiresLinking,
		closeTranscriptTarget: undefinedIfNull(panel.closeTranscriptTarget),
		deleteTranscriptTarget: undefinedIfNull(panel.deleteTranscriptTarget),
		userTranscriptDm: undefinedIfNull(panel.userTranscriptDm),
		formQuestions: undefinedIfNull(panel.formQuestions),
		relatedCarryTier: stringIfNotNull(panel.relatedCarryTier),
		relatedCarryDifficulty: stringIfNotNull(panel.relatedCarryDifficulty),
		supportRoles: undefinedIfNull(panel.supportRoles),
		additionalRoles: undefinedIfNull(panel.additionalRoles),
		openCategories: undefinedIfNull(panel.openCategories),
		closedCategories: undefinedIfNull(panel.closedCategories),
		permissions: normalizePermissions(panel.permissions),
	} satisfies TicketPanelCreationModel &
		Record<keyof TicketPanelCreationModel, unknown>);
}

/** Builds a detached creation model so transfer operations can never mutate the source panel. */
export function toTicketPanelCreation(
	panel: TicketPanelModel,
): TicketPanelCreationModel {
	return structuredClone({
		name: panel.name,
		displayName: undefinedIfNull(panel.displayName),
		emoji: undefinedIfNull(panel.emoji),
		closeable: panel.closeable,
		closeConfirmation: panel.closeConfirmation,
		claimable: panel.claimable,
		openChannelName: undefinedIfNull(panel.openChannelName),
		claimedChannelName: undefinedIfNull(panel.claimedChannelName),
		closedChannelName: undefinedIfNull(panel.closedChannelName),
		transcriptChannel: panel.transcriptChannel?.id,
		ticketMessage: undefinedIfNull(panel.ticketMessage),
		requiresLinking: panel.requiresLinking,
		closeTranscriptTarget: undefinedIfNull(panel.closeTranscriptTarget),
		deleteTranscriptTarget: undefinedIfNull(panel.deleteTranscriptTarget),
		userTranscriptDm: undefinedIfNull(panel.userTranscriptDm),
		formQuestions: panel.formQuestions,
		relatedCarryTier: panel.relatedCarryTier?.id,
		relatedCarryDifficulty: panel.relatedCarryDifficulty?.id,
		supportRoles: panel.supportRoles?.map((role) => role.id),
		additionalRoles: panel.additionalRoles?.map((role) => role.id),
		openCategories: panel.openCategories,
		closedCategories: panel.closedCategories,
		permissions: panel.permissions,
	} satisfies TicketPanelCreationModel &
		Record<keyof TicketPanelCreationModel, unknown>);
}

export function exportTicketPanel(panel: TicketPanelModel): TicketPanelExport {
	return {
		version: TICKET_PANEL_EXPORT_VERSION,
		id: panel.id,
		name: panel.name,
		server: panel.discordServer.id,
		panel: toTicketPanelCreation(panel),
	};
}

export function serializeTicketPanel(panel: TicketPanelModel): string {
	return JSON.stringify(exportTicketPanel(panel), null, 2);
}

export function exportTicketPanels(
	panels: TicketPanelModel[],
): TicketPanelBackup {
	return {
		version: TICKET_PANEL_EXPORT_VERSION,
		panels: panels.map((panel) => exportTicketPanel(panel)),
	};
}

export function serializeTicketPanels(panels: TicketPanelModel[]): string {
	return JSON.stringify(exportTicketPanels(panels), null, 2);
}

export function isTicketPanelExport(contents: string): boolean {
	try {
		parseTicketPanelExports(contents);
		return true;
	} catch {
		return false;
	}
}

export function parseTicketPanelExports(contents: string): TicketPanelImport[] {
	const parsed: unknown = JSON.parse(contents);
	const exports = Array.isArray(parsed) ? parsed : getBackupPanels(parsed);
	if (exports) {
		if (exports.length === 0) {
			throw new Error("This is not a supported ticket panel export.");
		}
		return exports.map((panelExport) =>
			parseTicketPanelExportValue(panelExport),
		);
	}
	return [parseTicketPanelExportValue(parsed)];
}

function getBackupPanels(parsed: unknown): unknown[] | undefined {
	if (!isRecord(parsed)) return undefined;
	const candidate = parsed as UntrustedTicketPanelExport;
	if (candidate.panels === undefined) return undefined;
	if (
		candidate.version !== TICKET_PANEL_EXPORT_VERSION ||
		!Array.isArray(candidate.panels)
	) {
		throw new Error("This is not a supported ticket panel export.");
	}
	return candidate.panels;
}

export function parseTicketPanelExport(contents: string): TicketPanelImport {
	const imports = parseTicketPanelExports(contents);
	if (imports.length !== 1) {
		throw new Error("This is not a supported ticket panel export.");
	}
	return imports[0];
}

function parseTicketPanelExportValue(parsed: unknown): TicketPanelImport {
	if (!isRecord(parsed)) {
		throw new Error("This is not a supported ticket panel export.");
	}
	const candidate = parsed as UntrustedTicketPanelExport;
	if (!isRecord(candidate.panel)) {
		throw new Error("This is not a supported ticket panel export.");
	}
	const panel = candidate.panel as UntrustedTicketPanel;
	const hasInvalidPanelField = Object.entries(ticketPanelFieldValidators).some(
		([field, validate]) =>
			!validate(panel[field as keyof TicketPanelCreationModel]),
	);
	if (
		candidate.version !== TICKET_PANEL_EXPORT_VERSION ||
		!isOptionalExportId(candidate.id) ||
		!isOptionalString(candidate.name) ||
		!isOptionalString(candidate.server) ||
		hasInvalidPanelField ||
		typeof panel.name !== "string" ||
		(candidate.name !== undefined &&
			normalizePanelName(candidate.name) !== normalizePanelName(panel.name))
	) {
		throw new Error("This is not a supported ticket panel export.");
	}
	return {
		id: candidate.id === undefined ? undefined : String(candidate.id),
		name: panel.name,
		server: candidate.server,
		panel: copyTicketPanelCreation(
			panel as unknown as TicketPanelCreationModel,
		),
	};
}

export function findImportConflict(
	panels: TicketPanelModel[],
	imported: Pick<TicketPanelImport, "id" | "name">,
): TicketPanelModel | undefined {
	if (!imported.name) return undefined;
	const importedName = normalizePanelName(imported.name);
	const nameMatch = (panel: Pick<TicketPanelModel, "name">) =>
		normalizePanelName(panel.name) === importedName;
	if (imported.id) {
		const exactMatch = panels.find(
			(panel) => String(panel.id) === imported.id && nameMatch(panel),
		);
		if (exactMatch) return exactMatch;
	}
	return panels.find(nameMatch);
}

type ServerBoundTicketPanelField =
	| "transcriptChannel"
	| "relatedCarryTier"
	| "relatedCarryDifficulty"
	| "supportRoles"
	| "additionalRoles"
	| "openCategories"
	| "closedCategories";

export const SERVER_BOUND_TICKET_PANEL_FIELDS: ReadonlySet<ServerBoundTicketPanelField> =
	new Set([
		"transcriptChannel",
		"relatedCarryTier",
		"relatedCarryDifficulty",
		"supportRoles",
		"additionalRoles",
		"openCategories",
		"closedCategories",
	]);

export function detachServerBoundFields(
	panel: TicketPanelCreationModel,
): TicketPanelCreationModel {
	const detached = structuredClone(panel);
	for (const field of SERVER_BOUND_TICKET_PANEL_FIELDS) delete detached[field];
	return detached;
}

/** Converts imported settings into an update, including resets for omitted optional values. */
export function toTicketPanelUpdate(
	panel: TicketPanelCreationModel,
	preservedFields: ReadonlySet<ServerBoundTicketPanelField> = new Set(),
): TicketPanelUpdateModel {
	const update: Partial<TicketPanelUpdateModel> = {
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
	if (preservedFields.has("transcriptChannel")) {
		delete update.transcriptChannel;
		delete update.resetTranscriptChannel;
	}
	if (preservedFields.has("relatedCarryTier")) {
		delete update.relatedCarryTier;
		delete update.resetRelatedCarryTier;
	}
	if (preservedFields.has("relatedCarryDifficulty")) {
		delete update.relatedCarryDifficulty;
		delete update.resetRelatedCarryDifficulty;
	}
	if (preservedFields.has("supportRoles")) delete update.supportRoles;
	if (preservedFields.has("additionalRoles")) delete update.additionalRoles;
	if (preservedFields.has("openCategories")) delete update.openCategories;
	if (preservedFields.has("closedCategories")) delete update.closedCategories;
	return update as TicketPanelUpdateModel;
}

export function hasDuplicatePanelName(
	panels: Pick<TicketPanelModel, "name" | "displayName">[],
	name: string,
	displayName: string,
): boolean {
	const normalizedName = normalizePanelName(name);
	const normalizedDisplayName = normalizePanelName(displayName);
	return panels.some(
		(panel) =>
			normalizePanelName(panel.name) === normalizedName ||
			(!!normalizedDisplayName &&
				(panel.displayName == null
					? undefined
					: normalizePanelName(panel.displayName)) === normalizedDisplayName),
	);
}
