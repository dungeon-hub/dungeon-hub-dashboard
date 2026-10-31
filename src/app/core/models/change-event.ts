import type {
	CarryDifficultyModel,
	CarryQueueModel,
	CarryTierModel,
	CarryTypeModel,
	ReputationModel,
	ScoreModel,
	StaticMessageModel,
	TicketModel,
	TicketPanelModel,
} from "@dungeon-hub/api-client";

/**
 * The models of all entity types whose changes are pushed through the change stream, see docs/sse-events.md in the
 * dungeon-hub-api repository.
 */
export interface ChangeEventModels {
	Ticket: TicketModel;
	StaticMessage: StaticMessageModel;
	CarryQueue: CarryQueueModel;
	CarryType: CarryTypeModel;
	CarryTier: CarryTierModel;
	CarryDifficulty: CarryDifficultyModel;
	TicketPanel: TicketPanelModel;
	Score: ScoreModel;
	Reputation: ReputationModel;
}

export type ChangeEventType = keyof ChangeEventModels;

export const CHANGE_EVENT_TYPES: readonly ChangeEventType[] = [
	"Ticket",
	"StaticMessage",
	"CarryQueue",
	"CarryType",
	"CarryTier",
	"CarryDifficulty",
	"TicketPanel",
	"Score",
	"Reputation",
];

export type ChangeAction = "Created" | "Updated" | "Deleted";

export interface ChangeEvent<T extends ChangeEventType = ChangeEventType> {
	type: T;
	action: ChangeAction;
	/** The server the entity belongs to, null if it doesn't belong to one. */
	serverId: string | null;
	/** The entity after the change, or its last state if it was deleted. */
	data: ChangeEventModels[T];
}

/**
 * Either a change, or the signal that the stream was (re)connected. Changes that happened while the stream was
 * disconnected aren't replayed, so the state should be reloaded on every connect.
 */
export type ChangeStreamEvent =
	| { kind: "connected" }
	| { kind: "change"; change: ChangeEvent };

export function isChangeOfType<T extends ChangeEventType>(
	change: ChangeEvent,
	type: T,
): change is ChangeEvent<T> {
	return change.type === type;
}
