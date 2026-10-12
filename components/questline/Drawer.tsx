'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import {
  PRIORITIES,
  TASK_ICON,
  TASK_TYPES,
  bounty,
  isLevelDone,
  levelStatus,
  type Level,
  type Priority,
  type Task,
  type TaskType,
} from '@/lib/questline/engine';

interface Props {
  level: Level | null;
  levels: Level[];
  builder: boolean;
  onClose: () => void;
  onToggle: (levelId: string, taskId: string, checkbox: HTMLInputElement) => void;
  onAddTask: (levelId: string, title: string, type: TaskType, p: Priority) => void;
  onUpdateTask: (levelId: string, taskId: string, patch: Partial<Task>) => void;
  onUpdateLevel: (levelId: string, patch: Partial<Pick<Level, 'title' | 'icon' | 'xp'>>) => void;
}

const dueText = (d: string) => {
  if (!d) return '';
  const days = Math.round(
    (new Date(d + 'T00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 864e5,
  );
  return days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : 'Due ' + d;
};

const STATUS_LABEL = { done: 'Completed', active: 'Active', locked: 'Locked' } as const;

export default function Drawer({
  level,
  levels,
  builder,
  onClose,
  onToggle,
  onAddTask,
  onUpdateTask,
  onUpdateLevel,
}: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('code');
  const [prio, setPrio] = useState<Priority>('Medium');
  const titleRef = useRef<HTMLInputElement>(null);

  if (!level) return <aside className="drawer" aria-label="Level tasks" />;

  const status = levelStatus(level, levels);
  const done = level.tasks.filter((t) => t.done).length;
  const pct = level.tasks.length ? (done / level.tasks.length) * 100 : 0;
  const blockers = level.deps
    .map((id) => levels.find((l) => l.id === id))
    .filter((l): l is Level => !!l && !isLevelDone(l));

  const submit = () => {
    if (!title.trim()) return;
    onAddTask(level.id, title, type, prio);
    setTitle('');
    titleRef.current?.focus();
  };

  return (
    <aside className="drawer open" aria-label="Level tasks">
      <button className="cl" onClick={onClose}>
        Close
      </button>
      <h2>
        {level.icon} {level.title}
      </h2>
      <div className="sub">
        {STATUS_LABEL[status]} &middot; {bounty(level)} XP bounty
      </div>
      <div className="pg">
        <i style={{ width: pct + '%' }} />
      </div>

      {builder && (
        <div className="edit" key={level.id}>
          <input
            defaultValue={level.title}
            aria-label="Level title"
            onBlur={(e) => onUpdateLevel(level.id, { title: e.target.value || 'Untitled' })}
          />
          <input
            defaultValue={level.icon}
            maxLength={2}
            style={{ width: 50 }}
            aria-label="Icon"
            onBlur={(e) => onUpdateLevel(level.id, { icon: e.target.value || '⚔️' })}
          />
          <input
            type="number"
            min={0}
            defaultValue={bounty(level)}
            style={{ width: 72 }}
            aria-label="XP bounty"
            onBlur={(e) => onUpdateLevel(level.id, { xp: Math.max(0, +e.target.value || 0) })}
          />
        </div>
      )}

      {status === 'locked' && (
        <p>
          Finish these levels first: <b>{blockers.map((b) => b.title).join(', ')}</b>
        </p>
      )}

      {level.tasks.map((t) => {
        const meta = [dueText(t.due), t.est ? t.est + 'm' : ''].filter(Boolean).join(' · ');
        return (
          <div key={t.id} className={'task' + (t.done ? ' done' : '')}>
            <div className="row">
              <input
                type="checkbox"
                checked={t.done}
                disabled={status === 'locked'}
                aria-label="Complete task"
                onChange={(e: ChangeEvent<HTMLInputElement>) => onToggle(level.id, t.id, e.target)}
              />
              <button
                type="button"
                className="tt"
                aria-expanded={t.open}
                onClick={() => onUpdateTask(level.id, t.id, { open: !t.open })}
              >
                {TASK_ICON[t.type]} {t.t}
              </button>
              <em className={`chip ${t.p}`}>{t.p}</em>
              <button
                className="mini"
                aria-expanded={t.open}
                aria-label="Task details"
                onClick={() => onUpdateTask(level.id, t.id, { open: !t.open })}
              >
                {t.open ? '▾' : '▸'}
              </button>
            </div>
            {meta && <div className="meta">{meta}</div>}
            {t.open && (
              <div className="det">
                <textarea
                  value={t.note}
                  placeholder="Notes, links, code (Markdown)"
                  onChange={(e) => onUpdateTask(level.id, t.id, { note: e.target.value })}
                />
                <div>
                  <label>
                    Due{' '}
                    <input
                      type="date"
                      value={t.due}
                      onChange={(e) => onUpdateTask(level.id, t.id, { due: e.target.value })}
                    />
                  </label>
                  <label>
                    Est (min){' '}
                    <input
                      type="number"
                      min={0}
                      style={{ width: 70 }}
                      value={t.est ?? ''}
                      onChange={(e) =>
                        onUpdateTask(level.id, t.id, {
                          est: e.target.value === '' ? null : Math.max(0, +e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {status !== 'locked' && (
        <div className="add">
          <input
            ref={titleRef}
            placeholder="New task"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {TASK_TYPES.map((k) => (
              <option key={k} value={k}>
                {TASK_ICON[k]} {k}
              </option>
            ))}
          </select>
          <select
            aria-label="Priority"
            value={prio}
            onChange={(e) => setPrio(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button onClick={submit}>Add</button>
        </div>
      )}
    </aside>
  );
}
