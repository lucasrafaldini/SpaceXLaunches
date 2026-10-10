import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSceneStore } from '../../store/useSceneStore';
import { CATEGORIES } from '../../lib/categories';
import { ChevronIcon, SearchIcon } from '../UI/Icons';

interface DualRangeProps {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  label: string;
}

function DualRange({ min, max, low, high, onChange, label }: DualRangeProps) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="dual-range">
      <div className="track">
        <div className="fill" style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={low}
        onChange={(e) => onChange(Math.min(parseInt(e.target.value), high - 1), high)}
        aria-label={`${label} mínima`}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={high}
        onChange={(e) => onChange(low, Math.max(parseInt(e.target.value), low + 1))}
        aria-label={`${label} máxima`}
      />
    </div>
  );
}

function Section({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="label">{title}</h3>
        {value && <span className="num text-[12px] text-ink/70">{value}</span>}
      </div>
      {children}
    </section>
  );
}

function Presets({ items }: { items: { label: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div className="flex gap-4 text-[12px]">
      {items.map(({ label, active, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className={`pb-0.5 border-b transition-colors ${
            active ? 'text-ink border-ink' : 'text-muted border-transparent hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Sidebar({ filteredCount }: { filteredCount: number }) {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const spaceXSatellites = useAppStore((s) => s.spaceXSatellites);
  const sphereScale = useSceneStore((s) => s.sphereScale);
  const setSphereScale = useSceneStore((s) => s.setSphereScale);
  // Collapsed by default so the globe is the first thing people see
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const sat of spaceXSatellites) {
      const key = sat.spaceXCategory ?? 'other';
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [spaceXSatellites]);

  const { altitudeMin: aMin, altitudeMax: aMax, inclinationMin: iMin, inclinationMax: iMax } = filters;
  const sizePct = ((sphereScale - 0.3) / (3 - 0.3)) * 100;
  // Only list categories that exist in the catalog (plus any the user has hidden)
  const categories = CATEGORIES.filter((c) => (counts[c.key] ?? 0) > 0 || !filters[c.filterKey]);

  return (
    <div className="panel w-[300px] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden pointer-events-auto max-h-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-3 text-left hover:bg-ink/[0.03] transition-colors"
        aria-expanded={open}
      >
        <div className="flex-1">
          <p className="label">Explorar</p>
          <p className="mt-1 text-[13px] text-ink">
            <span className="num font-medium">{filteredCount.toLocaleString('pt-BR')}</span>
            <span className="text-muted"> de {spaceXSatellites.length.toLocaleString('pt-BR')} objetos</span>
          </p>
        </div>
        <ChevronIcon width={16} height={16} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="custom-scrollbar overflow-y-auto px-4 pb-4 space-y-6 border-t border-line animate-pop-in">
          <div className="relative mt-4">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={15} height={15} />
            <input
              type="search"
              placeholder="Nome ou NORAD ID"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="input"
              aria-label="Buscar satélite"
            />
          </div>

          <Section title="Categorias">
            <ul className="space-y-0.5 -mx-1">
              {categories.map((cat) => {
                const on = filters[cat.filterKey];
                return (
                  <li key={cat.key}>
                    <button
                      onClick={() => setFilters({ [cat.filterKey]: !on })}
                      className="w-full flex items-center gap-3 px-1 py-1.5 rounded-md hover:bg-ink/[0.04] transition-colors"
                      aria-pressed={on}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full transition-all"
                        style={{ background: on ? cat.color : 'transparent', boxShadow: `inset 0 0 0 1.5px ${on ? 'rgba(0,0,0,.15)' : cat.color}` }}
                      />
                      <span className={`flex-1 text-left text-[13px] ${on ? 'text-ink' : 'text-muted line-through decoration-muted/40'}`}>{cat.label}</span>
                      <span className="num text-[12px] text-muted">{(counts[cat.key] ?? 0).toLocaleString('pt-BR')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Altitude" value={`${aMin} – ${aMax} km`}>
            <DualRange min={0} max={2000} low={aMin} high={aMax} label="Altitude" onChange={(lo, hi) => setFilters({ altitudeMin: lo, altitudeMax: hi })} />
            <Presets
              items={[
                { label: 'Todas', active: aMin === 0 && aMax === 2000, onClick: () => setFilters({ altitudeMin: 0, altitudeMax: 2000 }) },
                { label: 'Até 600 km', active: aMin === 0 && aMax === 600, onClick: () => setFilters({ altitudeMin: 0, altitudeMax: 600 }) },
                { label: 'Acima de 600', active: aMin === 600 && aMax === 2000, onClick: () => setFilters({ altitudeMin: 600, altitudeMax: 2000 }) },
              ]}
            />
          </Section>

          <Section title="Inclinação" value={`${iMin} – ${iMax}°`}>
            <DualRange min={0} max={180} low={iMin} high={iMax} label="Inclinação" onChange={(lo, hi) => setFilters({ inclinationMin: lo, inclinationMax: hi })} />
            <Presets
              items={[
                { label: 'Todas', active: iMin === 0 && iMax === 180, onClick: () => setFilters({ inclinationMin: 0, inclinationMax: 180 }) },
                { label: '53°', active: iMin === 50 && iMax === 56, onClick: () => setFilters({ inclinationMin: 50, inclinationMax: 56 }) },
                { label: '70°', active: iMin === 68 && iMax === 72, onClick: () => setFilters({ inclinationMin: 68, inclinationMax: 72 }) },
                { label: 'Polar', active: iMin === 96 && iMax === 100, onClick: () => setFilters({ inclinationMin: 96, inclinationMax: 100 }) },
              ]}
            />
          </Section>

          <Section title="Tamanho dos pontos" value={`${sphereScale.toFixed(1)}×`}>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={sphereScale}
              onChange={(e) => setSphereScale(parseFloat(e.target.value))}
              className="slider"
              style={{ ['--pct' as string]: `${sizePct}%` }}
              aria-label="Tamanho dos pontos"
            />
          </Section>

          <button onClick={resetFilters} className="btn-soft w-full">
            Restaurar filtros
          </button>
        </div>
      )}
    </div>
  );
}
