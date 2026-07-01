import {StaticMessageCreationModel} from '@dungeon-hub/api-client';

export type StaticMessageType = StaticMessageCreationModel.StaticMessageTypeEnum;

export const STATIC_MESSAGE_TYPE_LABELS = {
  ScoreLeaderboard: 'Score Leaderboard',
  TotalLeaderboard: 'Total Leaderboard',
  ReputationLeaderboard: 'Reputation Leaderboard',
  TicketPanel: 'Ticket Panel',
  PriceMessage: 'Price Message'
} satisfies Record<StaticMessageType, string>;

export const STATIC_MESSAGE_TYPES = Object.keys(STATIC_MESSAGE_TYPE_LABELS) as StaticMessageType[];

export function getStaticMessageTypeLabel(type: StaticMessageType): string {
  return STATIC_MESSAGE_TYPE_LABELS[type];
}
