/**
 * ComplaintForm.jsx
 * Form for filing a lost/damaged baggage complaint.
 */

import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiAlertTriangle } from 'react-icons/fi';

const COMPLAINT_TYPES = [
  { value: 'lost_baggage',    label: 'Lost Baggage' },
  { value: 'damaged_baggage', label: 'Damaged Baggage' },
  { value: 'delayed_baggage', label: 'Delayed Baggage' },
  { value: 'other',           label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function ComplaintForm({ baggage, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    type:               'lost_baggage',
    subject:            baggage ? `Lost baggage — ${baggage.tagNumber}` : '',
    description:        '',
    priority:           'medium',
    baggageDescription: baggage?.description || '',
    baggageColor:       baggage?.color || '',
    lastSeenLocation:   '',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.type)        errs.type        = 'Required';
    if (!form.subject.trim() || form.subject.length < 5) errs.subject = 'Min 5 characters';
    if (!form.description.trim() || form.description.length < 20) errs.description = 'Min 20 characters';
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
      {/* Warning */}
      <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <FiAlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">
          Filing a complaint creates a formal record. Our team will investigate and respond within 48 hours.
        </p>
      </div>

      {/* Baggage tag (read-only) */}
      {baggage && (
        <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
          <p className="text-2xs text-dark-500 uppercase tracking-wider">Baggage Tag</p>
          <p className="font-mono font-bold text-primary-400 mt-0.5">{baggage.tagNumber}</p>
          <p className="text-2xs text-dark-400 mt-0.5">{baggage.weight}kg · {baggage.type}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Complaint Type <span className="text-red-400">*</span></label>
          <select value={form.type} onChange={set('type')} className="input">
            {COMPLAINT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.type && <p className="field-error">{errors.type}</p>}
        </div>
        <div>
          <label className="label">Priority</label>
          <select value={form.priority} onChange={set('priority')} className="input">
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Subject <span className="text-red-400">*</span></label>
        <input
          value={form.subject}
          onChange={set('subject')}
          className={`input ${errors.subject ? 'input-error' : ''}`}
          placeholder="Brief description of the issue"
          maxLength={200}
        />
        {errors.subject && <p className="field-error">{errors.subject}</p>}
      </div>

      <div>
        <label className="label">Description <span className="text-red-400">*</span></label>
        <textarea
          value={form.description}
          onChange={set('description')}
          className={`input ${errors.description ? 'input-error' : ''}`}
          rows={4}
          placeholder="Provide as much detail as possible — when you last saw the bag, what it looks like, any identifying features…"
          maxLength={2000}
        />
        <p className="text-2xs text-dark-600 mt-1">{form.description.length}/2000</p>
        {errors.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Bag Color</label>
          <input value={form.baggageColor} onChange={set('baggageColor')} className="input" placeholder="e.g. Black, Navy Blue" />
        </div>
        <div>
          <label className="label">Last Seen Location</label>
          <input value={form.lastSeenLocation} onChange={set('lastSeenLocation')} className="input" placeholder="e.g. JFK Terminal 4" />
        </div>
      </div>

      <div>
        <label className="label">Bag Description</label>
        <input
          value={form.baggageDescription}
          onChange={set('baggageDescription')}
          className="input"
          placeholder="Brand, size, distinguishing features…"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2.5">
          {loading ? <><LoadingSpinner size="sm" /> Submitting…</> : 'Submit Complaint'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
