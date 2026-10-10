import { useSceneStore, MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from '../../store/useSceneStore';
import { HomeIcon, MinusIcon, PlusIcon } from './Icons';

const LOG_RANGE = Math.log(MAX_CAMERA_ALTITUDE / MIN_CAMERA_ALTITUDE);

// Slider is logarithmic so each step feels like the same amount of zoom; top = closest
const altitudeToSlider = (alt: number) => (1 - Math.log(alt / MIN_CAMERA_ALTITUDE) / LOG_RANGE) * 100;
const sliderToAltitude = (v: number) => MIN_CAMERA_ALTITUDE * Math.exp((1 - v / 100) * LOG_RANGE);

function zoomLabel(alt: number) {
  if (alt > 3) return 'Sistema';
  if (alt > 1.2) return 'Global';
  if (alt > 0.45) return 'Continente';
  if (alt > 0.15) return 'Região';
  return 'Órbita';
}

function formatKm(alt: number) {
  const km = alt * 6371;
  return km >= 10000 ? `${(km / 1000).toFixed(0)}k km` : km >= 1000 ? `${(km / 1000).toFixed(1)}k km` : `${km.toFixed(0)} km`;
}

interface ZoomControlProps {
  onReset: () => void;
}

/** Camera zoom slider kept in sync with mouse-wheel / pinch zoom on the globe */
export default function ZoomControl({ onReset }: ZoomControlProps) {
  const altitude = useSceneStore((s) => s.cameraAltitude);
  const setAltitude = useSceneStore((s) => s.setCameraAltitudeOnGlobe);
  const value = altitudeToSlider(altitude);

  const zoomTo = (alt: number) =>
    setAltitude?.(Math.min(MAX_CAMERA_ALTITUDE, Math.max(MIN_CAMERA_ALTITUDE, alt)));

  return (
    <div className="panel flex flex-col items-center gap-1 p-1.5 w-[56px] pointer-events-auto">
      <button className="icon-btn" onClick={() => zoomTo(altitude * 0.75)} aria-label="Aproximar">
        <PlusIcon width={16} height={16} />
      </button>

      <div className="relative h-36 w-9 flex items-center justify-center">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={value}
          onChange={(e) => zoomTo(sliderToAltitude(parseFloat(e.target.value)))}
          className="slider absolute -rotate-90"
          style={{ width: 136, ['--pct' as string]: `${value}%` }}
          aria-label="Zoom da câmera"
          aria-valuetext={`${zoomLabel(altitude)}, ${formatKm(altitude)}`}
        />
      </div>

      <button className="icon-btn" onClick={() => zoomTo(altitude * 1.33)} aria-label="Afastar">
        <MinusIcon width={16} height={16} />
      </button>

      <div className="w-6 border-t border-line my-1" />
      <div className="text-center leading-tight" aria-live="polite">
        <p className="display italic text-[13px] text-gold">{zoomLabel(altitude)}</p>
        <p className="num text-[9px] text-muted whitespace-nowrap mt-0.5">{formatKm(altitude)}</p>
      </div>
      <button className="icon-btn mt-0.5" onClick={onReset} aria-label="Visão global" title="Visão global (R)">
        <HomeIcon width={16} height={16} />
      </button>
    </div>
  );
}
