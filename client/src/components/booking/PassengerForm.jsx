/**
 * PassengerForm.jsx
 * Form fields for a single passenger in the booking flow.
 */

import React from 'react';

const MEAL_OPTIONS = [
  { value: 'standard',    label: 'Standard' },
  { value: 'vegetarian',  label: 'Vegetarian' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'halal',       label: 'Halal' },
  { value: 'kosher',      label: 'Kosher' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'diabetic',    label: 'Diabetic' },
];

export default function PassengerForm({ index, passenger, onChange, errors = {} }) {
  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(index, field, val);
  };

  const isPrimary = index === 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-dark-100">
          Passenger {index + 1}
          {isPrimary && (
            <span className="ml-2 text-2xs font-normal text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
              Primary
            </span>
          )}
        </h3>
        {passenger.seatNumber && (
          <span className="badge bg-dark-700 text-dark-300 border border-dark-600 font-mono">
            Seat {passenger.seatNumber}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First name */}
        <div>
          <label className="label">First Name <span className="text-red-400">*</span></label>
          <input
            value={passenger.firstName}
            onChange={set('firstName')}
            className={`input ${errors.firstName ? 'input-error' : ''}`}
            placeholder="John"
            autoComplete={isPrimary ? 'given-name' : 'off'}
          />
          {errors.firstName && <p className="field-error">{errors.firstName}</p>}
        </div>

        {/* Last name */}
        <div>
          <label className="label">Last Name <span className="text-red-400">*</span></label>
          <input
            value={passenger.lastName}
            onChange={set('lastName')}
            className={`input ${errors.lastName ? 'input-error' : ''}`}
            placeholder="Doe"
            autoComplete={isPrimary ? 'family-name' : 'off'}
          />
          {errors.lastName && <p className="field-error">{errors.lastName}</p>}
        </div>

        {/* Passport */}
        <div>
          <label className="label">Passport / ID Number</label>
          <input
            value={passenger.passportNumber}
            onChange={set('passportNumber')}
            className="input"
            placeholder="Optional"
          />
        </div>

        {/* Date of birth */}
        <div>
          <label className="label">Date of Birth</label>
          <input
            type="date"
            value={passenger.dateOfBirth}
            onChange={set('dateOfBirth')}
            className="input"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Nationality */}
        <div>
          <label className="label">Nationality</label>
          <input
            value={passenger.nationality}
            onChange={set('nationality')}
            className="input"
            placeholder="e.g. American"
          />
        </div>

        {/* Meal preference */}
        <div>
          <label className="label">Meal Preference</label>
          <select value={passenger.mealPreference} onChange={set('mealPreference')} className="input">
            {MEAL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Special assistance */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={passenger.specialAssistance}
              onChange={set('specialAssistance')}
              className="w-4 h-4 accent-primary-500"
            />
            <span className="text-sm text-dark-300">I require special assistance (wheelchair, etc.)</span>
          </label>
          {passenger.specialAssistance && (
            <textarea
              value={passenger.specialAssistanceDetails || ''}
              onChange={set('specialAssistanceDetails')}
              className="input mt-2"
              rows={2}
              placeholder="Describe your requirements…"
            />
          )}
        </div>
      </div>
    </div>
  );
}
