/**
 * useFlights.js
 * Custom hook for fetching and managing flight list state.
 * Handles pagination, filtering, and loading/error states.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function useFlights(initialParams = {}) {
  const [flights,  setFlights]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [params,   setParams]   = useState(initialParams);

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/flights', {
        params: { ...params, page, limit: 15 },
      });
      setFlights(data.flights);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load flights');
    } finally {
      setLoading(false);
    }
  }, [page, params]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  const updateParams = (newParams) => {
    setPage(1);
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  return {
    flights, loading, total, pages, page,
    setPage, updateParams, refetch: fetchFlights,
  };
}
