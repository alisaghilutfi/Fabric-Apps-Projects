import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Moon, Palette, Sun, Trash2, X } from 'lucide-react';
import type { TodoItemRecord } from '@rayfin-app/shared';
import { getRayfinClient } from './lib/rayfin-client';
import { useCrud } from './components/useCrud';
import { useTheme } from './hooks/theme.context';
import {
  ConfirmDelete,
  EmptyState,
  ErrorState,
  LoadingState,
} from './components/states';

type PriorityMode = 'auto' | 'Urgent' | 'Non-Urgent';

// ─── Background ──────────────────────────────────────────────────────────────

type BgOption =
  | { kind: 'color'; value: string; label: string }
  | { kind: 'image'; url: string; label: string };

const BG_OPTIONS: BgOption[] = [
  { kind: 'color', value: '#ffffff', label: 'White' },
  { kind: 'color', value: '#f5f5f5', label: 'Light grey' },
  { kind: 'color', value: '#e8f0fe', label: 'Sky blue' },
  { kind: 'color', value: '#e8f5e9', label: 'Sage green' },
  { kind: 'color', value: '#fce4ec', label: 'Rose' },
  { kind: 'color', value: '#1a1a2e', label: 'Midnight' },
  { kind: 'image', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80', label: 'Mountains' },
  { kind: 'image', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80', label: 'Forest' },
  { kind: 'image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80', label: 'Beach' },
  { kind: 'image', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80', label: 'Peaks' },
  { kind: 'image', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80', label: 'Valley' },
  { kind: 'image', url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1600&q=80', label: 'Autumn' },
];

const BG_STORAGE_KEY = 'rayfin-todo-bg';
const DEFAULT_BG = BG_OPTIONS[0];

function loadBg(): BgOption {
  try {
    const raw = localStorage.getItem(BG_STORAGE_KEY);
    if (!raw) return DEFAULT_BG;
    return JSON.parse(raw) as BgOption;
  } catch {
    return DEFAULT_BG;
  }
}

function saveBg(bg: BgOption) {
  try { localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(bg)); } catch { /* ignore */ }
}

function bgStyle(bg: BgOption): React.CSSProperties {
  if (bg.kind === 'color') return { backgroundColor: bg.value };
  return {
    backgroundImage: `url(${bg.url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

// ─── Date formatting ─────────────────────────────────────────────────────────

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  try {
    const str = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    return dateOnlyFormatter.format(new Date(`${str}T00:00:00Z`));
  } catch {
    return null;
  }
}

// ─── TodoList ────────────────────────────────────────────────────────────────

const COMPLETE_LINGER_MS = 600;

export function TodoList() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const [bg, setBg] = useState<BgOption>(loadBg);
  const [bgOpen, setBgOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const lingerTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = lingerTimers.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const handleToggle = useCallback(
    (
      id: string,
      checked: boolean,
      crudUpdate: (id: string, patch: Partial<Omit<TodoItemRecord, 'id'>>) => Promise<void>
    ) => {
      if (checked) {
        setRecentlyCompleted((prev) => new Set(prev).add(id));
        const timer = setTimeout(() => {
          setRecentlyCompleted((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          lingerTimers.current.delete(id);
        }, COMPLETE_LINGER_MS);
        lingerTimers.current.set(id, timer);
      } else {
        const existing = lingerTimers.current.get(id);
        if (existing) { clearTimeout(existing); lingerTimers.current.delete(id); }
        setRecentlyCompleted((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      void crudUpdate(id, { isCompleted: checked });
    },
    []
  );

  const crud = useCrud<TodoItemRecord>({
    list: async () =>
      (await getRayfinClient()).data.TodoItem.select([
        'id', 'ownerId', 'title', 'isCompleted', 'priority', 'createdAt', 'dueDate',
      ])
        .orderBy({ createdAt: 'desc' })
        .execute(),
    create: async (input) => (await getRayfinClient()).data.TodoItem.create(input),
    update: async (id, patch) => (await getRayfinClient()).data.TodoItem.update({ id }, patch),
    remove: async (id) => { await (await getRayfinClient()).data.TodoItem.delete({ id }); },
  });

  if (crud.status === 'loading') return <LoadingState />;
  if (crud.status === 'error') return <ErrorState message={crud.error!} onRetry={crud.refresh} />;

  const completed = crud.items.filter((i) => i.isCompleted);
  const visible = showCompleted
    ? crud.items
    : crud.items.filter((i) => !i.isCompleted || recentlyCompleted.has(i.id));

  function handleBgSelect(option: BgOption) {
    setBg(option);
    saveBg(option);
    setBgOpen(false);
  }

  return (
    <div className="flex flex-col min-h-full relative" style={bgStyle(bg)}>
      {bg.kind === 'image' && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden="true" />
      )}

      <header className="relative z-10 flex items-center justify-between border-b border-border px-400 py-300 bg-card/80 backdrop-blur-sm">
        <span className="text-300 font-semibold font-heading text-foreground">My Tasks</span>
        <div className="flex items-center gap-200">
          <button
            type="button"
            onClick={() => setBgOpen((v) => !v)}
            aria-label="Change background"
            aria-expanded={bgOpen}
            className="rounded p-100 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Palette size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded p-100 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {bgOpen && (
        <div
          className="relative z-20 border-b border-border bg-card/95 backdrop-blur-sm px-400 py-300"
          role="dialog"
          aria-label="Background picker"
        >
          <div className="flex items-center justify-between mb-200">
            <span className="text-200 font-medium text-muted-foreground uppercase tracking-wide">
              Background
            </span>
            <button
              type="button"
              onClick={() => setBgOpen(false)}
              aria-label="Close background picker"
              className="rounded p-100 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap gap-200">
            {BG_OPTIONS.map((option) => {
              const isActive = JSON.stringify(option) === JSON.stringify(bg);
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleBgSelect(option)}
                  aria-label={option.label}
                  aria-pressed={isActive}
                  title={option.label}
                  className={[
                    'h-8 w-8 rounded-md border-2 transition-transform hover:scale-110 overflow-hidden',
                    isActive ? 'border-primary' : 'border-transparent',
                  ].join(' ')}
                  style={
                    option.kind === 'color'
                      ? { backgroundColor: option.value }
                      : {
                          backgroundImage: `url(${option.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-2xl px-400 py-600 flex-1">
        {crud.error ? (
          <div className="mb-400">
            <ErrorState message={crud.error} onRetry={crud.clearError} />
          </div>
        ) : null}

        <div className={bg.kind === 'image' ? 'rounded-xl bg-card/90 backdrop-blur-sm p-400 mb-600' : ''}>
          <AddItemForm onAdd={onAdd} disabled={crud.pending} />
        </div>

        <div className={bg.kind === 'image' ? '' : 'mt-600'}>
          {crud.items.length === 0 ? (
            <EmptyState title="No tasks yet" hint="Add your first task above to get started." />
          ) : (
            <>
              <ul className="space-y-2" aria-label="Tasks">
                {visible.map((item) => (
                  <TodoRow
                    key={item.id}
                    item={item}
                    pending={crud.pending}
                    onToggle={(checked) => handleToggle(item.id, checked, crud.update)}
                    onDelete={() => void crud.remove(item.id)}
                    imageBackground={bg.kind === 'image'}
                  />
                ))}
              </ul>

              {completed.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  className="mt-400 text-200 text-muted-foreground hover:text-foreground"
                >
                  {showCompleted
                    ? `Hide ${completed.length} completed`
                    : `Show ${completed.length} completed`}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );

  async function onAdd(title: string, mode: PriorityMode, dueDate?: string) {
    const client = await getRayfinClient();
    const session = client.auth.getSession();
    if (!session.isAuthenticated || !session.user) throw new Error('Not signed in.');

    let priority: string | undefined;
    if (mode === 'auto') {
      try {
        priority = await client.functions.classifyTask.invoke({ title });
      } catch {
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
      ...(dueDate ? { dueDate: new Date(`${dueDate}T00:00:00Z`) } : {}),
    });
  }
}

// ─── AddItemForm ─────────────────────────────────────────────────────────────

interface AddItemFormProps {
  onAdd(title: string, mode: PriorityMode, dueDate?: string): Promise<void>;
  disabled?: boolean;
}

function AddItemForm({ onAdd, disabled }: AddItemFormProps) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<PriorityMode>('auto');
  const [dueDate, setDueDate] = useState('');
  const [classifying, setClassifying] = useState(false);
  const trimmed = title.trim();
  const busy = disabled || classifying;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || classifying) return;
    if (mode === 'auto') setClassifying(true);
    try {
      await onAdd(trimmed, mode, dueDate || undefined);
      setTitle('');
      setDueDate('');
    } finally {
      setClassifying(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-200">
      <div className="flex gap-200">
        <label htmlFor="new-todo" className="sr-only">Task title</label>
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
      <div className="flex items-center gap-300 flex-wrap">
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
        <div className="flex items-center gap-200">
          <label htmlFor="due-date" className="text-200 text-muted-foreground shrink-0">
            Due:
          </label>
          <input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={busy}
            className="rounded-md border border-input bg-background px-200 py-100 text-200 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
      </div>
    </form>
  );
}

// ─── PriorityBadge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority, completed }: { priority?: string | null; completed?: boolean }) {
  if (!priority) return null;
  const urgent = priority === 'Urgent';
  return (
    <span
      className={[
        urgent
          ? 'inline-flex items-center shrink-0 rounded-full px-200 py-[2px] text-100 font-medium bg-destructive text-destructive-foreground'
          : 'inline-flex items-center shrink-0 rounded-full px-200 py-[2px] text-100 font-medium bg-muted text-muted-foreground',
        completed ? 'opacity-50' : '',
      ].join(' ')}
      aria-label={`Priority: ${priority}`}
    >
      {priority}
    </span>
  );
}

// ─── TodoRow ─────────────────────────────────────────────────────────────────

interface TodoRowProps {
  item: TodoItemRecord;
  pending: boolean;
  imageBackground: boolean;
  onToggle(checked: boolean): void;
  onDelete(): void;
}

function TodoRow({ item, pending, imageBackground, onToggle, onDelete }: TodoRowProps) {
  const [confirming, setConfirming] = useState(false);
  const dueDateLabel = formatDate(item.dueDate);

  if (confirming) {
    return (
      <li>
        <ConfirmDelete
          label={item.title}
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => { onDelete(); setConfirming(false); }}
        />
      </li>
    );
  }

  const rowBg = imageBackground
    ? 'bg-card/80 backdrop-blur-sm'
    : item.isCompleted ? 'bg-muted' : 'bg-card';

  return (
    <li
      className={[
        'flex items-start gap-300 rounded-lg border border-border px-400 py-300 transition-all duration-300',
        rowBg,
      ].join(' ')}
    >
      <input
        type="checkbox"
        id={`todo-${item.id}`}
        checked={item.isCompleted}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={pending}
        className="mt-[3px] h-4 w-4 shrink-0 accent-primary"
        aria-label={`Mark "${item.title}" as ${item.isCompleted ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={`todo-${item.id}`}
        className={['flex-1 min-w-0 cursor-pointer transition-opacity duration-300', item.isCompleted ? 'opacity-50' : ''].join(' ')}
      >
        <span className={['text-300 block', item.isCompleted ? 'line-through' : ''].join(' ')}>
          {item.title}
        </span>
        {dueDateLabel && (
          <span className="mt-100 flex items-center gap-100 text-200 text-muted-foreground">
            <CalendarDays size={12} aria-hidden="true" />
            {dueDateLabel}
          </span>
        )}
      </label>
      <PriorityBadge priority={item.priority} completed={item.isCompleted} />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        aria-label={`Delete "${item.title}"`}
        className="shrink-0 mt-[3px] rounded p-100 text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-50"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </li>
  );
}
