import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { donorApi } from '../../api/donorApi';
import { requestApi } from '../../api/requestApi';
import { pingApi } from '../../api/pingApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import RequestCard from '../../components/cards/RequestCard';
import DonorProfileForm from '../../components/forms/DonorProfileForm';
import {
  Heart,
  Activity,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  PlusCircle,
  ChevronRight,
  Clock,
  FileText,
  Users,
  ShieldCheck,
  Send,
  XCircle
} from 'lucide-react';

const IndividualDashboard = () => {
  const { user, profile, setProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const { showSuccess, showError, showInfo } = useToast();

  // State
  const [liveRequests, setLiveRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [pendingPings, setPendingPings] = useState([]);

  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingMyReqs, setLoadingMyReqs] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingPings, setLoadingPings] = useState(true);

  const [pledgingId, setPledgingId] = useState(null);
  const [pledgeMsg, setPledgeMsg] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [respondingPingId, setRespondingPingId] = useState(null);

  // Fetch Donor Profile
  const fetchProfile = async () => {
    try {
      const res = await donorApi.getProfile();
      if (res.data && res.data.success) {
        setProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const fetchPendingPings = async () => {
    setLoadingPings(true);
    try {
      const res = await pingApi.getPendingPings();
      if (res.data && res.data.success) {
        setPendingPings(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending pings:', err);
    } finally {
      setLoadingPings(false);
    }
  };

  const handleRespondPing = async (pingId, decision) => {
    setRespondingPingId(pingId);
    try {
      const res = await pingApi.respondToPing(pingId, decision);
      if (res.data && res.data.success) {
        if (decision === 'accepted') {
          showSuccess('Emergency request accepted! Hospital has been notified.');
        } else {
          showInfo('Emergency request declined.');
        }
        fetchPendingPings();
        fetchHistory();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to respond to ping');
    } finally {
      setRespondingPingId(null);
    }
  };

  // Fetch Live Open Requests (for pledging)
  const fetchLiveRequests = async () => {
    setLoadingLive(true);
    try {
      const res = await requestApi.getRequests();
      if (res.data && res.data.success) {
        const active = (res.data.data || []).filter((r) =>
          ['open', 'matching', 'partially_fulfilled'].includes(r.status)
        );
        setLiveRequests(active);
      }
    } catch (err) {
      console.error('Failed to fetch live requests:', err);
    } finally {
      setLoadingLive(false);
    }
  };

  // Fetch My Created Requests
  const fetchMyRequests = async () => {
    setLoadingMyReqs(true);
    try {
      const res = await requestApi.getMyRequests();
      if (res.data && res.data.success) {
        setMyRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch my requests:', err);
    } finally {
      setLoadingMyReqs(false);
    }
  };

  // Fetch Donation History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await requestApi.getDonationHistory();
      if (res.data && res.data.success) {
        setDonationHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPendingPings();
    fetchLiveRequests();
    fetchMyRequests();
    fetchHistory();
  }, []);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      const newStatus = !profile.isAvailable;
      const res = await donorApi.updateProfile({ isAvailable: newStatus });
      if (res.data && res.data.success) {
        setProfile(res.data.data);
        showSuccess(`Standby status set to ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
      }
    } catch (err) {
      showError('Failed to update availability');
    }
  };

  const handlePledge = async (requestId) => {
    setPledgingId(requestId);
    setPledgeMsg('');
    try {
      const res = await requestApi.pledgeDonation({ requestId, unitsDonated: 1 });
      if (res.data && res.data.success) {
        setPledgeMsg('Donation pledged! Thank you for stepping up to save a life.');
        showSuccess('Donation pledged! Thank you for stepping up to save a life.');
        fetchLiveRequests();
        fetchProfile();
        fetchHistory();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to pledge donation');
    } finally {
      setPledgingId(null);
    }
  };

  const handleProfileSubmit = async (formData) => {
    setUpdatingProfile(true);
    setProfileMsg('');
    try {
      const res = await donorApi.updateProfile(formData);
      if (res.data && res.data.success) {
        setProfile(res.data.data);
        setProfileMsg('Donor profile updated successfully!');
        showSuccess('Donor profile updated successfully!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.errors?.map((e) => e.message).filter(Boolean).join('. ')
        || err.response?.data?.message
        || 'Failed to update profile';
      showError(errMsg);
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 page-enter">
      {/* Header Banner */}
      <div className="hero-glass-card relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight">
              Individual <span className="gradient-text-brand">Command Hub</span>
            </h1>
            <Badge accountType="user" />
            {profile?.bloodGroup && <Badge bloodGroup={profile.bloodGroup} />}
          </div>
          <p className="text-xs sm:text-sm font-medium text-secondary">
            Welcome back, <span className="font-bold text-primary">{user?.name}</span>! Manage your donor profile, broadcast emergency requests, and pledge blood donations in one place.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link
            to="/individual/create"
            className="btn-primary text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Emergency Request</span>
          </Link>

          {profile && (
            <div
              className="flex items-center space-x-3 px-4 py-2 rounded-2xl border border-theme bg-surface-glass"
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider block text-muted">Standby Availability</span>
                <span className={`text-xs font-black ${profile.isAvailable ? 'text-teal-600 dark:text-teal-400' : 'text-muted'}`}>
                  {profile.isAvailable ? 'ONLINE (ACTIVE)' : 'OFFLINE'}
                </span>
              </div>
              <button
                onClick={handleToggleAvailability}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  profile.isAvailable
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-secondary'
                }`}
              >
                Toggle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-theme pb-3 overflow-x-auto">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-rose-600/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-glow-brand'
              : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview & Standby</span>
        </button>

        <button
          onClick={() => setTab('pings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap relative cursor-pointer ${
            activeTab === 'pings'
              ? 'bg-rose-600/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-glow-brand'
              : pendingPings.length > 0
              ? 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/30 hover:bg-amber-400/20'
              : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
          }`}
        >
          <Send className={`w-4 h-4 ${pendingPings.length > 0 ? 'text-amber-500 animate-pulse' : ''}`} />
          <span>Requests For You ({pendingPings.length})</span>
          {pendingPings.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-1 -right-1" />
          )}
        </button>

        <button
          onClick={() => setTab('donor-profile')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'donor-profile'
              ? 'bg-rose-600/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-glow-brand'
              : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Donor Profile</span>
        </button>

        <button
          onClick={() => setTab('my-requests')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'my-requests'
              ? 'bg-rose-600/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-glow-brand'
              : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Requests ({myRequests.length})</span>
        </button>

        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'bg-rose-600/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-glow-brand'
              : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Donation History ({donationHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STANDBY */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Pending Pings Callout Banner */}
          {pendingPings.length > 0 && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-400/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 mt-0.5 shadow-md">
                  <Send className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-primary">
                    You have {pendingPings.length} Direct Emergency Request Ping(s)!
                  </h3>
                  <p className="text-xs text-secondary mt-1">
                    A medical facility has specifically requested your {profile?.bloodGroup || ''} blood donation for an emergency patient.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTab('pings')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md shrink-0 flex items-center space-x-1"
              >
                <span>Review Requests ({pendingPings.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {pledgeMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
              {pledgeMsg}
            </div>
          )}

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card hover={false}>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Blood Group</span>
              <span className="text-2xl font-black text-rose-500 block mt-2">{profile?.bloodGroup || 'Not Set'}</span>
            </Card>

            <Card hover={false}>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Completed donations</span>
              <span className="text-2xl font-black text-primary block mt-2">
                {donationHistory.filter((d) => d.status === 'completed').length}
              </span>
            </Card>

            <Card hover={false}>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">My Emergency Requests</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block mt-2">{myRequests.length}</span>
            </Card>

            <Card hover={false}>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Last Donation</span>
              <span className="text-sm font-bold text-secondary block mt-2">
                {profile?.lastDonationDate ? new Date(profile.lastDonationDate).toLocaleDateString() : 'None Recorded'}
              </span>
            </Card>
          </div>

          {/* Live Emergency Requests Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary flex items-center font-heading">
                <Activity className="w-5 h-5 mr-2 text-rose-500 animate-pulse" />
                Live Emergency Requests Feed
              </h2>
              <span className="text-xs text-secondary">Matching nearby donor & patient needs</span>
            </div>

            {loadingLive ? (
              <Loader text="Fetching live emergency blood requests..." />
            ) : liveRequests.length === 0 ? (
              <Card hover={false} className="text-center py-12">
                <p className="text-xs text-secondary">No open blood requests currently broadcast.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveRequests.map((req) => {
                  const isPledged = donationHistory.some(
                    (h) => (h.request?._id || h.request) === req._id && h.status === 'pledged'
                  );
                  return (
                    <RequestCard
                      key={req._id}
                      request={req}
                      isDonorCard={true}
                      onPledge={handlePledge}
                      isPledging={pledgingId === req._id}
                      isPledged={isPledged}
                      pledgeText={isPledged ? 'Pledged ✓' : 'Pledge Donation'}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DONOR PROFILE */}
      {activeTab === 'donor-profile' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-primary">Donor Profile & Medical Credentials</h2>
            <p className="text-secondary text-sm">
              Keep your blood group, contact coordinates, availability, and medical health flags up to date for smart matching algorithms.
            </p>
          </div>

          {profileMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
              {profileMsg}
            </div>
          )}

          <Card title="Blood Group & Standby Settings" icon={User} hover={false}>
            <DonorProfileForm initialData={profile || {}} onSubmit={handleProfileSubmit} loading={updatingProfile} />
          </Card>
        </div>
      )}

      {/* TAB 3: MY REQUESTS */}
      {activeTab === 'my-requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary font-heading">Your Broadcast Requests</h2>
              <p className="text-xs text-muted">Track real-time donor matching and request status.</p>
            </div>
            <Link
              to="/individual/create"
              className="btn-primary text-xs px-5 py-2.5 flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Request</span>
            </Link>
          </div>

          {loadingMyReqs ? (
            <Loader text="Loading your requests..." />
          ) : myRequests.length === 0 ? (
            <Card hover={false} className="text-center py-12">
              <p className="text-xs mb-4 text-secondary">You have not created any emergency blood requests yet.</p>
              <Link
                to="/individual/create"
                className="btn-primary text-xs px-4 py-2 rounded-xl inline-flex items-center"
              >
                Create First Request
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myRequests.map((req) => (
                <RequestCard
                  key={req._id}
                  request={req}
                  trackLink={`/individual/track/${req._id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DONATION HISTORY */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading tracking-tight">Your Lifesaving Donation History</h2>
            <p className="text-xs text-secondary">
              Track past pledges, completed blood donations, and verified hospital fulfillments.
            </p>
          </div>

          {loadingHistory ? (
            <Loader text="Loading your donation history..." />
          ) : donationHistory.length === 0 ? (
            <Card hover={false} className="text-center py-12">
              <p className="text-xs text-secondary">You haven't pledged or completed any donations yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {donationHistory.map((item) => (
                <div
                  key={item._id}
                  className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-theme hover:border-slate-300 dark:hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <Badge bloodGroup={item.request?.bloodGroup || 'O+'} />
                      <h4 className="text-base font-bold text-primary font-heading truncate">
                        {item.request?.patientName ? `Donation for ${item.request.patientName}` : 'Emergency Blood Request'}
                      </h4>
                      <Badge status={item.status} />
                    </div>
                    <div className="text-xs space-y-1.5 text-secondary">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="truncate">{item.request?.address || 'Medical Facility'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 shrink-0 text-sky-500" />
                        <span className="font-mono text-[11px]">Pledged on: {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 dark:border-white/10 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end bg-rose-500/5 dark:bg-rose-500/10 px-4 py-2.5 rounded-xl border border-rose-500/15">
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 block tracking-tight">
                      {item.unitsDonated} Unit(s)
                    </span>
                    <span className="text-[11px] text-muted block font-mono mt-0.5">
                      ID: {item._id.slice(-6)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* TAB: REQUESTS FOR YOU (PINGS) */}
      {activeTab === 'pings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-primary flex items-center font-heading tracking-tight">
                <Send className="w-5 h-5 mr-2 text-rose-500 animate-bounce" />
                Emergency Requests Specifically For You
              </h2>
              <p className="text-xs mt-1 text-secondary">
                Medical centers matched with your profile rely on your prompt response. Click Accept to notify the hospital.
              </p>
            </div>
          </div>

          {loadingPings ? (
            <Loader text="Loading your incoming request pings..." />
          ) : pendingPings.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Pending Emergency Requests"
              description="You have no pending direct request pings from hospitals. Check back soon!"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingPings.map((ping) => {
                const req = ping.requestId || {};
                const hosp = ping.hospitalId || {};
                const isResponding = respondingPingId === ping._id;

                return (
                  <Card
                    key={ping._id}
                    hover={false}
                    className="flex flex-col justify-between border"
                    style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.30)' }}
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge bloodGroup={req.bloodGroup} />
                          <div>
                            <h3 className="text-base font-bold text-primary">{req.patientName || 'Emergency Patient'}</h3>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                              Requested by {hosp.name || 'Medical Center'}
                            </span>
                          </div>
                        </div>
                        <Badge status={req.urgency || 'high'} />
                      </div>

                      {/* Info lines */}
                      <div
                        className="space-y-2 text-xs p-3.5 rounded-2xl border border-theme bg-surface"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted">Units Required:</span>
                          <span className="font-extrabold text-primary">{req.unitsNeeded || 1} Packet(s)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted">Delivery Address:</span>
                          <span className="font-medium text-secondary truncate max-w-[200px] flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500 shrink-0" />
                            {req.address}
                          </span>
                        </div>
                        {hosp.phone && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-muted">Hospital Hotline:</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center font-mono">
                              <Phone className="w-3.5 h-3.5 mr-1" /> {hosp.phone}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted">Ping Received:</span>
                          <span className="text-[11px] text-muted font-mono">{new Date(ping.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Accept vs Decline */}
                    <div className="pt-4 mt-4 border-t border-theme flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleRespondPing(ping._id, 'rejected')}
                        disabled={isResponding}
                        className="btn-secondary text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5"
                      >
                        <XCircle className="w-4 h-4 text-muted" />
                        <span>Decline</span>
                      </button>

                      <button
                        onClick={() => handleRespondPing(ping._id, 'accepted')}
                        disabled={isResponding}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isResponding ? 'animate-spin' : ''}`} />
                        <span>{isResponding ? 'Responding...' : 'Accept & Donate'}</span>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndividualDashboard;
