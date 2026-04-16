/**
 * StatusBadge
 * Renders a colored pill badge for any status string.
 * CSS classes are defined in index.css as .status-{value}.
 */

import React from 'react';
import { getStatusClass } from '../../utils/helpers';

const STATUS_LABELS = {
  not_checked_in:   'Not Checked In',
  checked_in:       'Checked In',
  in_flight:        'In Flight',
  in_transit:       'In Transit',
  in_progress:      'In Progress',
  security_scanned: 'Security Scanned',
  partially_refunded: 'Partial Refund',
  no_show:          'No Show',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <span className={getStatusClass(status)}>
      {label}
    </span>
  );
}
