/**
 * StatusUpdateForm.jsx
 * Form for updating a flight's operational status.
 * Shows contextual fields based on the selected status.
 */

import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiAlertTriangle, FiClock, FiXCircle, FiCheckCircle } from 'react-icons/fi';

const FLIGHT_STATUSES = [
  { value: 'scheduled',  label: 'Scheduled',  icon: FiClock,        color: 'text-blue-400' },
  { value: 'boarding',   label: 'Boarding',   icon: FiCheckCircle,  color: 'text-amber-400' },
  { value: 'departed',   label: 'Departed',   icon: FiCheckCircle,  color: 'text-purple-400' },
  { value: 'in_flight',  label: 'In Flight',  icon: FiCheckCircle,  color: 'text-cyan-400' },
  { value: 'arrived',    label: 'Arrived',    icon: FiCheckCircle,  color: 'text-emerald-400' },
  { value: 'delayed',    label: 'Delayed',    icon: FiAlertTriangle,color: 'text-orange-400' },
  { value: 'cancelled',  label: 'Cancelled',  icon: FiXCircle,      color: 'text-red-400' },
  { value: 'diverted',   label: 'Diverted',   icon: FiAlertTriangle,color: 'text-rose-400' },
];

export default function StatusUpdateForm({ flight, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    status:             flight.status,
    delayReason:        '',
    delayMinutes:       30,
    cancellationReason: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.status) errs.status = 'Status is required';
    if (form.status === 'delayed') {
      if (!form.delayMinutes || form.delayMinutes < 1) errs.delayMinutes = 'Must be at least 1 minute';
      if (!form.delayReason.trim()) errs.delayReason = 'Delay reason is required';
    }
    if (form.status === 'cancelled' && !form.cancellationReason.trim()) {
      errs.cancellationReason = 'Cancellation reason is required';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({
      status:             form.status,
      delayReason:        form.delayReason || undefined,
      delayMinutes:       form.status === 'delayed' ? Number(form.delayMinutes) : undefined,
      cancellationReason: form.cancellationReason || undefined,
    });
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Current status info */}
      <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl border border-dark-600">
        <div>
          <p className="text-xs text-dark-500">Current status</p>
          <p className="text-sm font-semibold text-dark-200 capitalize">{flight.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="mx-3 text-dark-600">→</div>
        <div>
          <p className="text-xs text-dark-500">New status</p>
          <p className="text-sm font-semibold text-primary-400 capitalize">{form.status.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Status selector */}
      <div>
        <label className="label">New Status <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {FLIGHT_STATUSES.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setForm((f) => ({ ...f, status: value })); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                form.status === value
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-dark-600 bg-dark-700/50 text-dark-400 hover:border-dark-500 hover:text-dark-200'
              }`}
            >
              <Icon size={14} className={form.status === value ? 'text-primary-400' : color} />
              {label}
            </button>
          ))}
        </div>
        {errors.status && <p className="field-error mt-1">{errors.status}</p>}
      </div>

      {/* Delay fields */}
      {form.status === 'delayed' && (
        <div className="space-y-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl animate-fade-in">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Delay Details</p>
          <div>
            <label className="label">Delay Duration (minutes) <span className="text-red-400">*</span></label>
            <input
              type="number"
              min="1"
              value={form.delayMinutes}
              onChange={set('delayMinutes')}
              className={`input ${errors.delayMinutes ? 'input-error' : ''}`}
              placeholder="e.g. 45"
            />
            {errors.delayMinutes && <p className="field-error">{errors.delayMinutes}</p>}
          </div>
          <div>
            <label className="label">Delay Reason <span className="text-red-400">*</span></label>
            <input
              value={form.delayReason}
              onChange={set('delayReason')}
              className={`input ${errors.delayReason ? 'input-error' : ''}`}
              placeholder="e.g. Air traffic control, weather, technical issue"
            />
            {errors.delayReason && <p className="field-error">{errors.delayReason}</p>}
          </div>
          <p className="text-xs text-dark-500">
            All confirmed passengers will be notified automatically.
          </p>
        </div>
      )}

      {/* Cancellation fields */}
      {form.status === 'cancelled' && (
        <div className="space-y-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl animate-fade-in">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Cancellation Details</p>
          <div>
            <label className="label">Cancellation Reason <span className="text-red-400">*</span></label>
            <textarea
              value={form.cancellationReason}
              onChange={set('cancellationReason')}
              className={`input ${errors.cancellationReason ? 'input-error' : ''}`}
              rows={3}
              placeholder="Provide a clear reason for cancellation…"
            />
            {errors.cancellationReason && <p className="field-error">{errors.cancellationReason}</p>}
          </div>
          <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
            <FiAlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">
              This will notify all confirmed passengers and free the assigned aircraft. This action cannot be undone.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading || form.status === flight.status}
          className={`flex-1 justify-center py-2.5 ${
            form.status === 'cancelled' ? 'btn-danger' : 'btn-primary'
          }`}
        >
          {loading ? <><LoadingSpinner size="sm" /> Updating…</> : 'Update Status'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
