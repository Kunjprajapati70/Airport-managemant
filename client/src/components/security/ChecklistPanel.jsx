/**
 * ChecklistPanel.jsx
 * Interactive verification checklist for security officers.
 * Shows document, baggage, biometric, and visa verification status.
 */

import React from 'react';
import { FiCheckSquare, FiSquare } from 'react-icons/fi';

const CHECKS = [
  { key: 'documentVerified',  label: 'Identity Document Verified',  desc: 'Passport / National ID checked and valid' },
  { key: 'baggageCleared',    label: 'Baggage Cleared',             desc: 'X-ray scan completed, no prohibited items' },
  { key: 'biometricVerified', label: 'Biometric Verified',          desc: 'Fingerprint / facial recognition matched' },
  { key: 'visaVerified',      label: 'Visa / Entry Permit Verified', desc: 'Travel documents valid for destination' },
];

export default function ChecklistPanel({ values, onChange, readOnly = false }) {
  return (
    <div className="space-y-2">
      {CHECKS.map(({ key, label, desc }) => {
        const checked = values?.[key] ?? false;
        return (
          <button
            key={key}
            type="button"
            onClick={() => !readOnly && onChange(key, !checked)}
            disabled={readOnly}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              checked
                ? 'border-emerald-500/30 bg-emerald-900/10'
                : 'border-dark-600 bg-dark-700/40 hover:border-dark-500'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className={`flex-shrink-0 mt-0.5 ${checked ? 'text-emerald-400' : 'text-dark-500'}`}>
              {checked ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
            </div>
            <div>
              <p className={`text-sm font-medium ${checked ? 'text-emerald-300' : 'text-dark-300'}`}>{label}</p>
              <p className="text-2xs text-dark-500 mt-0.5">{desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
