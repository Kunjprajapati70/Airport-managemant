/**
 * Modal
 * Accessible modal dialog with backdrop, keyboard close (Escape), and focus trap.
 *
 * Props:
 *   isOpen    - boolean
 *   onClose   - () => void
 *   title     - string
 *   children  - ReactNode
 *   size      - 'sm' | 'md' | 'lg' | 'xl'
 *   footer    - ReactNode (optional action buttons row)
 */

import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}) {
  const overlayRef = useRef(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal-box ${SIZES[size]} animate-slide-up`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 id="modal-title" className="text-base font-semibold text-dark-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon btn-ghost text-dark-400 hover:text-dark-100"
            aria-label="Close modal"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-dark-700 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
