export interface ItemRecord {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  createdAt: Date;
  owner_id: string;
}

export interface AlertSubscriptionRecord {
  id: string;
  stationId: number;
  street: string;
  neighbourhood: string;
  action: string;
  flaggedAt: Date;
  resolvedAt?: Date;
  userId: string;
}

export type UniversalAppSchema = {
  Item: ItemRecord;
  AlertSubscription: AlertSubscriptionRecord;
};
