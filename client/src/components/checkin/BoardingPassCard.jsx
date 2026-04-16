/**
 * BoardingPassCard.jsx
 * Visual boarding pass card rendered in the browser.
 * Mirrors the PDF design with a dark theme.
 */

import React from 'react';
import { formatTime, formatDate } from '../../utils/helpers';
import { FiSend, FiDownload, FiCheckCircle } from 'react-icons/fi';

const CLASS_COLORS = {
  first:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  business: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  economy:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

export default function BoardingPassCard({ boardingPass, showDownload = true }) {
  if (!boardingPass) return null;

  const classColor = CLASS_COLORS[boardingPass.seatClass] ?? CLASS_COLORS.economy;

  return (
    <div className="rounded-2xl overflow-hidden border border-primary-700/40 shadow-card-lg bg-dark-900">

      {/* Header */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-800 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiSend size={16} className="text-white" />
          <span className="text-white font-bold text-sm tracking-wide">AeroManage</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-primary-200 text-xs font-mono">{boardingPass.pnr}</span>
          {boardingPass.isBoarded && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
              <FiCheckCircle size={12} /> Boarded
            </span>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="px-5 py-5 bg-dark-800">
        <div className="flex items-center gap-4">
          <div className="text-center flex-1">
            <p className="text-4xl font-bold text-dark-100 leading-none">
              {boardingPass.departureAirportCode}
            </p>
            <p className="text-xs text-dark-400 mt-1 truncate">{boardingPass.departureAirportName}</p>
            <p className="text-xl font-bold text-primary-400 mt-1">
              {formatTime(boardingPass.departureTime)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-10 h-px bg-dark-600" />
            <FiSend size={14} className="text-primary-400" />
            <div className="w-10 h-px bg-dark-600" />
          </div>

          <div className="text-center flex-1">
            <p className="text-4xl font-bold text-dark-100 leading-none">
              {boardingPass.arrivalAirportCode}
            </p>
            <p className="text-xs text-dark-400 mt-1 truncate">{boardingPass.arrivalAirportName}</p>
          </div>
        </div>
      </div>

      {/* Passenger */}
      <div className="px-5 py-3 bg-dark-800 border-t border-dark-700">
        <p className="text-2xs text-dark-500 uppercase tracking-wider">Passenger</p>
        <p className="text-base font-bold text-dark-100 mt-0.5 uppercase">
          {boardingPass.passengerName}
        </p>
      </div>

      {/* Details grid */}
      <div className="px-5 py-4 bg-dark-800 border-t border-dark-700 grid grid-cols-3 gap-4">
        {[
          ['Date',     formatDate(boardingPass.departureTime)],
          ['Boarding', formatTime(boardingPass.boardingTime)],
          ['Gate',     boardingPass.gate || 'TBD'],
          ['Seat',     boardingPass.seatNumber],
          ['Class',    boardingPass.seatClass?.toUpperCase()],
          ['Seq.',     boardingPass.sequenceNumber ? String(boardingPass.sequenceNumber).padStart(3, '0') : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-2xs text-dark-500 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-dark-100 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* QR code */}
      {boardingPass.qrCode && (
        <div className="px-5 py-5 bg-dark-800 border-t border-dark-700 flex flex-col items-center gap-2">
          <img
            src={boardingPass.qrCode}
            alt="Boarding pass QR code"
            className="w-36 h-36 rounded-xl border border-dark-600"
          />
          <p className="text-2xs text-dark-500 text-center">
            Scan at the gate · One-time use only
          </p>
        </div>
      )}

      {/* Download */}
      {showDownload && (
        <div className="px-5 py-4 bg-dark-900 border-t border-dark-700">
          <a
            href={`/api/boarding/pass/${boardingPass._id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full justify-center py-2.5"
          >
            <FiDownload size={15} /> Download PDF Boarding Pass
          </a>
        </div>
      )}
    </div>
  );
}
