export interface SubscriptionRecord {
  id: string;
  countryCode: string;
  minMagnitude: number;
  createdAt: Date;
  userId: string;
}

export type UniversalAppSchema = {
  Subscription: SubscriptionRecord;
};
