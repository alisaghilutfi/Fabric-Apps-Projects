/**
 * Entity map shared by the data registration package and typed browser client.
 *
 * It remains empty while the data service is disabled. Data capabilities add
 * entity keys here so every runtime consumes the same schema contract.
 */
export interface TodoItemRecord {
  id: string;
  ownerId: string;
  title: string;
  isCompleted: boolean;
  priority?: string | null;
  createdAt: Date;
  dueDate?: Date | null;
}

export type UniversalAppSchema = {
  TodoItem: TodoItemRecord;
};
