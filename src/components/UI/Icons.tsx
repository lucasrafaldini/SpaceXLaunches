import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const stroke = (props: IconProps) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const GithubIcon = (props: IconProps) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

export const OrbitLogo = (props: IconProps) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.6" transform="rotate(-25 12 12)" />
    <circle cx="20.2" cy="8.2" r="1.6" fill="currentColor" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...stroke(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const PlayIcon = (p: IconProps) => (
  <svg {...stroke({ fill: 'currentColor', strokeWidth: 0, ...p })}><path d="M7 4.5v15l13-7.5z" /></svg>
);
export const PauseIcon = (p: IconProps) => (
  <svg {...stroke({ fill: 'currentColor', strokeWidth: 0, ...p })}><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>
);
export const PlusIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const MinusIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M5 12h14" /></svg>;
export const CloseIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const ChevronIcon = (p: IconProps) => <svg {...stroke(p)}><path d="m6 9 6 6 6-6" /></svg>;
export const RefreshIcon = (p: IconProps) => (
  <svg {...stroke(p)}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
);
export const KeyboardIcon = (p: IconProps) => (
  <svg {...stroke(p)}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>
);
export const CrosshairIcon = (p: IconProps) => (
  <svg {...stroke(p)}><circle cx="12" cy="12" r="8" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
);
export const FilterIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M3 5h18M6 12h12M10 19h4" /></svg>;
export const HomeIcon = (p: IconProps) => (
  <svg {...stroke(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
