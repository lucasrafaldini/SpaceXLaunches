import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CATEGORY_BY_KEY } from '../../lib/categories';
import type { CatalogStats } from '../../types';
import { ChevronIcon, RefreshIcon } from '../UI/Icons';

interface StatsPanelProps {
  stats: CatalogStats | null;
}

/** Compact catalog summary; expands on demand instead of permanently covering the globe */
export default function StatsPanel({ stats }: StatsPanelProps) {
  const isLoading = useAppStore((s) => s.isLoading);
  const refreshData = useAppStore((s) => s.refreshData);
  const [open, setOpen] = useState(false);

  if (!stats || stats.totalObjects === 0) return null;

  const items = [
    { label: 'Starlink', value: stats.starlinkTotal, color: CATEGORY_BY_KEY.starlink.color },
    { label: 'Estágios', value: stats.rocketBodies + stats.fairings, color: CATEGORY_BY_KEY['rocket-body'].color },
    { label: 'Debris', value: stats.debris, color: CATEGORY_BY_KEY.debris.color },
    { label: 'Dragon', value: stats.dragon + stats.starship, color: CATEGORY_BY_KEY.dragon.color },
  ];

  return (
    <div className="panel pointer-events-auto overflow-hidden w-max max-w-[calc(100vw-2rem)]">
      {open && (
        <div className="px-4 pt-4 pb-3 border-b border-line animate-pop-in">
          <p className="display text-[34px] leading-none text-ink num">{stats.totalObjects.toLocaleString('pt-BR')}</p>
          <p className="label mt-1.5">Objetos SpaceX em órbita</p>
          <div className="grid grid-cols-4 gap-5 mt-4">
            {items.map(({ label, value, color }) => (
              <div key={label}>
                <p className="num text-[15px] font-medium text-ink">{value.toLocaleString('pt-BR')}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-4">
            Fonte {stats.dataSource} · atualizado às{' '}
            {stats.lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
      <div className="flex items-center gap-1 p-1.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg hover:bg-ink/[0.04] transition-colors"
          aria-expanded={open}
        >
          <span className="label !text-ink/70">Catálogo</span>
          <ChevronIcon width={13} height={13} className={`text-muted transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
        </button>
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="icon-btn w-8 h-8 disabled:opacity-40"
          aria-label="Atualizar dados"
          title="Atualizar dados"
        >
          <RefreshIcon width={14} height={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
