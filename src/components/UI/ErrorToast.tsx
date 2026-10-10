import { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-pop-in pointer-events-auto" role="alert">
      <div className="panel flex items-start gap-3 pl-4 pr-1.5 py-2.5 w-[min(440px,calc(100vw-2rem))]">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#b5534b] flex-shrink-0" />
        <p className="flex-1 text-[13px] text-ink/80">{message}</p>
        <button onClick={onDismiss} className="icon-btn w-7 h-7" aria-label="Fechar">
          <CloseIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}
