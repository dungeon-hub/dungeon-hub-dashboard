import {CarryTierModel, CarryTypeModel, StaticMessageCreationModel, TicketPanelModel} from '@dungeon-hub/api-client';

export type StaticMessageType = StaticMessageCreationModel.StaticMessageTypeEnum;
export type StaticMessageObjectOption = { id: string; name: string };

type ObjectOptionType = Extract<StaticMessageType, 'TicketPanel' | 'ScoreLeaderboard' | 'PriceMessage'>;

export const STATIC_MESSAGE_OBJECT_OPTION_TYPES = {
  TicketPanel: 'TicketPanel',
  ScoreLeaderboard: 'CarryType',
  PriceMessage: 'CarryTier'
} satisfies Record<ObjectOptionType, 'TicketPanel' | 'CarryType' | 'CarryTier'>;

export function supportsObjectIds(type: StaticMessageType): type is ObjectOptionType {
  return type in STATIC_MESSAGE_OBJECT_OPTION_TYPES;
}

export function getObjectOptionTypeLabel(type: StaticMessageType): string | null {
  if (!supportsObjectIds(type)) return null;

  switch (STATIC_MESSAGE_OBJECT_OPTION_TYPES[type]) {
    case 'TicketPanel':
      return 'Ticket Panel';
    case 'CarryType':
      return 'Carry Type';
    case 'CarryTier':
      return 'Carry Tier';
  }
}

export function toTicketPanelOption(panel: TicketPanelModel): StaticMessageObjectOption {
  return {id: panel.id, name: panel.displayName || panel.name || panel.id};
}

export function toCarryTypeOption(carryType: CarryTypeModel): StaticMessageObjectOption {
  return {id: carryType.id, name: carryType.displayName || carryType.identifier || carryType.id};
}

export function toCarryTierOption(carryTier: CarryTierModel): StaticMessageObjectOption {
  const carryTypeName = carryTier.carryType?.displayName || carryTier.carryType?.identifier;
  const carryTierName = carryTier.displayName || carryTier.identifier || carryTier.id;
  return {id: carryTier.id, name: carryTypeName ? `${carryTypeName} - ${carryTierName}` : carryTierName};
}
