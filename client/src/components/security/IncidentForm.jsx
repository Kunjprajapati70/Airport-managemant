/**
 * IncidentForm.jsx
 * Form for logging a security incident.
 */

import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const INCIDENT_TYPES = [
  { value: 'document_issue',   label: 'Document Issue',      desc: 'Invalid, expired, or suspicious document' },
  { value: 'baggage_issue',    label: 'Baggage Issue',       desc: 'Prohibited item, undeclared goods' },
  { value: 'behaviour',        label: 'Behaviour Concern',   desc: 'Suspicious or disruptive behaviour' },
  { value: 'watchlist_match',  label: 'Watchlist Match',     desc: 'Passenger matches watchlist entry' },
  { value: 'other',            label: 'Other',               desc: 'Other security concern' },
];

const SEVERITIES = [
  { value: 'low',      label: 'Low',      color: 'text-blue-400' },
  { value: 'medium',   label: 'Medium',   color: 'text-amber-400' },
  { value: 'high',     label: 'High',     color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

export default function IncidentForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ type: 'document_issue', description: '', severity: 'medium' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.description.trim() || form.description.length < 10) {
      errs.description = 'Description must be at least 10 characters';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label">Incident Type <span className="text-red-400">*</span></label>
        <div className="space-y-1.5">
          {INCIDENT_TYPES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: value }))}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                form.type === value
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 bg-dark-700/40 hover:border-dark-500'
              }`}
            >
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 border-2 ${
                form.type === value ? 'bg-primary-500 border-primary-500' : 'border-dark-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-dark-200">{label}</p>
                <p className="text-2xs text-dark-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Severity</label>
        <div className="flex gap-2">
          {SEVERITIES.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, severity: value }))}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                form.severity === value
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : `border-dark-600 bg-dark-700/50 ${color} hover:border-dark-500`
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Description <span className="text-red-400">*</span></label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className={`input ${errors.description ? 'input-error' : ''}`}
          rows={4}
          placeholder="Describe the incident in detail…"
          maxLength={1000}
        />
        <p className="text-2xs text-dark-600 mt-1">{form.description.length}/1000</p>
        {errors.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? <><LoadingSpinner size="sm" /> Logging…</> : 'Log Incident'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
}
