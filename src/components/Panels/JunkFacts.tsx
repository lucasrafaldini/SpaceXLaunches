import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { buildJunkFacts, summarizeJunk } from '../../lib/spaceJunk';
import { ChevronIcon } from '../UI/Icons';

const ROTATE_EVERY_MS = 8000;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** "Você sabia?" — quanto lixo a SpaceX deixou em órbita, em unidades brasileiras */
export default function JunkFacts() {
  const satellites = useAppStore((s) => s.spaceXSatellites);
  const positions = useAppStore((s) => s.positions);
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  // Bumped on every rotation so the same fact can re-animate when the deck reshuffles
  const [cycle, setCycle] = useState(0);

  const summary = useMemo(() => summarizeJunk(satellites, positions), [satellites, positions]);
  // Facts are rebuilt with live data (altitude/speed change every couple of seconds)
  const facts = useMemo(() => buildJunkFacts(summary), [summary]);
  const factIds = facts.map((f) => f.id).join(',');

  // New shuffled order whenever the set of facts changes
  useEffect(() => {
    setOrder(shuffle(factIds.split(',').filter(Boolean)));
    setIndex(0);
  }, [factIds]);

  useEffect(() => {
    if (paused || !open || order.length === 0) return;
    const t = setTimeout(() => {
      if (index + 1 >= order.length) {
        setOrder((o) => shuffle(o));
        setIndex(0);
      } else {
        setIndex(index + 1);
      }
      setCycle((c) => c + 1);
    }, ROTATE_EVERY_MS);
    return () => clearTimeout(t);
  }, [index, order, paused, open]);

  if (summary.count === 0) return null;

  const current = facts.find((f) => f.id === order[index]) ?? facts[0];
  const tons = summary.massKg / 1000;

  return (
    <div
      className="panel w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden pointer-events-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-end gap-3 px-4 pt-3 pb-3 text-left hover:bg-ink/[0.03] transition-colors"
        aria-expanded={open}
      >
        <div className="flex-1">
          <p className="label">Lixo espacial SpaceX</p>
          <p className="mt-1 text-ink leading-none">
            <span className="display text-[30px] num">≈ {tons.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="ml-1 text-[13px] text-muted">toneladas</span>
          </p>
          <p className="num text-[11px] text-muted mt-1.5">
            {summary.stages} estágios · {summary.fragments} fragmentos · ≈ {summary.volumeM3.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³
          </p>
        </div>
        <ChevronIcon width={15} height={15} className={`mb-1 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && current && (
        <div className="px-4 pb-3.5 border-t border-line">
          <p className="display italic text-[17px] text-gold mt-3">Você sabia?</p>
          <p key={`${current.id}-${cycle}`} className="text-[13px] leading-relaxed text-ink/85 mt-1 min-h-[60px] animate-pop-in" aria-live="polite">
            {current.text}
          </p>

          <div className="h-px bg-line relative overflow-hidden mt-3">
            <div
              key={`${current.id}-${cycle}-bar`}
              className="absolute inset-y-0 left-0 bg-ink/50 junk-progress"
              style={{ animationDuration: `${ROTATE_EVERY_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
