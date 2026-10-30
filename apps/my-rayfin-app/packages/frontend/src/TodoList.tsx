import { useState } from 'react';
import type { TodoItemRecord } from '@rayfin-app/shared';
import { getRayfinClient } from './lib/rayfin-client';
import { useCrud } from './components/useCrud';
import {
  ConfirmDelete,
  EmptyState,
  ErrorState,
  LoadingState,
} from './components/states';

type PriorityMode = 'auto' | 'Urgent' | 'Non-Urgent';

export function TodoList() {
  const crud = useCrud<TodoItemRecord>({
    list: async () =>
      (await getRayfinClient()).data.TodoItem.select([
        'id',
        'ownerId',
        'title',
        'isCompleted',
        'priority',
        'createdAt',
        'dueDate',
      ])
        .orderBy({ createdAt: 'desc' })
        .execute(),

    create: async (input) =>
      (await getRayfinClient()).data.TodoItem.create(input),

    update: async (id, patch) =>
      (await getRayfinClient()).data.TodoItem.update({ id }, patch),

    remove: async (id) => {
      await (await getRayfinClient()).data.TodoItem.delete({ id });
    },
  });

  if (crud.status === 'loading') return <LoadingState />;
  if (crud.status === 'error')
    return <ErrorState message={crud.error!} onRetry={crud.refresh} />;

  return (
    <main className="mx-auto max-w-2xl px-400 py-800">
      <h1 className="mb-600 text-500 font-semibold font-heading">My tasks</h1>

      {crud.error ? (
        <div className="mb-400">
          <ErrorState message={crud.error} onRetry={crud.clearError} />
        </div>
      ) : null}

      <AddItemForm onAdd={onAdd} disabled={crud.pending} />

      <div className="mt-600">
        {crud.items.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            hint="Add your first task above to get started."
          />
        ) : (
          <ul className="space-y-2" aria-label="Tasks">
            {crud.items.map((item) => (
              <TodoRow
                key={item.id}
                item={item}
                pending={crud.pending}
                onToggle={(checked) =>
                  void crud.update(item.id, { isCompleted: checked })
                }
                onDelete={() => void crud.remove(item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );

  async function onAdd(title: string, mode: PriorityMode) {
    const client = await getRayfinClient();
    const session = client.auth.getSession();
    if (!session.isAuthenticated || !session.user) {
      throw new Error('Not signed in.');
    }

    let priority: string | undefined;
    if (mode === 'auto') {
      try {
        priority = await client.functions.classifyTask.invoke({ title });
      } catch {
        // Classification is best-effort — proceed without priority on failure.
        priority = undefined;
      }
    } else {
      priority = mode;
    }

    void crud.create({
      ownerId: session.user.id,
      title,
      isCompleted: false,
      createdAt: new Date(),
      ...(priority !== undefined ? { priority } : {}),
    });
  }
}

interface AddItemFormProps {
  onAdd(title: string, mode: PriorityMode): Promise<void>;
  disabled?: boolean;
}

function AddItemForm({ onAdd, disabled }: AddItemFormProps) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<PriorityMode>('auto');
  const [classifying, setClassifying] = useState(false);
  const trimmed = title.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || classifying) return;
    if (mode === 'auto') setClassifying(true);
    try {
      await onAdd(trimmed, mode);
      setTitle('');
    } finally {
      setClassifying(false);
    }
  }

  const busy = disabled || classifying;

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-200">
      <div className="flex gap-200">
        <label htmlFor="new-todo" className="sr-only">
          Task title
        </label>
        <input
          id="new-todo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          maxLength={200}
          disabled={busy}
          className="flex-1 rounded-md border border-input bg-background px-300 py-200 text-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !trimmed}
          className="rounded-md bg-primary px-400 py-200 text-300 font-medium text-primary-foreground disabled:opacity-50"
        >
          {classifying ? 'Classifying…' : 'Add'}
        </button>
      </div>
      <div className="flex items-center gap-200">
        <label htmlFor="priority-mode" className="text-200 text-muted-foreground shrink-0">
          Priority:
        </label>
        <select
          id="priority-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as PriorityMode)}
          disabled={busy}
          className="rounded-md border border-input bg-background px-200 py-100 text-200 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          <option value="auto">Auto (AI)</option>
          <option value="Urgent">Urgent</option>
          <option value="Non-Urgent">Non-Urgent</option>
        </select>
      </div>
    </form>
  );
}

interface TodoRowProps {
  item: TodoItemRecord;
  pending: boolean;
  onToggle(checked: boolean): void;
  onDelete(): void;
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const urgent = priority === 'Urgent';
  return (
    <span
      className={
        urgent
          ? 'inline-flex items-center shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground'
          : 'inline-flex items-center shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground'
      }
      aria-label={`Priority: ${priority}`}
    >
      {priority}
    </span>
  );
}

function TodoRow({ item, pending, onToggle, onDelete }: TodoRowProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <li>
        <ConfirmDelete
          label={item.title}
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            onDelete();
            setConfirming(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-300 rounded-lg border border-border bg-card px-400 py-300">
      <input
        type="checkbox"
        id={`todo-${item.id}`}
        checked={item.isCompleted}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={pending}
        className="h-4 w-4 shrink-0 accent-primary"
        aria-label={`Mark "${item.title}" as ${item.isCompleted ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={`todo-${item.id}`}
        className="flex-1 cursor-pointer text-300"
      >
        <span className={item.isCompleted ? 'line-through opacity-50' : ''}>
          {item.title}
        </span>
      </label>
      <PriorityBadge priority={item.priority} />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        aria-label={`Delete "${item.title}"`}
        className="shrink-0 rounded px-200 py-100 text-200 text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
