/**
 * BookFlight.jsx
 * Multi-step booking page:
 *   Step 1 — Passenger details
 *   Step 2 — Payment
 *   Step 3 — Confirmation
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FlightSummaryCard from '../../components/booking/FlightSummaryCard';
import PassengerForm from '../../components/booking/PassengerForm';
import PriceBreakdown from '../../components/booking/PriceBreakdown';
import { formatCurrency } from '../../utils/helpers';
import {
  FiArrowRight, FiArrowLeft, FiCheckCircle, FiXCircle,
  FiCreditCard, FiLock, FiAlertCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const TAX_RATE = 0.12;
const SERVICE_FEE = 15;

const STEPS = ['Passengers', 'Payment', 'Confirmation'];

const defaultPassenger = (user, index) => ({
  firstName:      index === 0 ? (user?.firstName ?? '') : '',
  lastName:       index === 0 ? (user?.lastName  ?? '') : '',
  passportNumber: '',
  dateOfBirth:    '',
  nationality:    '',
  mealPreference: 'standard',
  specialAssistance: false,
  specialAssistanceDetails: '',
  seatNumber: '',
});

export default function BookFlight() {
  const { flightId }    = useParams();
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { user }        = useSelector((s) => s.auth);

  const seatClass      = searchParams.get('class')      || 'economy';
  const passengerCount = parseInt(searchParams.get('passengers') || '1', 10);
  const preSeats       = searchParams.get('seats')?.split(',').filter(Boolean) ?? [];

  const [step,       setStep]       = useState(0);
  const [flight,     setFlight]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null); // { booking, payment, success }
  const [fieldErrors,setFieldErrors]= useState({});

  const [passengers, setPassengers] = useState(
    Array.from({ length: passengerCount }, (_, i) => defaultPassenger(user, i))
  );

  const [payment, setPayment] = useState({
    paymentMethod: 'credit_card',
    cardBrand:     'Visa',
    cardLast4:     '4242',
  });

  useEffect(() => {
    api.get(`/flights/${flightId}`)
      .then((r) => {
        setFlight(r.data.flight);
        // Pre-fill seat numbers if coming from seat selection
        if (preSeats.length === passengerCount) {
          setPassengers((prev) => prev.map((p, i) => ({ ...p, seatNumber: preSeats[i] ?? '' })));
        }
      })
      .catch(() => toast.error('Flight not found'))
      .finally(() => setLoading(false));
  }, [flightId]);

  // ── Pricing ────────────────────────────────────────────────────────────────
  const priceMap   = flight ? { economy: flight.economyPrice, business: flight.businessPrice, first: flight.firstClassPrice } : {};
  const unitPrice  = priceMap[seatClass] ?? 0;
  const basePrice  = unitPrice * passengerCount;
  const taxes      = Math.round(basePrice * TAX_RATE);
  const fees       = SERVICE_FEE * passengerCount;
  const total      = basePrice + taxes + fees;

  // ── Passenger update ───────────────────────────────────────────────────────
  const updatePassenger = (idx, field, value) => {
    setPassengers((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    // Clear field error
    const key = `${idx}.${field}`;
    if (fieldErrors[key]) setFieldErrors((fe) => { const n = { ...fe }; delete n[key]; return n; });
  };

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const validatePassengers = () => {
    const errs = {};
    passengers.forEach((p, i) => {
      if (!p.firstName.trim()) errs[`${i}.firstName`] = 'Required';
      if (!p.lastName.trim())  errs[`${i}.lastName`]  = 'Required';
    });
    return errs;
  };

  const handleNextStep = () => {
    if (step === 0) {
      const errs = validatePassengers();
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit booking ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/bookings', {
        flightId,
        passengers: passengers.map((p) => ({
          firstName:      p.firstName.trim(),
          lastName:       p.lastName.trim(),
          passportNumber: p.passportNumber || undefined,
          dateOfBirth:    p.dateOfBirth    || undefined,
          nationality:    p.nationality    || undefined,
          mealPreference: p.mealPreference,
          specialAssistance: p.specialAssistance,
          specialAssistanceDetails: p.specialAssistanceDetails || undefined,
        })),
        seatClass,
        seatNumbers:   preSeats.length === passengerCount ? preSeats : undefined,
        paymentMethod: payment.paymentMethod,
        cardLast4:     payment.cardLast4,
        cardBrand:     payment.cardBrand,
      });

      setResult(data);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (data.paymentSuccess) {
        toast.success(`Booking confirmed! PNR: ${data.booking.pnr}`);
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!flight) return <div className="text-center py-20 text-dark-400">Flight not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Book Flight</h1>
        <p className="text-dark-400 text-sm mt-1">
          {flight.flightNumber} · {flight.departureAirport?.code} → {flight.arrivalAirport?.code}
        </p>
      </div>

      {/* Step indicator */}
      {step < 2 && (
        <div className="flex items-center gap-2">
          {STEPS.slice(0, 2).map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-primary-400' : 'text-dark-600'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                  i < step  ? 'bg-primary-600 border-primary-600 text-white' :
                  i === step ? 'border-primary-500 text-primary-400' :
                  'border-dark-600 text-dark-600'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 2 && <div className="flex-1 h-px bg-dark-700 max-w-[60px]" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Flight summary (always visible) */}
      <FlightSummaryCard flight={flight} seatClass={seatClass} passengerCount={passengerCount} />

      {/* ── Step 0: Passengers ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          {passengers.map((p, i) => (
            <PassengerForm
              key={i}
              index={i}
              passenger={p}
              onChange={updatePassenger}
              errors={Object.fromEntries(
                Object.entries(fieldErrors)
                  .filter(([k]) => k.startsWith(`${i}.`))
                  .map(([k, v]) => [k.split('.')[1], v])
              )}
            />
          ))}

          <PriceBreakdown
            basePrice={basePrice} taxes={taxes} fees={fees} total={total}
            passengerCount={passengerCount} seatClass={seatClass}
          />

          <button onClick={handleNextStep} className="btn-primary w-full justify-center py-3">
            Continue to Payment <FiArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 1: Payment ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <FiCreditCard size={18} className="text-primary-400" />
              Payment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Payment Method</label>
                <select
                  value={payment.paymentMethod}
                  onChange={(e) => setPayment((p) => ({ ...p, paymentMethod: e.target.value }))}
                  className="input"
                >
                  {[
                    ['credit_card',   'Credit Card'],
                    ['debit_card',    'Debit Card'],
                    ['paypal',        'PayPal'],
                    ['bank_transfer', 'Bank Transfer'],
                  ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {['credit_card', 'debit_card'].includes(payment.paymentMethod) && (
                <>
                  <div>
                    <label className="label">Card Brand</label>
                    <select
                      value={payment.cardBrand}
                      onChange={(e) => setPayment((p) => ({ ...p, cardBrand: e.target.value }))}
                      className="input"
                    >
                      {['Visa', 'Mastercard', 'Amex', 'Discover'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Card Last 4 Digits</label>
                    <input
                      value={payment.cardLast4}
                      onChange={(e) => setPayment((p) => ({ ...p, cardLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      className="input font-mono tracking-widest"
                      placeholder="4242"
                      maxLength={4}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 mt-4 p-3 bg-dark-700/40 rounded-xl">
              <FiLock size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-2xs text-dark-400">
                This is a demo system. No real payment is processed. All transactions are simulated.
              </p>
            </div>
          </div>

          <PriceBreakdown
            basePrice={basePrice} taxes={taxes} fees={fees} total={total}
            passengerCount={passengerCount} seatClass={seatClass}
          />

          {/* Passenger summary */}
          <div className="card">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Passenger Summary</p>
            <div className="space-y-2">
              {passengers.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-dark-200">{p.firstName} {p.lastName}</span>
                  <div className="flex items-center gap-2">
                    {p.seatNumber && (
                      <span className="font-mono text-2xs text-dark-400 bg-dark-700 px-2 py-0.5 rounded">
                        {p.seatNumber}
                      </span>
                    )}
                    <span className="text-dark-500 text-2xs capitalize">{p.mealPreference}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1 justify-center py-3">
              <FiArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex-1 justify-center py-3"
            >
              {submitting ? (
                <><LoadingSpinner size="sm" /> Processing…</>
              ) : (
                <>Confirm &amp; Pay {formatCurrency(total)} <FiArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Confirmation ───────────────────────────────────────────── */}
      {step === 2 && result && (
        <div className="space-y-5 animate-fade-in">
          {/* Status banner */}
          <div className={`card text-center ${result.paymentSuccess ? 'border-emerald-700/40 bg-emerald-900/10' : 'border-red-700/40 bg-red-900/10'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result.paymentSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {result.paymentSuccess
                ? <FiCheckCircle size={32} className="text-emerald-400" />
                : <FiXCircle     size={32} className="text-red-400" />}
            </div>
            <h2 className="text-xl font-bold text-dark-100 mb-1">
              {result.paymentSuccess ? 'Booking Confirmed!' : 'Payment Failed'}
            </h2>
            <p className="text-dark-400 text-sm">
              {result.paymentSuccess
                ? `Your booking is confirmed. PNR: ${result.booking.pnr}`
                : 'Your payment was declined. Please try again with a different payment method.'}
            </p>
          </div>

          {result.paymentSuccess && (
            <>
              {/* Booking details */}
              <div className="card space-y-3">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Booking Details</p>
                {[
                  ['PNR',         result.booking.pnr,                    'font-mono font-bold text-primary-400'],
                  ['Flight',      result.booking.flight?.flightNumber,   ''],
                  ['Route',       `${result.booking.flight?.departureAirport?.code} → ${result.booking.flight?.arrivalAirport?.code}`, ''],
                  ['Class',       result.booking.seatClass,              'capitalize'],
                  ['Passengers',  result.booking.passengers?.length,     ''],
                  ['Total Paid',  formatCurrency(result.booking.totalAmount), 'text-primary-400 font-bold'],
                  ['Invoice',     result.payment?.invoiceNumber,         'font-mono text-xs'],
                ].map(([label, value, cls]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-dark-400">{label}</span>
                    <span className={`text-dark-200 ${cls}`}>{value ?? '—'}</span>
                  </div>
                ))}
              </div>

              {/* Seat assignments */}
              <div className="card">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Seat Assignments</p>
                <div className="space-y-2">
                  {result.booking.passengers?.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-dark-700/40 rounded-lg px-3 py-2">
                      <span className="text-sm text-dark-200">{p.firstName} {p.lastName}</span>
                      <span className="font-mono text-sm text-dark-100 bg-dark-600 px-2 py-0.5 rounded">
                        {p.seatNumber ?? 'TBD'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next steps */}
              <div className="card bg-primary-900/20 border-primary-700/30">
                <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">Next Steps</p>
                <ul className="space-y-1.5 text-sm text-dark-300">
                  <li>• Check-in opens 24 hours before departure</li>
                  <li>• Online check-in closes 1 hour before departure</li>
                  <li>• A confirmation email has been sent to {user?.email}</li>
                </ul>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => navigate('/passenger/bookings')} className="btn-primary flex-1 justify-center py-2.5">
              View My Bookings
            </button>
            {result.paymentSuccess && (
              <button
                onClick={() => navigate(`/passenger/checkin?pnr=${result.booking.pnr}`)}
                className="btn-secondary flex-1 justify-center py-2.5"
              >
                Online Check-in
              </button>
            )}
            {!result.paymentSuccess && (
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-2.5">
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
