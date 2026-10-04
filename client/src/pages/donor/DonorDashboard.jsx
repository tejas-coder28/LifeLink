import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { donorApi } from '../../api/donorApi';
import { requestApi } from '../../api/requestApi';
import { notificationApi } from '../../api/notificationApi';
import { hospitalApi } from '../../api/hospitalApi';
import { pingApi } from '../../api/pingApi';

import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/cards/StatCard';
import RequestCard from '../../components/cards/RequestCard';
import DonorProfileForm from '../../components/forms/DonorProfileForm';
import { canDonate, DONATION_COOLDOWN_DAYS } from '../../utils/bloodCompatibility';

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
  Bell,
  Building2,
  ShieldCheck,
  Check,
  XCircle,
  Send
} from 'lucide-react';

const DonorDashboard = () => {
  const { user, profile, setProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [dismissedConfirmBanner, setDismissedConfirmBanner] = useState(false);

  // State Data
  const [liveRequests, setLiveRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [pendingPings, setPendingPings] = useState([]);

  // Loaders
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingPings, setLoadingPings] = useState(true);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pledgingId, setPledgingId] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [respondingPingId, setRespondingPingId] = useState(null);

  const fetchDonorProfile = async () => {
    try {
      const res = await donorApi.getProfile();
      if (res.data && res.data.success) {
        setProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch donor profile:', err);
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
          showSuccess('Emergency request declined.');
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

  const fetchLiveRequests = async () => {
    setLoadingLive(true);
    try {
      const res = await requestApi.getRequests();
      if (res.data && res.data.success) {
        const active = (res.data.data || []).filter((r) => {
          if (!['open', 'matching', 'partially_fulfilled'].includes(r.status)) return false;
          const z = r.unitsFromDonors !== undefined && r.unitsFromDonors !== null && r.unitsFromDonors > 0
            ? r.unitsFromDonors
            : Math.max(0, (r.unitsNeeded || 0) - (r.unitsFromStock || 0));
          return z > 0;
        });
        setLiveRequests(active);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingLive(false);
    }
  };


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

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await notificationApi.getMyNotifications();
      if (res.data && res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const res = await hospitalApi.getAllHospitals();
      if (res.data && res.data.success) {
        setHospitals(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
    }
  };

  useEffect(() => {
    fetchDonorProfile();
    fetchPendingPings();
    fetchLiveRequests();
    fetchHistory();
    fetchNotifications();
    fetchHospitals();
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
      showError('Failed to update availability status');
    }
  };

  const handlePledge = async (requestId) => {
    setPledgingId(requestId);
    try {
      const res = await requestApi.pledgeDonation({ requestId, unitsDonated: 1 });
      if (res.data && res.data.success) {
        showSuccess('Donation pledged! Thank you for stepping up to save a life.');
        fetchLiveRequests();
        fetchDonorProfile();
        fetchHistory();
        if (selectedRequest) setSelectedRequest(null);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to pledge donation');
    } finally {
      setPledgingId(null);
    }
  };

  const handleProfileSubmit = async (formData) => {
    setUpdatingProfile(true);
    try {
      const res = await donorApi.updateProfile(formData);
      if (res.data && res.data.success) {
        setProfile(res.data.data);
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

  const handleMarkNotifRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // Set of request IDs the donor has already pledged to or completed
  const pledgedRequestIds = new Set(
    (donationHistory || [])
      .filter((d) => ['pledged', 'completed'].includes(d.status))
      .map((d) => (d.request?._id || d.request)?.toString())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* Banner Header */}
      <div className="hero-glass-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-3xl font-black text-primary font-heading">Donor Portal</h1>
            <Badge accountType="donor" />
            {profile?.bloodGroup && <Badge bloodGroup={profile.bloodGroup} />}
          </div>
          <p className="text-xs sm:text-sm text-secondary">
            Welcome back, <span className="font-bold text-primary">{user?.name}</span>! Respond to live emergency requests, manage your profile, and track your donation impact.
          </p>
        </div>

        {/* Availability Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {profile && (
            <div className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div>
                <span className="text-[10px] font-bold block text-muted">Standby Status</span>
                <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                  {profile.isAvailable ? '● ONLINE (ACTIVE)' : '○ OFFLINE'}
                </span>
              </div>
              <button
                onClick={handleToggleAvailability}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all"
                style={profile.isAvailable
                  ? { background: 'rgba(34,200,160,0.20)', color: 'var(--teal-500)', border: '1px solid rgba(34,200,160,0.40)' }
                  : { background: 'rgba(100,116,139,0.12)', color: 'var(--text-secondary)', border: '1px solid rgba(100,116,139,0.25)' }
                }
              >
                Toggle Status
              </button>
            </div>
          )}
        </div>
      </div>

      {/* One-time Blood Group Confirmation Banner for Unconfirmed Accounts */}
      {profile && !profile.bloodGroupConfirmed && !dismissedConfirmBanner && (
        <div
          className="p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d' }}
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <span className="font-extrabold text-sm text-amber-300 block">Please confirm your blood group</span>
              <span className="text-xs text-amber-200/80">Your profile blood group was set by default. Please verify your exact blood group so medical matches are accurate.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('profile')}
              className="btn-primary text-xs px-3.5 py-1.5 rounded-xl whitespace-nowrap"
            >
              Confirm in Profile
            </button>
            <button
              onClick={() => setDismissedConfirmBanner(true)}
              className="text-xs px-2.5 py-1.5 rounded-xl text-muted hover:text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tab-list overflow-x-auto flex-nowrap">
        {[
          { id: 'overview',       icon: Activity,  label: 'Overview' },
          { id: 'requests',       icon: Heart,     label: `Requests (${liveRequests.length})` },
          { id: 'pings',          icon: Send,      label: `For You (${pendingPings.length})`, badge: pendingPings.length > 0 },
          { id: 'profile',        icon: User,      label: 'Profile & Health' },
          { id: 'history',        icon: Clock,     label: `History (${donationHistory.length})` },
          { id: 'notifications',  icon: Bell,      label: `Alerts (${notifications.filter(n => !n.isRead).length})` },
          { id: 'camps',          icon: Building2, label: 'Hospitals' },
        ].map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`tab-item whitespace-nowrap relative ${activeTab === id ? 'active' : ''}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {badge && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Pending Pings Callout Banner */}
          {pendingPings.length > 0 && (
            <div className="p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 emergency-pulse-amber"
              style={{ background: 'rgba(245,158,11,0.10)', border: '2px solid rgba(245,158,11,0.40)' }}>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-md"
                  style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.40)' }}>
                  <Send className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-primary">
                    {pendingPings.length} Direct Emergency Ping{pendingPings.length > 1 ? 's' : ''} for You!
                  </h3>
                  <p className="text-xs mt-1 text-secondary">
                    A hospital matched your <span className="font-bold text-amber-600 dark:text-amber-400">{profile?.bloodGroup || ''}</span> blood group for an emergency patient.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTab('pings')}
                className="btn-primary px-5 py-2.5 text-xs shrink-0"
              >
                <span>Review ({pendingPings.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Registered Blood Group"
              value={profile?.bloodGroup || 'Not Set'}
              icon={Heart}
              color="rose"
            />
            <StatCard
              title="Standby Status"
              value={profile?.isAvailable ? 'ONLINE' : 'OFFLINE'}
              icon={ShieldCheck}
              color={profile?.isAvailable ? 'emerald' : 'slate'}
            />
            <StatCard
              title="Last Donation"
              value={profile?.lastDonationDate ? new Date(profile.lastDonationDate).toLocaleDateString() : 'None'}
              icon={Calendar}
              color="sky"
            />
            <StatCard
              title="Completed donations"
              value={donationHistory.filter((d) => d.status === 'completed').length}
              icon={CheckCircle2}
              color="amber"
            />
          </div>

          {/* Active Live Emergency Requests Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-primary flex items-center font-heading">
                <Activity className="w-5 h-5 mr-2 animate-pulse text-rose-600 dark:text-rose-400" />
                Live Emergency Blood Needs
              </h2>
              <button onClick={() => setTab('requests')} className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline transition-colors cursor-pointer">
                View All →
              </button>
            </div>

            {loadingLive ? (
              <Loader text="Fetching open blood requests..." />
            ) : liveRequests.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No Open Requests Right Now"
                description="All regional blood requests have been responded to."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveRequests.slice(0, 4).map((req) => {
                  const hasPledged = pledgedRequestIds.has(req._id?.toString());
                  return (
                    <RequestCard
                      key={req._id}
                      request={req}
                      isDonorCard={true}
                      donorBloodGroup={profile?.bloodGroup}
                      onSelect={setSelectedRequest}
                      onPledge={handlePledge}
                      isPledging={pledgingId === req._id}
                      isPledged={hasPledged}
                      pledgeText={hasPledged ? 'Pledged ✓' : 'Respond / Pledge'}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BLOOD REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-primary font-heading">Broadcast Blood Requests</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Live emergency needs waiting for eligible donor response.</p>
            </div>
          </div>

          {loadingLive ? (
            <Loader text="Loading blood requests..." />
          ) : liveRequests.length === 0 ? (
            <EmptyState icon={Activity} title="No Blood Requests Broadcast" description="There are currently no active emergency blood requests in your region." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liveRequests.map((req) => {
                const hasPledged = pledgedRequestIds.has(req._id?.toString());
                return (
                  <RequestCard
                    key={req._id}
                    request={req}
                    isDonorCard={true}
                    donorBloodGroup={profile?.bloodGroup}
                    onSelect={setSelectedRequest}
                    onPledge={handlePledge}
                    isPledging={pledgingId === req._id}
                    isPledged={hasPledged}
                    pledgeText={hasPledged ? 'Pledged ✓' : 'Respond / Pledge'}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE & HEALTH */}
      {activeTab === 'profile' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading">Donor Profile & Medical Credentials</h2>
            <p className="text-xs text-secondary">
              Keep your blood group, age, gender, contact, location, and health flags up to date.
            </p>
          </div>

          <Card title="Blood & Location Credentials" icon={User} hover={false}>
            <DonorProfileForm initialData={profile || {}} onSubmit={handleProfileSubmit} loading={updatingProfile} />
          </Card>
        </div>
      )}

      {/* TAB 4: DONATION HISTORY */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading">Donation Impact History</h2>
            <p className="text-xs text-secondary">Track past pledges, completed blood donations, and verified hospital fulfillments.</p>
          </div>

          {loadingHistory ? (
            <Loader text="Loading donation history..." />
          ) : donationHistory.length === 0 ? (
            <EmptyState icon={Clock} title="No Past Donations Recorded" description="You haven't pledged or completed any blood donations yet." />
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

      {/* TAB 5: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading">Notifications & Alerts</h2>
            <p className="text-xs text-secondary">In-app alerts for nearby emergency requests and donation reminders.</p>
          </div>

          {loadingNotifs ? (
            <Loader text="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No Notifications" description="You have no unread notifications or emergency match alerts." />
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  className="p-4 rounded-2xl border transition-all flex items-start justify-between gap-4"
                  style={notif.isRead
                    ? { background: 'rgba(15,23,42,0.02)', borderColor: 'var(--border)' }
                    : { background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.25)' }
                  }
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-primary">{notif.title}</h4>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />}
                    </div>
                    <p className="text-xs leading-relaxed text-secondary">{notif.message}</p>
                    <span className="text-[10px] block text-muted">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkNotifRead(notif._id)}
                      className="text-xs font-bold flex items-center shrink-0 transition-colors text-secondary hover:text-primary"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: HOSPITALS & CAMPS */}
      {activeTab === 'camps' && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading">Partner Hospitals & Donation Camps</h2>
            <p className="text-xs text-secondary">Verified medical facilities accepting blood donations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map((hosp) => (
              <div key={hosp._id} className="glass-card glass-card-hover p-5 sm:p-6 rounded-2xl flex flex-col space-y-3 border-theme">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary font-heading">{hosp.name}</h3>
                      <span className="text-xs text-secondary">{hosp.licenseNumber || 'Medical Facility'}</span>
                    </div>
                  </div>
                  <Badge status={hosp.isVerified ? 'verified' : 'pending'} text={hosp.isVerified ? 'VERIFIED' : 'PENDING'} />
                </div>

                <div className="space-y-1.5 text-xs pt-3 border-t border-slate-200/80 dark:border-white/10 text-secondary">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{hosp.address || 'Delhi NCR'}</span>
                  </div>
                  {hosp.phone && (
                    <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{hosp.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: REQUESTS FOR YOU (PINGS) */}
      {activeTab === 'pings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-primary flex items-center gap-2 font-heading">
                <Send className="w-5 h-5 animate-bounce text-amber-500" />
                Emergency Requests For You
              </h2>
              <p className="text-xs mt-1 text-secondary">
                Hospitals matched to your profile need your prompt response. Accept to notify the hospital directly.
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
                  <div
                    key={ping._id}
                    className="glass-card flex flex-col justify-between rounded-2xl overflow-hidden border border-amber-500/40 bg-amber-500/5 transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="p-5 sm:p-6 pb-4 sm:pb-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="shrink-0 mt-0.5">
                            <Badge bloodGroup={req.bloodGroup} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-extrabold text-primary font-heading truncate">
                              {req.patientName || 'Emergency Patient'}
                            </h3>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                              Requested by {hosp.name || 'Medical Center'}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          <Badge status={req.urgency || 'high'} />
                        </div>
                      </div>
                    </div>

                    {/* Full width divider */}
                    <div className="w-full border-t border-slate-200/80 dark:border-white/10" />

                    {/* Details */}
                    <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-2.5 text-xs text-secondary">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted">Units Required:</span>
                        <span className="font-extrabold text-primary">{req.unitsNeeded || 1} Packet(s)</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-muted shrink-0">Location:</span>
                        <span className="font-medium flex items-center gap-1 truncate text-secondary">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span className="truncate">{req.address}</span>
                        </span>
                      </div>
                      {hosp.phone && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted">Hospital Hotline:</span>
                          <span className="font-bold flex items-center gap-1 text-teal-600 dark:text-teal-400">
                            <Phone className="w-3.5 h-3.5" /> {hosp.phone}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted">Ping Received:</span>
                        <span className="text-[11px] text-muted font-mono">
                          {new Date(ping.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Full width divider */}
                    <div className="w-full border-t border-slate-200/80 dark:border-white/10" />

                    {/* Footer */}
                    <div className="p-5 sm:p-6 pt-4 sm:pt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                      <button
                        onClick={() => handleRespondPing(ping._id, 'rejected')}
                        disabled={isResponding}
                        className="btn-secondary w-full sm:w-auto px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Decline</span>
                      </button>

                      <button
                        onClick={() => handleRespondPing(ping._id, 'accepted')}
                        disabled={isResponding}
                        className="btn-primary w-full sm:w-auto px-5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500"
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isResponding ? 'animate-spin' : ''}`} />
                        <span>{isResponding ? 'Responding...' : 'Accept & Donate'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View Request Details Modal */}
      <Modal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title="Emergency Request Details"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center space-x-3">
                <Badge bloodGroup={selectedRequest.bloodGroup} />
                <div>
                  <h3 className="text-lg font-black text-primary font-heading">{selectedRequest.patientName}</h3>
                  <span className="text-xs text-muted font-mono">ID: {selectedRequest._id}</span>
                </div>
              </div>
              <Badge status={selectedRequest.urgency} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block font-semibold mb-0.5 text-muted">Units Required</span>
                <span className="font-bold text-primary text-sm">{selectedRequest.unitsNeeded} Packets</span>
              </div>
              <div>
                <span className="block font-semibold mb-0.5 text-muted">Required By</span>
                <span className="font-bold text-primary text-sm">{new Date(selectedRequest.requiredByDate).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="block font-semibold mb-0.5 text-muted">Hospital Location</span>
                <span className="font-bold text-primary text-sm">{selectedRequest.address}</span>
              </div>
              {selectedRequest.notes && (
                <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                  <span className="block font-semibold mb-0.5 text-muted">Medical Notes</span>
                  <p className="text-xs italic mt-1 text-secondary">"{selectedRequest.notes}"</p>
                </div>
              )}
            </div>

            {(() => {
              const isComp = profile?.bloodGroup ? canDonate(profile.bloodGroup, selectedRequest.bloodGroup) : true;
              return (
                <div className="space-y-2">
                  {!isComp && (
                    <p className="text-xs text-amber-400 font-semibold text-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      Your blood group ({profile?.bloodGroup}) is not compatible with patient need ({selectedRequest.bloodGroup}).
                    </p>
                  )}
                  <button
                    onClick={() => isComp && handlePledge(selectedRequest._id)}
                    disabled={pledgingId === selectedRequest._id || !isComp}
                    className={`w-full py-3.5 rounded-xl text-xs justify-center flex items-center gap-2 transition-all ${
                      !isComp
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'btn-primary'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isComp ? 'fill-white' : 'text-slate-500'}`} />
                    <span>
                      {pledgingId === selectedRequest._id
                        ? 'Pledging...'
                        : !isComp
                        ? 'Not compatible with your blood group'
                        : 'Confirm & Pledge Donation'}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DonorDashboard;
