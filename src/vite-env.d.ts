/// <reference types="vite/client" />

declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.json' {
  const value: any;
  export default value;
}

// Worker types
interface Worker {
  new (url: string | URL, options?: WorkerOptions): Worker;
}

interface WorkerOptions {
  type?: 'classic' | 'module';
  credentials?: RequestCredentials;
  name?: string;
}