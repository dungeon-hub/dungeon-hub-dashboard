import { CntRequestUpdateModel } from '@dungeon-hub/api-client';

/**
 * Type-safe mapping of CNT request types to display labels.
 * TypeScript will error if the enum changes and this mapping is not updated.
 */
export const CNT_REQUEST_TYPE_LABELS: Record<CntRequestUpdateModel.RequestTypeEnum, string> = {
  [CntRequestUpdateModel.RequestTypeEnum.UNDER_THREE]: 'Under 3M',
  [CntRequestUpdateModel.RequestTypeEnum.THREE_TO_FIVE]: '3M - 5M',
  [CntRequestUpdateModel.RequestTypeEnum.FIVE_TO_TEN]: '5M - 10M',
  [CntRequestUpdateModel.RequestTypeEnum.TEN_TO_FIVETEEN]: '10M - 15M',
  [CntRequestUpdateModel.RequestTypeEnum.FIVETEEN_TO_TWENTY]: '15M - 20M',
  [CntRequestUpdateModel.RequestTypeEnum.TWENTY_TO_TWENTIFIVE]: '20M - 25M',
  [CntRequestUpdateModel.RequestTypeEnum.TWENTIFIVE_TO_FIFTY]: '25M - 50M',
  [CntRequestUpdateModel.RequestTypeEnum.FIFTY_TO_HUNDRED]: '50M - 100M',
  [CntRequestUpdateModel.RequestTypeEnum.HUNDRED_TO_TWOHUNDRED]: '100M - 200M',
  [CntRequestUpdateModel.RequestTypeEnum.TWOHUNDRED_TO_FOURHUNDRED]: '200M - 400M',
  [CntRequestUpdateModel.RequestTypeEnum.OVER_FOURHUNDRED]: 'Over 400M'
};

/**
 * Get the display label for a CNT request type.
 */
export function getCntRequestTypeLabel(requestType: CntRequestUpdateModel.RequestTypeEnum | undefined | null): string {
  if (!requestType) return 'Unknown';
  return CNT_REQUEST_TYPE_LABELS[requestType] || requestType;
}
