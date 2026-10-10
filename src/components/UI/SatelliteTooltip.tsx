import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSceneStore } from '../../store/useSceneStore';
import { categoryOf } from '../../lib/categories';

/** Hover card for the satellite under the cursor */
export default function SatelliteTooltip() {
  const hoverId = useSceneStore((s) => s.hoverId);
  const x = useSceneStore((s) => s.hoverX);
  const y = useSceneStore((s) => s.hoverY);
  const satellites = useAppStore((s) => s.spaceXSatellites);
  const pos = useAppStore((s) => (hoverId !== null ? s.positions.get(hoverId) : undefined));

  const byId = useMemo(() => new Map(satellites.map((s) => [s.noradCatId, s])), [satellites]);
  const sat = hoverId !== null ? byId.get(hoverId) : undefined;
  if (!sat) return null;

  const cat = categoryOf(sat);
  const width = 210;
  const left = x + width + 24 > window.innerWidth ? x - width - 16 : x + 16;
  const top = y + 100 > window.innerHeight ? y - 90 : y + 16;

  return (
    <div className="fixed z-40 pointer-events-none panel !rounded-lg px-3.5 py-2.5" style={{ left, top, width }}>
      <p className="label flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />
        {cat.label}
      </p>
      <p className="display text-[17px] leading-tight text-ink mt-0.5 truncate">{sat.objectName}</p>
      {pos && (
        <p className="num text-[12px] text-muted mt-1">
          {pos.altitudeKm.toFixed(0)} km · {pos.velocityKms.toFixed(2)} km/s
        </p>
      )}
    </div>
  );
}
