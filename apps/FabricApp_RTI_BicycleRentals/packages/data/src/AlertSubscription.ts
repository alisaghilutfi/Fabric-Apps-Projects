import { entity, role, uuid, text, int, date } from '@microsoft/rayfin-core';

@entity('AlertSubscription')
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class AlertSubscription {
  @uuid() id!: string;
  @int() stationId!: number;
  @text({ max: 300 }) street!: string;
  @text({ max: 200 }) neighbourhood!: string;
  @text({ max: 20 }) action!: string;
  @date() flaggedAt!: Date;
  @date({ optional: true }) resolvedAt?: Date;
  @text({ max: 200 }) userId!: string;
}
