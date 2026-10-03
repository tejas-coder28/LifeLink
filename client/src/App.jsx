import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

// Router Wrappers
import ProtectedRoute from './routes/ProtectedRoute';
import AccountTypeRoute from './routes/RoleRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AIChatWidget from './components/ai/AIChatWidget';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import FindDonors from './pages/public/FindDonors';
import EmergencyRequest from './pages/public/EmergencyRequest';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Donor & Individual Pages
import CreateRequest from './pages/individual/CreateRequest';
import TrackRequest from './pages/individual/TrackRequest';
import DonorDashboard from './pages/donor/DonorDashboard';
import DonorProfile from './pages/donor/DonorProfile';
import DonationHistory from './pages/donor/DonationHistory';

// Hospital Pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import InventoryManager from './pages/hospital/InventoryManager';
import MatchingDonors from './pages/hospital/MatchingDonors';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import RequestManagement from './pages/admin/RequestManagement';
import AnalyticsPanel from './pages/admin/AnalyticsPanel';
import AIInsightsPanel from './pages/admin/AIInsightsPanel';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="flex flex-col min-h-screen text-slate-900 dark:text-slate-100 font-sans selection:bg-rose-500/30 selection:text-white transition-colors duration-200">
              {/* Animated background colour orbs — give glass cards something to blur against */}
              <div className="bg-orb bg-orb-1" aria-hidden="true" />
              <div className="bg-orb bg-orb-2" aria-hidden="true" />
              <div className="bg-orb bg-orb-3" aria-hidden="true" />

            <Navbar />
            <main className="flex-1 pt-24 sm:pt-28 pb-12">
              <ErrorBoundary>
                <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/find-donors" element={<FindDonors />} />
                <Route path="/emergency-request" element={<EmergencyRequest />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  {/* User / Donor Routes — all account types: user, individual, donor, recipient, admin */}
                  <Route element={<AccountTypeRoute allowedAccountTypes={['user', 'individual', 'donor', 'recipient', 'admin']} />}>
                    {/* Primary user dashboard */}
                    <Route path="/donor/dashboard" element={<DonorDashboard />} />
                    <Route path="/donor/profile" element={<DonorProfile />} />
                    <Route path="/donor/history" element={<DonationHistory />} />

                    {/* Create and track requests (unique pages) */}
                    <Route path="/individual/create" element={<CreateRequest />} />
                    <Route path="/individual/track/:id" element={<TrackRequest />} />

                    {/* Aliases: all resolve to the same donor dashboard */}
                    <Route path="/individual/dashboard" element={<DonorDashboard />} />
                    <Route path="/recipient/dashboard" element={<DonorDashboard />} />
                    <Route path="/recipient/create" element={<CreateRequest />} />
                    <Route path="/recipient/track/:id" element={<TrackRequest />} />
                  </Route>

                  {/* Hospital Specific Routes */}
                  <Route element={<AccountTypeRoute allowedAccountTypes={['hospital', 'admin']} />}>
                    <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
                    <Route path="/hospital/inventory" element={<InventoryManager />} />
                    <Route path="/hospital/matching" element={<MatchingDonors />} />
                  </Route>

                  {/* Admin Specific Routes */}
                  <Route element={<AccountTypeRoute allowedAccountTypes={['admin']} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/requests" element={<RequestManagement />} />
                    <Route path="/admin/analytics" element={<AnalyticsPanel />} />
                    <Route path="/admin/ai-insights" element={<AIInsightsPanel />} />
                  </Route>
                </Route>

                {/* Fallback 404 Route */}
                <Route path="*" element={<Home />} />
                </Routes>
              </ErrorBoundary>
            </main>
            <AIChatWidget />
            <Footer />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
