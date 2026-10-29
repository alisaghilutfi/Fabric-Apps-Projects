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

export function TodoList() {
  const crud = useCrud<TodoItemRecord>({
    list: async () =>
      (await getRayfinClient()).data.TodoItem.select([
        'id',
        'ownerId',
        'title',
        'isCompleted',
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

  async function onAdd(title: string) {
    const client = await getRayfinClient();
    const session = client.auth.getSession();
    if (!session.isAuthenticated || !session.user) {
      throw new Error('Not signed in.');
    }
    void crud.create({
      ownerId: session.user.id,
      title,
      isCompleted: false,
      createdAt: new Date(),
    });
  }
}

interface AddItemFormProps {
  onAdd(title: string): void;
  disabled?: boolean;
}

function AddItemForm({ onAdd, disabled }: AddItemFormProps) {
  const [title, setTitle] = useState('');
  const trimmed = title.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        onAdd(trimmed);
        setTitle('');
      }}
      className="flex gap-200"
    >
      <label htmlFor="new-todo" className="sr-only">
        Task title
      </label>
      <input
        id="new-todo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task"
        maxLength={200}
        className="flex-1 rounded-md border border-input bg-background px-300 py-200 text-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={disabled || !trimmed}
        className="rounded-md bg-primary px-400 py-200 text-300 font-medium text-primary-foreground disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

interface TodoRowProps {
  item: TodoItemRecord;
  pending: boolean;
  onToggle(checked: boolean): void;
  onDelete(): void;
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
        className={
          item.isCompleted
            ? 'flex-1 cursor-pointer text-300 line-through opacity-50'
            : 'flex-1 cursor-pointer text-300'
        }
      >
        {item.title}
      </label>
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
