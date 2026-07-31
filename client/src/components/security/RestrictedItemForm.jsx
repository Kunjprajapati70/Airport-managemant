/**
 * RestrictedItemForm.jsx
 * Form for logging a restricted/prohibited item found during security screening.
 */

import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiAlertTriangle } from 'react-icons/fi';

const COMMON_ITEMS = [
  'Knife / Blade', 'Scissors (>6cm)', 'Lighter / Matches', 'Aerosol spray (>100ml)',
  'Liquid (>100ml)', 'Firearm / Replica', 'Explosive material', 'Sharp tool',
  'Prohibited chemical', 'Other',
];

const ACTIONS = [
  { value: 'confiscated', label: 'Confiscated', color: 'text-red-400' },
  { value: 'returned',    label: 'Returned to passenger', color: 'text-amber-400' },
  { value: 'allowed',     label: 'Allowed (exception)', color: 'text-emerald-400' },
  { value: 'escalated',   label: 'Escalated to supervisor', color: 'text-orange-400' },
];

export default function RestrictedItemForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ item: '', description: '', action: 'confiscated' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.item.trim()) errs.item = 'Item name is required';
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
      <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <FiAlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">
          Logging a restricted item will automatically flag this passenger for review.
        </p>
      </div>

      <div>
        <label className="label">Item <span className="text-red-400">*</span></label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COMMON_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setForm((f) => ({ ...f, item }))}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                form.item === item
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-400 hover:text-dark-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <input
          value={form.item}
          onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
          className={`input ${errors.item ? 'input-error' : ''}`}
          placeholder="Or type item name…"
        />
        {errors.item && <p className="field-error">{errors.item}</p>}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="input"
          rows={2}
          placeholder="Additional details about the item…"
        />
      </div>

      <div>
        <label className="label">Action Taken</label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, action: value }))}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                form.action === value
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : 'border-dark-600 bg-dark-700/50 text-dark-400 hover:border-dark-500'
              }`}
            >
              <span className={form.action === value ? '' : color}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-danger flex-1 justify-center">
          {loading ? <><LoadingSpinner size="sm" /> Logging…</> : 'Log Restricted Item'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  );
}
