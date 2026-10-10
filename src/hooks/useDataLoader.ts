import { useEffect, useCallback, useRef } from 'react';
import { satelliteService } from '../services/satelliteService';
import { useAppStore } from '../store/useAppStore';
import type { SatelliteRecord, DebrisField } from '../types';

export function useDataLoader() {
  const setAllSatellites = useAppStore((s) => s.setAllSatellites);
  const setSpaceXSatellites = useAppStore((s) => s.setSpaceXSatellites);
  const setStats = useAppStore((s) => s.setStats);
  const setDebrisFields = useAppStore((s) => s.setDebrisFields);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const stats = useAppStore((s) => s.stats);

  const isLoadingRef = useRef(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    // Sources arrive one by one; coalesce bursts (e.g. several cache hits) into one store update
    let pending: ReturnType<typeof setTimeout> | null = null;
    const publish = () => {
      pending = null;
      const all = satelliteService.getAll();
      setAllSatellites(all);
      setSpaceXSatellites(all);
      setStats(satelliteService.getStats());
      setDebrisFields(createDebrisFields(all));
    };

    try {
      await satelliteService.load(() => {
        if (!pending) pending = setTimeout(publish, 60);
      }, forceRefresh);
      if (pending) {
        clearTimeout(pending);
        publish();
      }
      if (satelliteService.getAll().length === 0) {
        setError('Não foi possível carregar os dados orbitais. Verifique sua conexão e tente novamente.');
      }
    } catch (error) {
      console.error('[useDataLoader] Failed to load satellite data:', error);
      setError('Não foi possível carregar os dados orbitais. Verifique sua conexão e tente novamente.');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [setAllSatellites, setSpaceXSatellites, setStats, setDebrisFields, setLoading, setError]);

  // Register refresh function globally for the refresh button
  useEffect(() => {
    (window as any).__refreshData = loadData;
    return () => {
      delete (window as any).__refreshData;
    };
  }, [loadData]);

  // Auto-load on mount - with ref to prevent strict mode double-invoke
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadData();
  }, [loadData]);

  return { loadData, stats };
}

function createDebrisFields(spaceXObjects: SatelliteRecord[]): DebrisField[] {
  const fields: DebrisField[] = [];
  
  // Filter SpaceX debris
  const spaceXDebris = spaceXObjects.filter(obj => 
    obj.spaceXCategory === 'debris' || 
    obj.objectType === 'DEBRIS'
  );
  
  if (spaceXDebris.length > 0) {
    fields.push({
      name: 'SpaceX Debris',
      description: 'Debris from SpaceX launches and missions',
      eventDate: 'Various',
      noradIds: spaceXDebris.map(d => d.noradCatId),
      color: '#ef4444',
      objectCount: spaceXDebris.length,
    });
  }
  
  // Add known major debris fields
  const knownFields: DebrisField[] = [
    {
      name: 'Fengyun-1C Debris',
      description: 'Chinese ASAT test (2007) - 3,500+ tracked fragments',
      eventDate: '2007-01-11',
      noradIds: [],
      color: '#f97316',
      objectCount: 0,
    },
    {
      name: 'Iridium-33 / Cosmos-2251 Collision',
      description: 'First major satellite collision (2009) - 2,000+ fragments',
      eventDate: '2009-02-10',
      noradIds: [],
      color: '#eab308',
      objectCount: 0,
    },
  ];
  
  return [...fields, ...knownFields];
}

export function useDebrisFields() {
  const spaceXSatellites = useAppStore((s) => s.spaceXSatellites);
  
  const getDebrisByCategory = useCallback((category: SatelliteRecord['spaceXCategory']) => {
    return spaceXSatellites.filter(sat => sat.spaceXCategory === category);
  }, [spaceXSatellites]);
  
  const getStarlinkStats = useCallback(() => {
    const starlink = spaceXSatellites.filter(s => s.spaceXCategory === 'starlink');
    const active = starlink.filter(s => s.objectType === 'PAYLOAD');
    return {
      total: starlink.length,
      active: active.length,
      inactive: starlink.length - active.length,
    };
  }, [spaceXSatellites]);
  
  const getRocketBodyStats = useCallback(() => {
    const rockets = spaceXSatellites.filter(s => s.spaceXCategory === 'rocket-body');
    return {
      total: rockets.length,
      falcon9: rockets.filter(r => r.objectName.includes('FALCON 9') || r.objectName.includes('F9')).length,
      falconHeavy: rockets.filter(r => r.objectName.includes('FALCON HEAVY') || r.objectName.includes('FH')).length,
    };
  }, [spaceXSatellites]);
  
  return {
    getDebrisByCategory,
    getStarlinkStats,
    getRocketBodyStats,
  };
}