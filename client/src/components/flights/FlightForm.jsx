/**
 * FlightForm.jsx
 * Reusable form for creating and editing flights.
 * Handles all field groups: identity, route, schedule, resources, pricing.
 * Runs a live conflict check when aircraft/gate/runway/times change.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toLocalDatetime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const SECTION = ({ title, children }) => (
  <div>
    <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">{title}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  </div>
);

const Field = ({ label, required, children, error, hint, span2 }) => (
  <div className={span2 ? 'sm:col-span-2' : ''}>
    <label className="label">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint  && <p className="text-2xs text-dark-600 mt-1">{hint}</p>}
    {error && <p className="field-error">{error}</p>}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function FlightForm({
  initialData,
  resources,
  onSubmit,
  onCancel,
  loading: submitting,
}) {
  const isEdit = !!initialData?._id;
  const editFlightId = initialData?._id || null;
  const normalizedInitialData = {
    ...initialData,
    // Normalize ObjectId refs to string IDs
    airline: initialData?.airline?._id || initialData?.airline || '',
    aircraft: initialData?.aircraft?._id || initialData?.aircraft || '',
    departureAirport: initialData?.departureAirport?._id || initialData?.departureAirport || '',
    arrivalAirport: initialData?.arrivalAirport?._id || initialData?.arrivalAirport || '',
    departureTerminal: initialData?.departureTerminal?._id || initialData?.departureTerminal || '',
    arrivalTerminal: initialData?.arrivalTerminal?._id || initialData?.arrivalTerminal || '',
    departureGate: initialData?.departureGate?._id || initialData?.departureGate || '',
    arrivalGate: initialData?.arrivalGate?._id || initialData?.arrivalGate || '',
    runway: initialData?.runway?._id || initialData?.runway || '',
    parkingBay: initialData?.parkingBay?._id || initialData?.parkingBay || '',
    scheduledDeparture: toLocalDatetime(initialData?.scheduledDeparture),
    scheduledArrival: toLocalDatetime(initialData?.scheduledArrival),
  };

  const [form, setForm] = useState(() => ({
    flightNumber:      '',
    airline:           '',
    aircraft:          '',
    departureAirport:  '',
    arrivalAirport:    '',
    scheduledDeparture:'',
    scheduledArrival:  '',
    economyPrice:      299,
    businessPrice:     799,
    firstClassPrice:   1499,
    departureTerminal: '',
    arrivalTerminal:   '',
    departureGate:     '',
    arrivalGate:       '',
    runway:            '',
    parkingBay:        '',
    notes:             '',
    ...normalizedInitialData,
  }));

  const [errors,       setErrors]       = useState({});
  const [conflict,     setConflict]     = useState(null); // { message } | null
  const [conflictOk,   setConflictOk]   = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);

  // ── Filtered gate/terminal lists based on selected airport ────────────────
  const depTerminals = resources.terminals.filter(
    (t) => t.airport?._id === form.departureAirport || t.airport === form.departureAirport
  );
  const arrTerminals = resources.terminals.filter(
    (t) => t.airport?._id === form.arrivalAirport || t.airport === form.arrivalAirport
  );
  const depGates = resources.gates.filter(
    (g) => g.airport?._id === form.departureAirport || g.airport === form.departureAirport
  );
  const arrGates = resources.gates.filter(
    (g) => g.airport?._id === form.arrivalAirport || g.airport === form.arrivalAirport
  );
  const depRunways = resources.runways.filter(
    (r) => r.airport?._id === form.departureAirport || r.airport === form.departureAirport
  );

  // ── Live conflict check ───────────────────────────────────────────────────
  const runConflictCheck = useCallback(async () => {
    if (!form.aircraft || !form.scheduledDeparture || !form.scheduledArrival) {
      setConflict(null); setConflictOk(false); return;
    }
    setCheckingConflict(true);
    try {
      const params = {
        aircraftId:         form.aircraft,
        scheduledDeparture: new Date(form.scheduledDeparture).toISOString(),
        scheduledArrival:   new Date(form.scheduledArrival).toISOString(),
      };
      if (form.departureGate) params.gateId   = form.departureGate;
      if (form.runway)         params.runwayId = form.runway;
      if (isEdit && editFlightId) params.excludeFlightId = editFlightId;

      const { data } = await api.get('/flights/conflicts', { params });
      if (data.conflict) {
        setConflict({ message: data.message });
        setConflictOk(false);
      } else {
        setConflict(null);
        setConflictOk(true);
      }
    } catch {
      setConflict(null); setConflictOk(false);
    } finally {
      setCheckingConflict(false);
    }
  }, [form.aircraft, form.departureGate, form.runway, form.scheduledDeparture, form.scheduledArrival, isEdit, editFlightId]);

  // Debounce conflict check
  useEffect(() => {
    const t = setTimeout(runConflictCheck, 600);
    return () => clearTimeout(t);
  }, [runConflictCheck]);

  // ── Field change handler ──────────────────────────────────────────────────
  const set = (field) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
    // Clear dependent fields when airport changes
    if (field === 'departureAirport') {
      setForm((f) => ({ ...f, departureAirport: val, departureTerminal: '', departureGate: '', runway: '' }));
    }
    if (field === 'arrivalAirport') {
      setForm((f) => ({ ...f, arrivalAirport: val, arrivalTerminal: '', arrivalGate: '' }));
    }
  };

  // ── Client-side validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.flightNumber.trim()) errs.flightNumber = 'Required';
    if (!form.airline)             errs.airline      = 'Required';
    if (!form.aircraft)            errs.aircraft     = 'Required';
    if (!form.departureAirport)    errs.departureAirport = 'Required';
    if (!form.arrivalAirport)      errs.arrivalAirport   = 'Required';
    if (form.departureAirport && form.departureAirport === form.arrivalAirport) {
      errs.arrivalAirport = 'Cannot be same as departure';
    }
    if (!form.scheduledDeparture)  errs.scheduledDeparture = 'Required';
    if (!form.scheduledArrival)    errs.scheduledArrival   = 'Required';
    if (form.scheduledDeparture && form.scheduledArrival) {
      if (new Date(form.scheduledArrival) <= new Date(form.scheduledDeparture)) {
        errs.scheduledArrival = 'Must be after departure';
      }
      if (!isEdit && new Date(form.scheduledDeparture) <= new Date()) {
        errs.scheduledDeparture = 'Must be in the future';
      }
    }
    if (!form.economyPrice    || Number(form.economyPrice)    < 0) errs.economyPrice    = 'Must be ≥ 0';
    if (!form.businessPrice   || Number(form.businessPrice)   < 0) errs.businessPrice   = 'Must be ≥ 0';
    if (!form.firstClassPrice || Number(form.firstClassPrice) < 0) errs.firstClassPrice = 'Must be ≥ 0';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (conflict) return; // block submit if conflict detected

    // Build clean payload
    const payload = {
      ...form,
      flightNumber:   form.flightNumber.toUpperCase().trim(),
      economyPrice:   Number(form.economyPrice),
      businessPrice:  Number(form.businessPrice),
      firstClassPrice:Number(form.firstClassPrice),
    };
    // Remove empty optional fields
    ['departureTerminal','arrivalTerminal','departureGate','arrivalGate','runway','parkingBay','notes'].forEach((k) => {
      if (!payload[k]) delete payload[k];
    });

    onSubmit(payload);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>

      {/* ── Conflict banner ─────────────────────────────────────────────── */}
      {conflict && (
        <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
          <FiAlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Resource Conflict Detected</p>
            <p className="text-red-400/80 text-xs mt-0.5">{conflict.message}</p>
          </div>
        </div>
      )}
      {conflictOk && !checkingConflict && form.aircraft && form.scheduledDeparture && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-fade-in">
          <FiCheckCircle size={15} className="text-emerald-400" />
          <p className="text-emerald-400 text-sm">No resource conflicts detected</p>
        </div>
      )}
      {checkingConflict && (
        <div className="flex items-center gap-2 p-3 bg-dark-700/50 border border-dark-600 rounded-xl">
          <LoadingSpinner size="sm" />
          <p className="text-dark-400 text-sm">Checking for conflicts…</p>
        </div>
      )}

      {/* ── Flight identity ──────────────────────────────────────────────── */}
      <SECTION title="Flight Identity">
        <Field label="Flight Number" required error={errors.flightNumber}>
          <input
            value={form.flightNumber}
            onChange={set('flightNumber')}
            className={`input uppercase ${errors.flightNumber ? 'input-error' : ''}`}
            placeholder="AA101"
            maxLength={10}
          />
        </Field>
        <Field label="Airline" required error={errors.airline}>
          <select value={form.airline} onChange={set('airline')} className={`input ${errors.airline ? 'input-error' : ''}`}>
            <option value="">Select airline</option>
            {resources.airlines.map((a) => (
              <option key={a._id} value={a._id}>{a.name} ({a.code})</option>
            ))}
          </select>
        </Field>
        <Field label="Aircraft" required error={errors.aircraft} hint="Only available/assigned aircraft shown">
          <select value={form.aircraft} onChange={set('aircraft')} className={`input ${errors.aircraft ? 'input-error' : ''}`}>
            <option value="">Select aircraft</option>
            {resources.aircraft
              .filter((a) => ['available', 'assigned'].includes(a.status))
              .map((a) => (
                <option key={a._id} value={a._id}>
                  {a.registrationNumber} — {a.model} ({a.totalSeats} seats)
                </option>
              ))}
          </select>
        </Field>
      </SECTION>

      {/* ── Route ───────────────────────────────────────────────────────── */}
      <SECTION title="Route">
        <Field label="Departure Airport" required error={errors.departureAirport}>
          <select value={form.departureAirport} onChange={set('departureAirport')} className={`input ${errors.departureAirport ? 'input-error' : ''}`}>
            <option value="">Select airport</option>
            {resources.airports.map((a) => (
              <option key={a._id} value={a._id}>{a.code} — {a.city}, {a.country}</option>
            ))}
          </select>
        </Field>
        <Field label="Arrival Airport" required error={errors.arrivalAirport}>
          <select value={form.arrivalAirport} onChange={set('arrivalAirport')} className={`input ${errors.arrivalAirport ? 'input-error' : ''}`}>
            <option value="">Select airport</option>
            {resources.airports
              .filter((a) => a._id !== form.departureAirport)
              .map((a) => (
                <option key={a._id} value={a._id}>{a.code} — {a.city}, {a.country}</option>
              ))}
          </select>
        </Field>
      </SECTION>

      {/* ── Schedule ────────────────────────────────────────────────────── */}
      <SECTION title="Schedule">
        <Field label="Scheduled Departure" required error={errors.scheduledDeparture}>
          <input
            type="datetime-local"
            value={form.scheduledDeparture}
            onChange={set('scheduledDeparture')}
            className={`input ${errors.scheduledDeparture ? 'input-error' : ''}`}
          />
        </Field>
        <Field label="Scheduled Arrival" required error={errors.scheduledArrival}>
          <input
            type="datetime-local"
            value={form.scheduledArrival}
            onChange={set('scheduledArrival')}
            min={form.scheduledDeparture}
            className={`input ${errors.scheduledArrival ? 'input-error' : ''}`}
          />
        </Field>
      </SECTION>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <SECTION title="Pricing (USD)">
        <Field label="Economy" required error={errors.economyPrice}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">$</span>
            <input type="number" min="0" step="1" value={form.economyPrice} onChange={set('economyPrice')}
              className={`input pl-6 ${errors.economyPrice ? 'input-error' : ''}`} />
          </div>
        </Field>
        <Field label="Business" required error={errors.businessPrice}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">$</span>
            <input type="number" min="0" step="1" value={form.businessPrice} onChange={set('businessPrice')}
              className={`input pl-6 ${errors.businessPrice ? 'input-error' : ''}`} />
          </div>
        </Field>
        <Field label="First Class" required error={errors.firstClassPrice}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">$</span>
            <input type="number" min="0" step="1" value={form.firstClassPrice} onChange={set('firstClassPrice')}
              className={`input pl-6 ${errors.firstClassPrice ? 'input-error' : ''}`} />
          </div>
        </Field>
      </SECTION>

      {/* ── Resource assignments ─────────────────────────────────────────── */}
      <SECTION title="Resource Assignments (optional)">
        <Field label="Departure Terminal">
          <select value={form.departureTerminal} onChange={set('departureTerminal')} className="input">
            <option value="">None</option>
            {depTerminals.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.code})</option>)}
          </select>
        </Field>
        <Field label="Arrival Terminal">
          <select value={form.arrivalTerminal} onChange={set('arrivalTerminal')} className="input">
            <option value="">None</option>
            {arrTerminals.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.code})</option>)}
          </select>
        </Field>
        <Field label="Departure Gate" hint="Conflict checked automatically">
          <select value={form.departureGate} onChange={set('departureGate')} className="input">
            <option value="">None</option>
            {depGates.map((g) => <option key={g._id} value={g._id}>Gate {g.gateNumber}</option>)}
          </select>
        </Field>
        <Field label="Arrival Gate">
          <select value={form.arrivalGate} onChange={set('arrivalGate')} className="input">
            <option value="">None</option>
            {arrGates.map((g) => <option key={g._id} value={g._id}>Gate {g.gateNumber}</option>)}
          </select>
        </Field>
        <Field label="Runway" hint="30-min slot buffer enforced">
          <select value={form.runway} onChange={set('runway')} className="input">
            <option value="">None</option>
            {depRunways.map((r) => <option key={r._id} value={r._id}>{r.runwayId}</option>)}
          </select>
        </Field>
      </SECTION>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <div>
        <label className="label">Notes (optional)</label>
        <textarea value={form.notes} onChange={set('notes')} className="input" rows={2} placeholder="Internal notes…" />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !!conflict}
          className="btn-primary flex-1 justify-center py-2.5"
        >
          {submitting ? (
            <><LoadingSpinner size="sm" /> {isEdit ? 'Updating…' : 'Creating…'}</>
          ) : (
            isEdit ? 'Update Flight' : 'Create Flight'
          )}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
