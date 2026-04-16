/**
 * CompleteMaintenanceForm.jsx
 * Form for signing off a completed maintenance log.
 */

import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiCheckCircle } from 'react-icons/fi';

const TYPE_OPTIONS = ['routine', 'inspection', 'repair', 'overhaul', 'emergency'];

export default function CompleteMaintenanceForm({ log, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    actualHours:     log?.estimatedHours || '',
    labourCost:      log?.labourCost     || 0,
    notes:           log?.notes          || '',
    nextServiceDue:  '',
    nextServiceType: log?.nextServiceType || 'routine',
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      actualHours:     form.actualHours     ? Number(form.actualHours)  : undefined,
      labourCost:      form.labourCost      ? Number(form.labourCost)   : undefined,
      notes:           form.notes           || undefined,
      nextServiceDue:  form.nextServiceDue  || undefined,
      nextServiceType: form.nextServiceType || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <FiCheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-400">
          Completing this log will return the aircraft to <strong>Available</strong> status and update the maintenance record.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Actual Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.actualHours}
            onChange={set('actualHours')}
            className="input"
            placeholder="Hours worked"
          />
        </div>
        <div>
          <label className="label">Labour Cost ($)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.labourCost}
              onChange={set('labourCost')}
              className="input pl-6"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Next Service Due</label>
          <input
            type="date"
            value={form.nextServiceDue}
            onChange={set('nextServiceDue')}
            className="input"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div>
          <label className="label">Next Service Type</label>
          <select value={form.nextServiceType} onChange={set('nextServiceType')} className="input">
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Completion Notes</label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          className="input"
          rows={3}
          placeholder="Summary of work performed, findings, recommendations…"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-success flex-1 justify-center py-2.5">
          {loading ? <><LoadingSpinner size="sm" /> Completing…</> : <><FiCheckCircle size={15} /> Complete Maintenance</>}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
