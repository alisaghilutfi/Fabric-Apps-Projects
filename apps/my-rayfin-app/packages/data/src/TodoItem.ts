import { entity, role, uuid, text, boolean, date } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.ownerId),
})
export class TodoItem {
  @uuid()
  id!: string;

  @text()
  ownerId!: string;

  @text({ min: 1, max: 200 })
  title!: string;

  @boolean()
  isCompleted!: boolean;

  @date()
  createdAt!: Date;

  @date({ optional: true })
  dueDate?: Date;
}
