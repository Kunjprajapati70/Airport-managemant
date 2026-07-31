/**
 * TrackingTimeline.jsx
 * Visual timeline of baggage tracking events.
 */

import React from 'react';
import { formatDateTime } from '../../utils/helpers';

const STATUS_META = {
  registered:       { icon: '📦', color: 'bg-blue-500',    label: 'Registered' },
  checked_in:       { icon: '🏷️', color: 'bg-cyan-500',    label: 'Checked In' },
  security_scanned: { icon: '🔍', color: 'bg-purple-500',  label: 'Security Scanned' },
  loaded:           { icon: '✈️', color: 'bg-indigo-500',  label: 'Loaded onto Aircraft' },
  in_transit:       { icon: '🌍', color: 'bg-cyan-500',    label: 'In Transit' },
  arrived:          { icon: '🛬', color: 'bg-emerald-500', label: 'Arrived' },
  claimed:          { icon: '✅', color: 'bg-emerald-500', label: 'Claimed' },
  missing:          { icon: '❓', color: 'bg-orange-500',  label: 'Missing' },
  lost:             { icon: '🚨', color: 'bg-red-500',     label: 'Lost' },
};

export default function TrackingTimeline({ history, compact = false }) {
  if (!history?.length) {
    return (
      <p className="text-dark-500 text-sm text-center py-4">No tracking events yet</p>
    );
  }

  // Show most recent first
  const events = [...history].reverse();

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const meta    = STATUS_META[event.status] ?? { icon: '•', color: 'bg-dark-500', label: event.status };
        const isFirst = i === 0;
        const isLast  = i === events.length - 1;

        return (
          <div key={event._id ?? i} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${isFirst ? meta.color : 'bg-dark-600'} ${isFirst ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-current' : ''}`} />
              {!isLast && <div className="w-px flex-1 bg-dark-700 my-1" />}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-4'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-medium ${isFirst ? 'text-dark-100' : 'text-dark-300'}`}>
                    {meta.icon} {meta.label}
                  </p>
                  {event.location && (
                    <p className="text-xs text-dark-400 mt-0.5">{event.location}</p>
                  )}
                  {event.notes && (
                    <p className="text-xs text-dark-500 mt-0.5 italic">{event.notes}</p>
                  )}
                  {!compact && event.updatedBy && (
                    <p className="text-2xs text-dark-600 mt-0.5">
                      By: {event.updatedBy.firstName} {event.updatedBy.lastName}
                    </p>
                  )}
                </div>
                <p className="text-2xs text-dark-500 flex-shrink-0 mt-0.5">
                  {formatDateTime(event.timestamp)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
