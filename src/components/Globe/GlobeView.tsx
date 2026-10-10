import { useRef, useEffect, useState } from 'react';
import { useGlobe, useGlobeControls } from '../../hooks/useGlobe';
import { usePropagationWorker } from '../../hooks/usePropagationWorker';
import { useDataLoader } from '../../hooks/useDataLoader';
import { useAppStore } from '../../store/useAppStore';
import Sidebar from '../Panels/Sidebar';
import SatellitePanel from '../Panels/SatellitePanel';
import StatsPanel from '../Panels/StatsPanel';
import TimeControl from '../UI/TimeControl';
import BrandBar from '../UI/BrandBar';
import ZoomControl from '../UI/ZoomControl';
import SatelliteTooltip from '../UI/SatelliteTooltip';
import ErrorToast from '../UI/ErrorToast';
import { KeyboardIcon } from '../UI/Icons';

const SPEED_STEPS = [1, 5, 10, 50, 100];

const SHORTCUTS: [string, string][] = [
  ['Espaço', 'Play / pausa'],
  ['↑ ↓', 'Zoom'],
  ['+ −', 'Velocidade'],
  ['R', 'Visão global'],
  ['F', 'Seguir satélite'],
  ['Esc', 'Fechar painel'],
];

function ShortcutsButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pointer-events-auto">
      {open && (
        <div className="absolute bottom-12 right-0 panel p-4 w-56 animate-pop-in">
          <p className="label mb-3">Atalhos</p>
          <ul className="space-y-2 text-[12px]">
            {SHORTCUTS.map(([key, label]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="text-ink/75">{label}</span>
                <kbd className="num text-[10px] px-1.5 py-0.5 rounded border border-line text-ink/70">{key}</kbd>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="panel icon-btn !w-10 !h-10" aria-label="Atalhos de teclado" aria-expanded={open}>
        <KeyboardIcon width={17} height={17} />
      </button>
    </div>
  );
}

export default function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { stats } = useDataLoader();
  const { play, pause } = usePropagationWorker();
  const { filteredCount } = useGlobe(containerRef);
  const controls = useGlobeControls();

  const error = useAppStore((s) => s.error);
  const selectedSatellite = useAppStore((s) => s.selectedSatellite);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { view, setView, selectSatellite, selectedSatellite } = useAppStore.getState();
      const stepIndex = SPEED_STEPS.indexOf(view.timeSpeed);

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (view.isPlaying) pause();
          else play();
          break;
        case 'r':
        case 'R':
          controls.resetView();
          break;
        case 'f':
        case 'F':
          if (selectedSatellite) controls.toggleFollow();
          break;
        case 'ArrowUp':
          e.preventDefault();
          controls.zoomIn();
          break;
        case 'ArrowDown':
          e.preventDefault();
          controls.zoomOut();
          break;
        case '+':
        case '=':
          setView({ timeSpeed: SPEED_STEPS[Math.min(SPEED_STEPS.length - 1, stepIndex + 1)] });
          break;
        case '-':
          setView({ timeSpeed: SPEED_STEPS[Math.max(0, stepIndex - 1)] });
          break;
        case 'Escape':
          setView({ followMode: false });
          selectSatellite(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controls, play, pause]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050505]">
      <div ref={containerRef} id="globe-canvas" className="absolute inset-0" style={{ touchAction: 'none' }} />

      <SatelliteTooltip />

      {/* Left column: brand + filters */}
      <div className="absolute top-4 left-4 bottom-[300px] z-30 flex flex-col gap-3 pointer-events-none">
        <BrandBar />
        <Sidebar filteredCount={filteredCount} />
      </div>

      {/* Bottom center: simulation clock (kept clear of the side panels) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-lg:bottom-20">
        <TimeControl onPlay={play} onPause={pause} />
      </div>

      {/* Right: details panel next to a zoom rail pinned to the edge */}
      <div className="absolute top-4 right-4 bottom-20 z-20 flex items-start gap-3 pointer-events-none">
        {selectedSatellite && (
          <SatellitePanel
            key={selectedSatellite.noradCatId}
            satellite={selectedSatellite}
            onClose={() => {
              useAppStore.getState().setView({ followMode: false });
              useAppStore.getState().selectSatellite(null);
            }}
          />
        )}
        <div className="self-center">
          <ZoomControl onReset={controls.resetView} />
        </div>
      </div>

      {/* Bottom: collapsible data dock + shortcuts */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-3 pointer-events-none">
        <StatsPanel stats={stats} />
      </div>
      <div className="absolute bottom-4 right-4 z-20">
        <ShortcutsButton />
      </div>

      {error && <ErrorToast message={error} onDismiss={() => useAppStore.getState().setError(null)} />}
    </div>
  );
}
