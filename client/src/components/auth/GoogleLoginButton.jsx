import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { signInWithGooglePopup } from '../../firebase';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';
import { Droplet, Phone, ArrowRight, X, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const GoogleLoginButton = ({ redirect = '/', label = 'Continue with Google' }) => {
  const { loginWithGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingIdToken, setPendingIdToken] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [phone, setPhone] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);

  const handleGoogleClick = async () => {
    setLoading(true);
    try {
      const { idToken, user } = await signInWithGooglePopup();
      const res = await loginWithGoogle({ idToken });

      if (res?.needsProfile) {
        setPendingIdToken(idToken);
        setPendingName(res.name || user.displayName || 'Donor');
        setShowModal(true);
      } else if (res?._id) {
        showSuccess(`Welcome, ${res.name}!`);
        handleRedirect(res);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google sign-in failed';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!bloodGroup) {
      showError('Please select your blood group to complete registration');
      return;
    }

    setSubmittingModal(true);
    try {
      const res = await loginWithGoogle({
        idToken: pendingIdToken,
        bloodGroup,
        phone,
      });

      if (res?._id) {
        showSuccess(`Account setup complete! Welcome, ${res.name}!`);
        setShowModal(false);
        handleRedirect(res);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to complete registration';
      showError(msg);
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleRedirect = (user) => {
    if (redirect && redirect !== '/') {
      navigate(redirect);
    } else {
      const type = user.accountType || user.role;
      switch (type) {
        case 'hospital':
          navigate('/hospital/dashboard');
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'user':
        case 'donor':
        default:
          navigate('/donor/dashboard');
          break;
      }
    }
  };

  return (
    <>
      <button
        type="button"
        id="google-signin-btn"
        onClick={handleGoogleClick}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl text-xs font-bold transition-all border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon />
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Modal for Blood Group and Phone when needsProfile === true */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
                <Droplet className="w-5 h-5 text-rose-500" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                Complete Donor Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hi {pendingName}! To connect you with emergency blood requests, please specify your blood group.
              </p>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                  Blood Group *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                    <Droplet className="h-4 w-4" />
                  </div>
                  <select
                    id="google-modal-blood-group"
                    required
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="glass-select w-full pl-10 text-xs px-3.5 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="" disabled>Select your blood group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg} className="bg-slate-900 text-white">
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="google-modal-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="glass-input w-full pl-10 text-xs px-3.5 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingModal || !bloodGroup}
                  className="btn-primary w-full py-3.5 rounded-xl text-xs justify-center flex items-center space-x-2 disabled:opacity-50"
                >
                  {submittingModal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete &amp; Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleLoginButton;
