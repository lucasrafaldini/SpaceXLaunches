import { useAppStore } from '../../store/useAppStore';
import { PauseIcon, PlayIcon } from './Icons';

interface TimeControlProps {
  onPlay: () => void;
  onPause: () => void;
}

const PRESETS = [1, 5, 10, 50, 100];

export default function TimeControl({ onPlay, onPause }: TimeControlProps) {
  const speed = useAppStore((s) => s.view.timeSpeed);
  const isPlaying = useAppStore((s) => s.view.isPlaying);
  const currentTime = useAppStore((s) => s.view.currentTime);
  const timeFormat = useAppStore((s) => s.settings.timeFormat);
  const setView = useAppStore((s) => s.setView);

  const date = currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: timeFormat === 'utc' ? 'UTC' : undefined });
  const time = timeFormat === 'utc' ? currentTime.toISOString().slice(11, 19) : currentTime.toLocaleTimeString('pt-BR');

  return (
    <div className="panel flex items-center gap-3 p-1.5 pr-2 pointer-events-auto">
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="w-9 h-9 rounded-lg flex items-center justify-center bg-ink text-paper hover:bg-ink/85 transition-colors"
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? <PauseIcon width={14} height={14} /> : <PlayIcon width={14} height={14} />}
      </button>

      <div className="leading-tight min-w-[96px]">
        <p className="num text-[15px] font-medium text-ink tracking-tight">{time}</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          {date} {timeFormat === 'utc' && '· UTC'}
        </p>
      </div>

      <span className="w-px self-stretch bg-line" />

      <div className="flex items-center gap-0.5" role="group" aria-label="Velocidade da simulação">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setView({ timeSpeed: preset })}
            className={`num px-2 py-1 rounded-md text-[12px] transition-colors ${
              speed === preset ? 'text-ink font-semibold bg-paper-2' : 'text-muted hover:text-ink'
            }`}
            aria-pressed={speed === preset}
          >
            {preset}×
          </button>
        ))}
      </div>
    </div>
  );
}
