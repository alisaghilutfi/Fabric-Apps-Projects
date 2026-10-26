import { entity, role, uuid, text, decimal, date } from '@microsoft/rayfin-core';

@entity('AlertSubscription')
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class Subscription {
  @uuid() id!: string;
  @text({ min: 2, max: 2 }) countryCode!: string;
  @decimal({ min: 1.0, max: 9.9 }) minMagnitude!: number;
  @date() createdAt!: Date;
  @text({ max: 200 }) userId!: string;
}
