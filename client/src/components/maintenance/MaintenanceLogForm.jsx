/**
 * MaintenanceLogForm.jsx
 * Form for creating and editing maintenance logs.
 * Includes parts list management and cost calculation.
 */

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCurrency } from '../../utils/helpers';
import { FiPlus, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

const TYPE_OPTIONS = [
  { value: 'routine',    label: 'Routine',    desc: 'Scheduled periodic maintenance' },
  { value: 'inspection', label: 'Inspection', desc: 'Safety and compliance check' },
  { value: 'repair',     label: 'Repair',     desc: 'Fix a specific issue' },
  { value: 'overhaul',   label: 'Overhaul',   desc: 'Major component rebuild' },
  { value: 'emergency',  label: 'Emergency',  desc: 'Urgent unscheduled maintenance' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: 'text-blue-400' },
  { value: 'normal',   label: 'Normal',   color: 'text-dark-300' },
  { value: 'high',     label: 'High',     color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

const defaultPart = () => ({ name: '', partNumber: '', quantity: 1, unitCost: 0 });

export default function MaintenanceLogForm({
  initialData,
  aircraft,
  allAircraft = [],
  onSubmit,
  onCancel,
  loading,
}) {
  const isEdit = !!initialData?._id;

  const [form, setForm] = useState({
    aircraft:       initialData?.aircraft?._id || initialData?.aircraft || '',
    type:           initialData?.type           || 'routine',
    priority:       initialData?.priority       || 'normal',
    title:          initialData?.title          || '',
    description:    initialData?.description    || '',
    scheduledDate:  initialData?.scheduledDate  ? new Date(initialData.scheduledDate).toISOString().split('T')[0] : '',
    estimatedHours: initialData?.estimatedHours || '',
    labourCost:     initialData?.labourCost     || 0,
    nextServiceDue: initialData?.nextServiceDue ? new Date(initialData.nextServiceDue).toISOString().split('T')[0] : '',
    nextServiceType:initialData?.nextServiceType|| '',
    notes:          initialData?.notes          || '',
    parts:          initialData?.parts?.length  ? initialData.parts.map((p) => ({ ...p })) : [],
  });

  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const addPart    = () => setForm((f) => ({ ...f, parts: [...f.parts, defaultPart()] }));
  const removePart = (i) => setForm((f) => ({ ...f, parts: f.parts.filter((_, idx) => idx !== i) }));
  const updatePart = (i, field, val) => setForm((f) => ({
    ...f,
    parts: f.parts.map((p, idx) => idx === i ? { ...p, [field]: val } : p),
  }));

  // Cost calculation
  const partsCost = form.parts.reduce((s, p) => s + (Number(p.unitCost) || 0) * (Number(p.quantity) || 0), 0);
  const totalCost = (Number(form.labourCost) || 0) + partsCost;

  const validate = () => {
    const errs = {};
    if (!form.aircraft)    errs.aircraft    = 'Aircraft is required';
    if (!form.type)        errs.type        = 'Type is required';
    if (!form.title.trim())errs.title       = 'Title is required';
    if (!form.scheduledDate) errs.scheduledDate = 'Scheduled date is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      ...form,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      labourCost:     Number(form.labourCost) || 0,
      parts:          form.parts.filter((p) => p.name.trim()),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Emergency warning */}
      {form.type === 'emergency' && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
          <FiAlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">
            Emergency maintenance will immediately set the aircraft to maintenance status and block flight assignments.
          </p>
        </div>
      )}

      {/* Aircraft */}
      <div>
        <label className="label">Aircraft <span className="text-red-400">*</span></label>
        {aircraft ? (
          <div className="p-3 bg-dark-700/50 rounded-xl border border-dark-600">
            <p className="font-mono font-semibold text-dark-100">{aircraft.registrationNumber}</p>
            <p className="text-xs text-dark-400">{aircraft.model} · {aircraft.airline?.name}</p>
          </div>
        ) : (
          <select value={form.aircraft} onChange={set('aircraft')} className={`input ${errors.aircraft ? 'input-error' : ''}`}>
            <option value="">Select aircraft</option>
            {allAircraft.map((a) => (
              <option key={a._id} value={a._id}>
                {a.registrationNumber} — {a.model} ({a.status})
              </option>
            ))}
          </select>
        )}
        {errors.aircraft && <p className="field-error">{errors.aircraft}</p>}
      </div>

      {/* Type */}
      <div>
        <label className="label">Maintenance Type <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: value }))}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.type === value
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 bg-dark-700/40 hover:border-dark-500'
              } ${value === 'emergency' ? 'border-red-500/30' : ''}`}
            >
              <p className={`text-sm font-medium ${form.type === value ? 'text-primary-300' : value === 'emergency' ? 'text-red-400' : 'text-dark-200'}`}>
                {label}
              </p>
              <p className="text-2xs text-dark-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="label">Priority</label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, priority: value }))}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                form.priority === value
                  ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                  : `border-dark-600 bg-dark-700/50 ${color} hover:border-dark-500`
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="label">Title <span className="text-red-400">*</span></label>
        <input
          value={form.title}
          onChange={set('title')}
          className={`input ${errors.title ? 'input-error' : ''}`}
          placeholder="e.g. Engine A routine inspection"
          maxLength={200}
        />
        {errors.title && <p className="field-error">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={set('description')}
          className="input"
          rows={3}
          placeholder="Detailed description of work to be performed…"
        />
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Scheduled Date <span className="text-red-400">*</span></label>
          <input
            type="date"
            value={form.scheduledDate}
            onChange={set('scheduledDate')}
            className={`input ${errors.scheduledDate ? 'input-error' : ''}`}
          />
          {errors.scheduledDate && <p className="field-error">{errors.scheduledDate}</p>}
        </div>
        <div>
          <label className="label">Estimated Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.estimatedHours}
            onChange={set('estimatedHours')}
            className="input"
            placeholder="e.g. 8"
          />
        </div>
      </div>

      {/* Next service */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Next Service Due</label>
          <input
            type="date"
            value={form.nextServiceDue}
            onChange={set('nextServiceDue')}
            className="input"
          />
        </div>
        <div>
          <label className="label">Next Service Type</label>
          <select value={form.nextServiceType} onChange={set('nextServiceType')} className="input">
            <option value="">Select type</option>
            {TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Labour cost */}
      <div>
        <label className="label">Labour Cost (USD)</label>
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

      {/* Parts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Parts / Materials</label>
          <button type="button" onClick={addPart} className="btn-secondary btn-sm">
            <FiPlus size={13} /> Add Part
          </button>
        </div>
        {form.parts.length > 0 && (
          <div className="space-y-2">
            {form.parts.map((part, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  {i === 0 && <label className="label text-2xs">Part Name</label>}
                  <input
                    value={part.name}
                    onChange={(e) => updatePart(i, 'name', e.target.value)}
                    className="input text-sm"
                    placeholder="Part name"
                  />
                </div>
                <div>
                  {i === 0 && <label className="label text-2xs">Qty</label>}
                  <input
                    type="number"
                    min="1"
                    value={part.quantity}
                    onChange={(e) => updatePart(i, 'quantity', e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div>
                  {i === 0 && <label className="label text-2xs">Unit Cost ($)</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={part.unitCost}
                    onChange={(e) => updatePart(i, 'unitCost', e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => removePart(i)} className="btn-danger btn-sm w-full justify-center">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {/* Cost summary */}
            <div className="flex justify-between text-sm pt-2 border-t border-dark-700">
              <span className="text-dark-400">Parts cost: {formatCurrency(partsCost)}</span>
              <span className="text-dark-200 font-semibold">Total: {formatCurrency(totalCost)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          className="input"
          rows={2}
          placeholder="Additional notes…"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2.5">
          {loading ? <><LoadingSpinner size="sm" /> {isEdit ? 'Updating…' : 'Creating…'}</> : isEdit ? 'Update Log' : 'Create Log'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
