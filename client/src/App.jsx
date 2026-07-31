import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { getMe } from './store/slices/authSlice';
import { addNotification } from './store/slices/notificationSlice';
import { initSocket } from './services/socket';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/public/Home';
import About from './pages/public/About';
import FlightSearch from './pages/public/FlightSearch';
import FlightStatus from './pages/public/FlightStatus';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AdminDashboard from './pages/admin/Dashboard';
import ManageFlights from './pages/admin/ManageFlights';
import ManageAircraft from './pages/admin/ManageAircraft';
import ManageAirlines from './pages/admin/ManageAirlines';
import ManageAirports from './pages/admin/ManageAirports';
import ManageInfrastructure from './pages/admin/ManageInfrastructure';
import ManageStaff from './pages/admin/ManageStaff';
import ManageUsers from './pages/admin/ManageUsers';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import AdminNotifications from './pages/admin/Notifications';
import PassengerDashboard from './pages/passenger/Dashboard';
import MyBookings from './pages/passenger/MyBookings';
import BookingDetail from './pages/passenger/BookingDetail';
import PaymentPage from './pages/passenger/PaymentPage';
import SeatSelection from './pages/passenger/SeatSelection';
import BookFlight from './pages/passenger/BookFlight';
import OnlineCheckin from './pages/passenger/OnlineCheckin';
import BoardingPassPage from './pages/passenger/BoardingPassPage';
import BaggageTracking from './pages/passenger/BaggageTracking';
import TravelHistory from './pages/passenger/TravelHistory';
import Profile from './pages/passenger/Profile';
import PassengerNotifications from './pages/passenger/Notifications';
import CheckinConsole from './pages/staff/CheckinConsole';
import BoardingConsole from './pages/staff/BoardingConsole';
import BaggageDesk from './pages/staff/BaggageDesk';
import SecurityDesk from './pages/staff/SecurityDesk';
import MaintenanceDashboard from './pages/staff/MaintenanceDashboard';
import StaffNotifications from './pages/staff/Notifications';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((s) => s.auth);
  const [initializing, setInitializing] = useState(Boolean(token));

  useEffect(() => {
    const boot = async () => {
      if (!token) { setInitializing(false); return; }
      await dispatch(getMe());
      setInitializing(false);
    };
    boot();
  }, [dispatch, token]);

  useEffect(() => {
    if (user?._id) {
      const socket = initSocket(user._id, user.role);
      socket.on('notification', (notif) => dispatch(addNotification(notif)));
    }
  }, [user?._id]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #1e293b',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/flights/search" element={<FlightSearch />} />
          <Route path="/flights/status" element={<FlightStatus />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin', 'airport_admin']} />}>
          <Route path="/admin" element={<DashboardLayout role="admin" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="flights" element={<ManageFlights />} />
            <Route path="aircraft" element={<ManageAircraft />} />
            <Route path="airlines" element={<ManageAirlines />} />
            <Route path="airports" element={<ManageAirports />} />
            <Route path="infrastructure" element={<ManageInfrastructure />} />
            <Route path="staff" element={<ManageStaff />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>
        </Route>

        {/* Passenger */}
        <Route element={<ProtectedRoute allowedRoles={['passenger']} />}>
          <Route path="/passenger" element={<DashboardLayout role="passenger" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PassengerDashboard />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="bookings/:id/payment" element={<PaymentPage />} />
            <Route path="bookings/:id/seats" element={<SeatSelection />} />
            <Route path="book-flight/:flightId" element={<BookFlight />} />
            <Route path="checkin" element={<OnlineCheckin />} />
            <Route path="boarding-pass/:bookingId" element={<BoardingPassPage />} />
            <Route path="baggage" element={<BaggageTracking />} />
            <Route path="history" element={<TravelHistory />} />
            <Route path="notifications" element={<PassengerNotifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Staff */}
        <Route element={<ProtectedRoute allowedRoles={['checkin_staff', 'boarding_staff', 'baggage_staff', 'security_officer', 'maintenance_staff', 'airline_manager', 'super_admin']} />}>
          <Route path="/staff" element={<DashboardLayout role="staff" />}>
            <Route index element={<Navigate to="checkin" replace />} />
            <Route path="checkin" element={<CheckinConsole />} />
            <Route path="boarding" element={<BoardingConsole />} />
            <Route path="baggage" element={<BaggageDesk />} />
            <Route path="security" element={<SecurityDesk />} />
            <Route path="maintenance" element={<MaintenanceDashboard />} />
            <Route path="notifications" element={<StaffNotifications />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
