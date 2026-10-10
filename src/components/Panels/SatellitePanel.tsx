import { useAppStore } from '../../store/useAppStore';
import { categoryOf } from '../../lib/categories';
import type { SelectedSatellite } from '../../types';
import { CloseIcon, CrosshairIcon } from '../UI/Icons';

interface SatellitePanelProps {
  satellite: SelectedSatellite;
  onClose: () => void;
}

function Figure({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-1 text-ink">
        <span className="display text-[26px] leading-none num">{value}</span>
        {unit && <span className="ml-1 text-[12px] text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export default function SatellitePanel({ satellite, onClose }: SatellitePanelProps) {
  const pos = useAppStore((s) => s.positions.get(satellite.noradCatId));
  const units = useAppStore((s) => s.settings.units);
  const followMode = useAppStore((s) => s.view.followMode);
  const setView = useAppStore((s) => s.setView);
  const cat = categoryOf(satellite);

  const imperial = units === 'imperial';
  const distValue = (km: number) => (imperial ? km * 0.621371 : km).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const distUnit = imperial ? 'mi' : 'km';

  // Derive apsides from mean motion when the catalog didn't provide them
  const semiMajorKm = satellite.meanMotion > 0 ? Math.cbrt(398600.4418 / ((satellite.meanMotion * 2 * Math.PI) / 86400) ** 2) : 0;
  const apogeeKm = satellite.apogeeKm || semiMajorKm * (1 + satellite.eccentricity) - 6378.137;
  const perigeeKm = satellite.perigeeKm || semiMajorKm * (1 - satellite.eccentricity) - 6378.137;
  const altitude = pos?.altitudeKm ?? apogeeKm;
  const period = satellite.periodMin || (satellite.meanMotion ? 1440 / satellite.meanMotion : 0);
  const epochAgeH = (Date.now() - new Date(satellite.epoch.endsWith('Z') ? satellite.epoch : satellite.epoch + 'Z').getTime()) / 3.6e6;

  const rows: [string, string][] = [
    ['Inclinação', `${satellite.inclination.toFixed(2)}°`],
    ['Período', `${period.toFixed(1)} min`],
    ['Apogeu', `${distValue(apogeeKm)} ${distUnit}`],
    ['Perigeu', `${distValue(perigeeKm)} ${distUnit}`],
    ['Excentricidade', satellite.eccentricity.toFixed(6)],
    ['RAAN', `${satellite.raOfAscNode.toFixed(2)}°`],
    ['Arg. do pericentro', `${satellite.argOfPericenter.toFixed(2)}°`],
    ['Movimento médio', `${satellite.meanMotion.toFixed(4)} rev/dia`],
    ['Designador', satellite.objectId || '—'],
    ['Época dos elementos', `há ${epochAgeH.toFixed(1)} h`],
  ];

  return (
    <aside className="panel w-[340px] max-w-[calc(100vw-2rem)] max-h-full flex flex-col overflow-hidden pointer-events-auto animate-pop-in">
      <header className="px-5 pt-4 pb-4 border-b border-line">
        <div className="flex items-center justify-between">
          <p className="label flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: cat.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
            {cat.label}
          </p>
          <button onClick={onClose} className="icon-btn -mr-2 w-8 h-8" aria-label="Fechar painel">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <h2 className="display text-[28px] leading-tight text-ink mt-1 break-words">{satellite.objectName}</h2>
        <p className="num text-[12px] text-muted mt-0.5">NORAD {satellite.noradCatId}</p>
      </header>

      <div className="custom-scrollbar overflow-y-auto px-5 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Figure label="Altitude" value={distValue(altitude)} unit={distUnit} />
          <Figure
            label="Velocidade"
            value={pos ? (imperial ? (pos.velocityKms * 2236.94).toFixed(0) : pos.velocityKms.toFixed(2)) : '—'}
            unit={imperial ? 'mph' : 'km/s'}
          />
          <Figure label="Latitude" value={pos ? `${pos.latitude.toFixed(2)}°` : '—'} />
          <Figure label="Longitude" value={pos ? `${pos.longitude.toFixed(2)}°` : '—'} />
        </div>

        {pos && (
          <p className="text-[12px] text-muted flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${pos.isSunlit ? 'bg-gold' : 'bg-ink/30'}`} />
            {pos.isSunlit ? 'Iluminado pelo Sol' : 'Na sombra da Terra'}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={() => setView({ followMode: !followMode })} className={followMode ? 'btn-primary flex-1 !bg-gold' : 'btn-primary flex-1'}>
            <CrosshairIcon width={15} height={15} />
            {followMode ? 'Seguindo' : 'Seguir'}
          </button>
          <button
            onClick={() => setView({ followMode: false, latitude: pos?.latitude ?? 0, longitude: pos?.longitude ?? 0, altitude: 0.6 })}
            className="btn-soft flex-1"
          >
            Centralizar
          </button>
        </div>

        <section>
          <h3 className="label mb-2">Elementos orbitais</h3>
          <dl className="text-[13px]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2 border-b border-line last:border-0">
                <dt className="text-muted">{label}</dt>
                <dd className="num text-ink text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </aside>
  );
}
