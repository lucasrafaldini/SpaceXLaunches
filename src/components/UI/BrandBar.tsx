import { useAppStore } from '../../store/useAppStore';
import { GITHUB_URL } from '../../lib/categories';
import { GithubIcon } from './Icons';

export default function BrandBar() {
  const isPropagating = useAppStore((s) => s.isPropagating);
  const isLoading = useAppStore((s) => s.isLoading);
  const count = useAppStore((s) => s.spaceXSatellites.length);

  const status = isLoading ? 'Sincronizando catálogo' : isPropagating ? 'Ao vivo' : 'Conectando';

  return (
    <div className="panel flex items-center gap-3 pl-4 pr-1.5 py-2 pointer-events-auto">
      <div className="leading-none">
        <h1 className="display text-[22px] text-ink">
          SpaceX <span className="italic font-medium text-gold">Orbital</span>
        </h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-muted">
          <span className={`w-1 h-1 rounded-full ${isPropagating && !isLoading ? 'bg-gold' : 'bg-muted/50 animate-pulse'}`} />
          {status}
          {count > 0 && <span className="num text-ink/50">· {count.toLocaleString('pt-BR')}</span>}
        </p>
      </div>
      <span className="w-px self-stretch bg-line mx-1" />
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="icon-btn"
        title="Código no GitHub"
        aria-label="Ver o projeto no GitHub (abre em nova aba)"
      >
        <GithubIcon width={17} height={17} />
      </a>
    </div>
  );
}
