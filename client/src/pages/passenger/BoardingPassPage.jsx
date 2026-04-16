/**
 * BoardingPassPage.jsx
 * Full boarding pass display page at /passenger/boarding-pass/:id
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BoardingPassCard from '../../components/checkin/BoardingPassCard';
import { FiArrowLeft } from 'react-icons/fi';

export default function BoardingPassPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [pass,    setPass]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get(`/boarding/pass/${id}/info`)
      .then((r) => setPass(r.data.boardingPass))
      .catch((err) => setError(err.response?.data?.message || 'Boarding pass not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  if (error) return (
    <div className="max-w-md mx-auto text-center py-20">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">Go Back</button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-dark-200 text-sm transition-colors">
        <FiArrowLeft size={15} /> Back
      </button>
      <h1 className="text-2xl font-bold text-dark-100">Boarding Pass</h1>
      {pass && <BoardingPassCard boardingPass={pass} showDownload />}
    </div>
  );
}
