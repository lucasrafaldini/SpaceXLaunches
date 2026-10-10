import type { FilterState, SatelliteRecord } from '../types';

export type Category = NonNullable<SatelliteRecord['spaceXCategory']>;

export interface CategoryMeta {
  key: Category;
  label: string;
  filterKey: keyof Pick<
    FilterState,
    'showStarlink' | 'showRocketBodies' | 'showFairings' | 'showDebris' | 'showDragon' | 'showStarship' | 'showOther'
  >;
  color: string;
  /** Sphere radius in globe units at the reference zoom */
  radius: number;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'starlink', label: 'Starlink', filterKey: 'showStarlink', color: '#ece3cf', radius: 0.26 },
  { key: 'rocket-body', label: 'Estágios', filterKey: 'showRocketBodies', color: '#d6a456', radius: 0.5 },
  { key: 'fairing', label: 'Fairings', filterKey: 'showFairings', color: '#c98a6b', radius: 0.45 },
  { key: 'debris', label: 'Debris', filterKey: 'showDebris', color: '#d0675e', radius: 0.32 },
  { key: 'dragon', label: 'Dragon', filterKey: 'showDragon', color: '#8fb4d8', radius: 1.2 },
  { key: 'starship', label: 'Starship', filterKey: 'showStarship', color: '#c6ccd4', radius: 1.2 },
  { key: 'other', label: 'Outros', filterKey: 'showOther', color: '#93b5a4', radius: 0.5 },
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<Category, CategoryMeta>;

export function categoryOf(sat: Pick<SatelliteRecord, 'spaceXCategory'>): CategoryMeta {
  return CATEGORY_BY_KEY[sat.spaceXCategory ?? 'other'] ?? CATEGORY_BY_KEY.other;
}

export const GITHUB_URL = 'https://github.com/lucasrafaldini/SpaceXLaunches';
