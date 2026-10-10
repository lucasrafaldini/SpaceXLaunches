import { useEffect, useRef, useCallback } from 'react';
import type { PropagationResult, GroundTrackPoint, WorkerMessage } from '../types';
import { useAppStore } from '../store/useAppStore';
import { setOrbitFrame } from '../lib/liveOrbits';

export function usePropagationWorker() {
  const workerRef = useRef<Worker | null>(null);
  const spaceXSatellites = useAppStore((s) => s.spaceXSatellites);
  const setPositions = useAppStore((s) => s.setPositions);
  const setPropagating = useAppStore((s) => s.setPropagating);
  const setError = useAppStore((s) => s.setError);
  const setWorker = useAppStore((s) => s.setWorker);
  const setView = useAppStore((s) => s.setView);
  const timeSpeed = useAppStore((s) => s.view.timeSpeed);
  const isPlaying = useAppStore((s) => s.view.isPlaying);
  const selectedSatellite = useAppStore((s) => s.selectedSatellite);
  const setGroundTrack = useAppStore((s) => s.setGroundTrack);
  
  // Track last sent satellites to avoid redundant INIT messages
  const lastSentCount = useRef<number>(0);
  const lastSelectedId = useRef<number | null>(null);
  
  // Initialize worker
  useEffect(() => {
    // Create worker
    const worker = new Worker(new URL('../workers/propagation.worker.ts', import.meta.url), {
      type: 'module',
    });
    
    workerRef.current = worker;
    setWorker(worker);
    
    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      
      // console.log('[PropagationWorker] Received:', type);
      
      switch (type) {
        case 'FRAME': {
          setOrbitFrame(payload);
          break;
        }
        case 'POSITIONS_UPDATE': {
          const result = payload as PropagationResult;
          setPositions(result.positions);
          useAppStore.getState().setView({ currentTime: new Date(result.timestamp) });
          setPropagating(true);
          break;
        }
        case 'GROUND_TRACK': {
          setGroundTrack(payload.track as GroundTrackPoint[]);
          break;
        }
        case 'READY': {
          // Worker ready, initialize with satellites
          const { spaceXSatellites, view } = useAppStore.getState();
          worker.postMessage({ type: 'SET_SPEED', payload: { speed: view.timeSpeed } } as WorkerMessage);
          if (spaceXSatellites.length > 0) {
            console.log('[PropagationWorker] Sending INIT with', spaceXSatellites.length, 'satellites');
            worker.postMessage({
              type: 'INIT',
              payload: { satellites: spaceXSatellites },
            } as WorkerMessage);
            
            // Start propagation
            if (view.isPlaying) {
              worker.postMessage({
                type: 'START_PROPAGATION',
                payload: {},
              } as WorkerMessage);
            }
            
            lastSentCount.current = spaceXSatellites.length;
          } else {
            console.log('[PropagationWorker] No satellites yet, waiting for data...');
          }
          break;
        }
        case 'ERROR': {
          setError(payload.message);
          break;
        }
      }
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setError('Propagation worker failed');
    };
    
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [setWorker, setPositions, setPropagating, setError, setGroundTrack]);
  
  // Send satellites to the worker whenever the catalog changes (a handful of times per load)
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || spaceXSatellites.length === 0) return;

    worker.postMessage({
      type: 'INIT',
      payload: { satellites: spaceXSatellites },
    } as WorkerMessage);
    if (useAppStore.getState().view.isPlaying) {
      worker.postMessage({ type: 'START_PROPAGATION', payload: {} } as WorkerMessage);
    }
    lastSentCount.current = spaceXSatellites.length;
  }, [spaceXSatellites]);

  // Update time speed
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    
    worker.postMessage({
      type: 'SET_SPEED',
      payload: { speed: timeSpeed, resume: isPlaying },
    } as WorkerMessage);
  }, [timeSpeed, isPlaying]);
  
  // Request ground track for selected satellite
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !selectedSatellite) {
      if (lastSelectedId.current !== null) {
        lastSelectedId.current = null;
      }
      return;
    }
    
    // Only request if selection actually changed
    if (lastSelectedId.current === selectedSatellite.noradCatId) return;
    lastSelectedId.current = selectedSatellite.noradCatId;
    
    worker.postMessage({
      type: 'GET_GROUND_TRACK',
      payload: { noradId: selectedSatellite.noradCatId, points: 200 },
    } as WorkerMessage);
  }, [selectedSatellite]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const worker = workerRef.current;
      if (worker) {
        worker.postMessage({
          type: 'STOP_PROPAGATION',
          payload: {},
        } as WorkerMessage);
      }
    };
  }, []);
  
  // Control functions
  const play = useCallback(() => {
    setView({ isPlaying: true });
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({
        type: 'START_PROPAGATION',
        payload: {},
      } as WorkerMessage);
    }
  }, [setView]);
  
  const pause = useCallback(() => {
    setView({ isPlaying: false });
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({
        type: 'STOP_PROPAGATION',
        payload: {},
      } as WorkerMessage);
    }
  }, [setView]);
  
  const setTime = useCallback((date: Date) => {
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({
        type: 'SET_TIME',
        payload: { time: date.toISOString() },
      } as WorkerMessage);
    }
  }, []);
  
  const refreshPositions = useCallback(() => {
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({
        type: 'GET_POSITIONS',
        payload: {},
      } as WorkerMessage);
    }
  }, []);
  
  return {
    play,
    pause,
    setTime,
    refreshPositions,
  };
}