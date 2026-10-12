'use client';

import { charLevel, threshold } from '@/lib/questline/engine';

interface Props {
  worlds: { id: string; name: string }[];
  cur: string;
  xp: number;
  streak: number;
  days: Record<string, number>;
  onWorld: (id: string) => void;
}

export default function Hud({ worlds, cur, xp, streak, days, onWorld }: Props) {
  const L = charLevel(xp);
  const lo = threshold(L);
  const hi = threshold(L + 1);
  const pct = Math.min(100, ((xp - lo) / (hi - lo)) * 100);

  const cells = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.now() - i * 864e5).toDateString();
    const c = days[key] || 0;
    const cls = c >= 5 ? 'h3' : c >= 3 ? 'h2' : c ? 'h1' : '';
    cells.push(<b key={key} className={cls} title={`${c} tasks`} />);
  }

  return (
    <div className="hud">
      <div className="pill">
        <select aria-label="World" value={cur} onChange={(e) => onWorld(e.target.value)}>
          {worlds.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div className="pill lv">Lv {L}</div>
      <div className="pill xp">
        <div className="bar" id="ql-xpbar">
          <i style={{ width: pct + '%' }} />
        </div>
        <span>{xp} XP</span>
      </div>
      <div className="pill streak" tabIndex={0}>
        🔥 {streak} day streak
        <div className="pop" aria-hidden="true">
          {cells}
        </div>
      </div>
    </div>
  );
}
