import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Router Wrappers
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import FindDonors from './pages/public/FindDonors';
import EmergencyRequest from './pages/public/EmergencyRequest';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Donor Pages
import DonorDashboard from './pages/donor/DonorDashboard';
import DonorProfile from './pages/donor/DonorProfile';
import DonationHistory from './pages/donor/DonationHistory';

// Recipient Pages
import RecipientDashboard from './pages/recipient/RecipientDashboard';
import CreateRequest from './pages/recipient/CreateRequest';
import TrackRequest from './pages/recipient/TrackRequest';

// Hospital Pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import InventoryManager from './pages/hospital/InventoryManager';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AIInsightsPanel from './pages/admin/AIInsightsPanel';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-lightbg text-black font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/find-donors" element={<FindDonors />} />
              <Route path="/emergency-request" element={<EmergencyRequest />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                {/* Donor Specific Routes */}
                <Route element={<RoleRoute allowedRoles={['donor', 'admin']} />}>
                  <Route path="/donor/dashboard" element={<DonorDashboard />} />
                  <Route path="/donor/profile" element={<DonorProfile />} />
                  <Route path="/donor/history" element={<DonationHistory />} />
                </Route>

                {/* Recipient Specific Routes */}
                <Route element={<RoleRoute allowedRoles={['recipient', 'donor', 'hospital', 'admin']} />}>
                  <Route path="/recipient/dashboard" element={<RecipientDashboard />} />
                  <Route path="/recipient/create" element={<CreateRequest />} />
                  <Route path="/recipient/track/:id" element={<TrackRequest />} />
                </Route>

                {/* Hospital Specific Routes */}
                <Route element={<RoleRoute allowedRoles={['hospital', 'admin']} />}>
                  <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
                  <Route path="/hospital/inventory" element={<InventoryManager />} />
                </Route>

                {/* Admin Specific Routes */}
                <Route element={<RoleRoute allowedRoles={['admin']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/ai-insights" element={<AIInsightsPanel />} />
                </Route>
              </Route>

              {/* Fallback 404 Route */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
