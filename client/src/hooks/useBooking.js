/**
 * useBooking.js
 * Hook for fetching a single booking by ID with loading/error state.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

export default function useBooking(bookingId) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = async () => {
    if (!bookingId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/bookings/${bookingId}`);
      setBooking(data.booking);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [bookingId]);

  return { booking, loading, error, refetch: fetch };
}
