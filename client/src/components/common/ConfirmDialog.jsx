/**
 * ConfirmDialog
 * Reusable confirmation modal for destructive actions.
 *
 * Props:
 *   isOpen    - boolean
 *   onClose   - () => void
 *   onConfirm - () => void
 *   title     - string
 *   message   - string
 *   confirmLabel - string (default: 'Confirm')
 *   danger    - boolean (red confirm button)
 *   loading   - boolean
 */

import React from 'react';
import Modal from './Modal';
import { FiAlertTriangle } from 'react-icons/fi';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title        = 'Are you sure?',
  message      = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  danger       = true,
  loading      = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
          <FiAlertTriangle size={22} className={danger ? 'text-red-400' : 'text-amber-400'} />
        </div>
        <p className="text-dark-300 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 justify-center ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
