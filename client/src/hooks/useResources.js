/**
 * useResources.js
 * Loads all reference data needed by the flight form in one shot:
 * airports, airlines, aircraft, terminals, gates, runways.
 * Cached for the lifetime of the component.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useResources() {
  const [resources, setResources] = useState({
    airports:  [],
    airlines:  [],
    aircraft:  [],
    terminals: [],
    gates:     [],
    runways:   [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [airports, airlines, aircraft, terminals, gates, runways] = await Promise.all([
          api.get('/airports'),
          api.get('/airlines'),
          api.get('/aircraft?limit=100'),
          api.get('/infrastructure/terminals'),
          api.get('/infrastructure/gates'),
          api.get('/infrastructure/runways'),
        ]);
        if (!cancelled) {
          setResources({
            airports:  airports.data.airports  || [],
            airlines:  airlines.data.airlines  || [],
            aircraft:  aircraft.data.aircraft  || [],
            terminals: terminals.data.terminals || [],
            gates:     gates.data.gates        || [],
            runways:   runways.data.runways     || [],
          });
        }
      } catch (err) {
        console.error('useResources load error:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { ...resources, loading };
}
