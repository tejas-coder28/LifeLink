import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { hospitalApi } from '../../api/hospitalApi';
import { requestApi } from '../../api/requestApi';
import { pingApi } from '../../api/pingApi';

import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/cards/StatCard';
import RequestCard from '../../components/cards/RequestCard';
import RequestForm from '../../components/forms/RequestForm';
import InventoryForm from '../../components/forms/InventoryForm';
import { compatibleDonorGroups } from '../../utils/bloodCompatibility';

import {
  Building2,
  Activity,
  PlusCircle,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Phone,
  ChevronRight,
  Cpu,
  Layers,
  XCircle,
  Send,
  Check,
  AlertTriangle,
  Lock
} from 'lucide-react';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // State Data
  const [hospitalProfile, setHospitalProfile] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [allDonations, setAllDonations] = useState([]);

  // Loaders
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [updatingInventory, setUpdatingInventory] = useState(false);

  // Modals & Active Match Tracking
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMatchRequestId, setSelectedMatchRequestId] = useState(null);
  const [matchingData, setMatchingData] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [pingsMap, setPingsMap] = useState({});
  const [notifyingDonorId, setNotifyingDonorId] = useState(null);

  const fetchHospitalProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await hospitalApi.getProfile();
      if (res.data && res.data.success) {
        setHospitalProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch hospital profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchHospitalRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await requestApi.getMyRequests();
      if (res.data && res.data.success) {
        setMyRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch hospital requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchRequestPings = async (requestId) => {
    try {
      const res = await pingApi.getRequestPings(requestId);
      if (res.data && res.data.success) {
        const map = {};
        (res.data.data || []).forEach((ping) => {
          const dId = ping.donorId?._id || ping.donorId;
          map[dId] = ping;
        });
        setPingsMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch request pings:', err);
    }
  };

  useEffect(() => {
    fetchHospitalProfile();
    fetchHospitalRequests();
  }, []);

  // Polling for live donor ping responses when matching modal is open
  useEffect(() => {
    if (!selectedMatchRequestId) return;
    fetchRequestPings(selectedMatchRequestId);

    const interval = setInterval(() => {
      fetchRequestPings(selectedMatchRequestId);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedMatchRequestId]);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleCreateRequest = async (formData) => {
    // Safety guard: unverified hospitals cannot post requests
    if (!hospitalProfile?.isVerified) {
      showError('Your hospital must be verified by an admin before posting blood requests.');
      setIsCreateModalOpen(false);
      return;
    }
    setCreatingRequest(true);
    try {
      const res = await requestApi.createRequest({
        ...formData,
        hospitalId: hospitalProfile?._id,
      });
      if (res.data && res.data.success) {
        showSuccess('Emergency blood request broadcast successfully!');
        setIsCreateModalOpen(false);
        fetchHospitalRequests();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setCreatingRequest(false);
    }
  };

  const handleUpdateInventory = async (inventoryData) => {
    setUpdatingInventory(true);
    try {
      const res = await hospitalApi.updateInventory(inventoryData);
      if (res.data && res.data.success) {
        setHospitalProfile(res.data.data);
        showSuccess('Hospital blood inventory updated!');
      }
    } catch (err) {
      showError('Failed to update inventory');
    } finally {
      setUpdatingInventory(false);
    }
  };

  const handleViewMatches = async (requestId) => {
    setSelectedMatchRequestId(requestId);
    setLoadingMatches(true);
    try {
      const [matchesRes] = await Promise.all([
        requestApi.getMatches(requestId),
        fetchRequestPings(requestId),
      ]);
      if (matchesRes.data && matchesRes.data.success) {
        setMatchingData(matchesRes.data.data);
      }
    } catch (err) {
      showError('Failed to fetch matching donors');
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleContactDonor = async (requestId, donorUserId) => {
    setNotifyingDonorId(donorUserId);
    try {
      const res = await pingApi.notifyDonor(requestId, donorUserId);
      if (res.data && res.data.success) {
        showSuccess('In-app emergency request ping sent to candidate donor!');
        fetchRequestPings(requestId);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to ping candidate donor');
    } finally {
      setNotifyingDonorId(null);
    }
  };

  const handleConfirmDonation = async (requestId, donorUserId) => {
    try {
      const res = await requestApi.pledgeDonation({ requestId, donorId: donorUserId, unitsDonated: 1 });
      if (res.data && res.data.success) {
        await requestApi.updateStatus(requestId, 'fulfilled');
        showSuccess('Donation confirmed & request marked as fulfilled!');
        fetchHospitalRequests();
        if (selectedMatchRequestId === requestId) {
          handleViewMatches(requestId);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to log donation');
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    try {
      const res = await requestApi.updateStatus(requestId, status);
      if (res.data && res.data.success) {
        showSuccess(`Request status updated to ${status.toUpperCase()}`);
        fetchHospitalRequests();
        if (matchingData && matchingData.request._id === requestId) {
          setMatchingData((prev) => ({
            ...prev,
            request: { ...prev.request, status },
          }));
        }
      }
    } catch (err) {
      showError('Failed to update request status');
    }
  };

  // Calculations for summary stats
  const activeRequestsCount = myRequests.filter((r) => r.status === 'open' || r.status === 'matching').length;
  const completedRequestsCount = myRequests.filter((r) => r.status === 'fulfilled').length;
  const totalDonorResponses = myRequests.reduce((acc, curr) => acc + (curr.matchedDonorsCount || 0), 0);
  const totalInventoryUnits = (hospitalProfile?.inventory || []).reduce((acc, curr) => acc + (curr.units || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ⚠️ Pending Approval Banner — shown when hospital is not yet verified by admin */}
      {hospitalProfile && !hospitalProfile.isVerified && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-amber-800">Account Pending Admin Approval</h3>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your hospital registration is under review. An admin must verify your facility before you can
              broadcast blood requests or access full platform features.
              You can update your inventory while you wait.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-amber-200 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider shrink-0">
            Awaiting Verification
          </span>
        </div>
      )}

      {/* Banner */}
      <div className="hero-glass-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading">Hospital Emergency Portal</h1>
            <Badge accountType="hospital" />
            <Badge status={hospitalProfile?.isVerified ? 'verified' : 'pending'} text={hospitalProfile?.isVerified ? 'VERIFIED FACILITY' : 'PENDING'} />
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            {hospitalProfile?.name || `${user?.name} Medical Center`} • Broadcast emergency demands & manage reserve inventory.
          </p>
        </div>

        {/* New Request button — disabled and locked for unverified hospitals */}
        {hospitalProfile?.isVerified ? (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary px-5 py-3 rounded-2xl text-xs flex items-center space-x-2 shrink-0 shadow-lg shadow-rose-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Blood Request</span>
          </button>
        ) : (
          <div className="relative group shrink-0">
            <button
              disabled
              className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 font-extrabold text-xs flex items-center space-x-2 cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>New Blood Request</span>
            </button>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Requires admin verification
            </span>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-theme pb-2 overflow-x-auto">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'glass-card text-secondary hover:text-primary'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setTab('active-requests')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'active-requests'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'glass-card text-secondary hover:text-primary'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Requests ({myRequests.length})</span>
        </button>

        <button
          onClick={() => setTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'glass-card text-secondary hover:text-primary'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Blood Inventory Stock ({totalInventoryUnits} units)</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Active Blood Requests"
              value={activeRequestsCount}
              icon={Activity}
              description="Open broadcast demands"
              color="rose"
            />
            <StatCard
              title="Total Donor Responses"
              value={totalDonorResponses}
              icon={Users}
              description="Standby donor candidates"
              color="sky"
            />
            <StatCard
              title="Completed Requests"
              value={completedRequestsCount}
              icon={CheckCircle2}
              description="Fulfilled blood packets"
              color="emerald"
            />
            <StatCard
              title="Total Inventory Reserves"
              value={`${totalInventoryUnits} Units`}
              icon={Building2}
              description="Across 8 RBC blood types"
              color="amber"
            />
          </div>

          {/* Active Hospital Requests Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-primary flex items-center font-heading">
                <Activity className="w-5 h-5 mr-2 text-rose-500" />
                Hospital Active Broadcasts
              </h2>
              {hospitalProfile?.isVerified && (
                <button onClick={() => setIsCreateModalOpen(true)} className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 hover:underline cursor-pointer">
                  + Create New Request
                </button>
              )}
            </div>

            {loadingRequests ? (
              <Loader text="Loading hospital requests..." />
            ) : myRequests.length === 0 ? (
              <Card hover={false} className="text-center py-12">
                {hospitalProfile?.isVerified ? (
                  <EmptyState
                    icon={Activity}
                    title="No Active Requests"
                    description="Your medical center has no active blood requests broadcast."
                    action={
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary text-xs px-4 py-2 rounded-xl"
                      >
                        Create Request Now
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Lock}
                    title="Verification Required"
                    description="Your hospital must be verified by an admin before you can broadcast blood requests."
                  />
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myRequests.map((req) => (
                  <RequestCard
                    key={req._id}
                    request={req}
                    extraAction={
                      <button
                        type="button"
                        onClick={() => handleViewMatches(req._id)}
                        className="btn-secondary px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer rounded-xl w-full sm:w-auto"
                      >
                        <Cpu className="w-3.5 h-3.5 mr-1.5" />
                        <span>View Matches</span>
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE REQUESTS */}
      {activeTab === 'active-requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-primary font-heading tracking-tight">Hospital Request Directory</h2>
              <p className="text-xs text-secondary">Manage request statuses and view rule-based donor matching engine scores.</p>
            </div>
            {hospitalProfile?.isVerified && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary text-xs px-4 py-2 rounded-xl"
              >
                + Create Request
              </button>
            )}
          </div>

          {loadingRequests ? (
            <Loader text="Loading request directory..." />
          ) : myRequests.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Requests Broadcast"
              description="Your hospital has not broadcast any blood requests."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myRequests.map((req) => (
                <RequestCard
                  key={req._id}
                  request={req}
                  extraAction={
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      {req.status !== 'fulfilled' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req._id, 'fulfilled')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
                        >
                          Mark as Fulfilled
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleViewMatches(req._id)}
                        className="btn-secondary px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer rounded-xl"
                      >
                        <Cpu className="w-3.5 h-3.5 mr-1.5" />
                        <span>View Matches</span>
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading tracking-tight">Hospital Blood Inventory Reserves</h2>
            <p className="text-xs text-secondary">
              Manage current stock packets across all 8 red blood cell compatibility groups.
            </p>
          </div>

          <Card title="Blood Bank Inventory Manager" icon={Building2} hover={false}>
            <InventoryForm
              initialInventory={hospitalProfile?.inventory || []}
              onSubmit={handleUpdateInventory}
              loading={updatingInventory}
            />
          </Card>
        </div>
      )}

      {/* Create Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Broadcast Emergency Blood Request"
      >
        <RequestForm onSubmit={handleCreateRequest} loading={creatingRequest} />
      </Modal>

      {/* Matching Donors Ranking Modal */}
      <Modal
        isOpen={Boolean(selectedMatchRequestId)}
        onClose={() => {
          setSelectedMatchRequestId(null);
          setMatchingData(null);
        }}
        title="Smart Donor Matching Engine Results"
        maxWidth="max-w-4xl"
      >
        {loadingMatches ? (
          <Loader text="Scoring candidate donors by blood compatibility, distance & availability..." />
        ) : !matchingData ? (
          <EmptyState title="Unable to Load Matches" description="Failed to retrieve matching donor data." />
        ) : (
          <div className="space-y-6">
            {/* Request Summary Bar */}
            <div className="p-4 rounded-2xl bg-surface border border-theme flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge bloodGroup={matchingData.request.bloodGroup} />
                <div>
                  <h3 className="text-sm font-bold text-primary">{matchingData.request.patientName}</h3>
                  <span className="text-xs text-muted">
                    {matchingData.request.unitsNeeded} unit(s) • {matchingData.request.address}
                  </span>
                </div>
              </div>
              <Badge status={matchingData.request.status} />
            </div>

            {/* Compatible Blood Inventory Reserves */}
            {(() => {
              const compGroups = compatibleDonorGroups(matchingData.request.bloodGroup);
              return (
                <div className="p-4 rounded-2xl bg-surface border border-theme space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                      Compatible Hospital Blood Reserves ({compGroups.join(', ')})
                    </span>
                    <span className="text-[11px] text-muted">
                      Patient Requirement: <strong className="text-rose-600 dark:text-rose-400">{matchingData.request.bloodGroup}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {compGroups.map((grp) => {
                      const invItem = hospitalProfile?.inventory?.find((i) => i.bloodGroup === grp);
                      const units = invItem ? invItem.units : 0;
                      const isExact = grp === matchingData.request.bloodGroup;
                      return (
                        <div
                          key={grp}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            units > 0
                              ? isExact
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400'
                                : 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-300'
                              : 'bg-slate-200/50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-muted'
                          }`}
                        >
                          <span className="font-extrabold text-xs">{grp} {isExact && '★'}</span>
                          <span className="font-black text-xs">{units} unit(s)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Candidate Donors Ranked List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-primary font-heading">
                  {matchingData.matchesCount} Candidate Donors Ranked
                </h4>
                <span className="text-[11px] font-semibold text-secondary">
                  Total Pool Evaluated: {matchingData.totalCandidateDonors}
                </span>
              </div>

              {matchingData.matches.length === 0 ? (
                <EmptyState title="No Compatible Donors Available" description="No donors currently fit compatibility & cooldown criteria." />
              ) : (
                <div className="space-y-3">
                  {matchingData.matches.map((item, index) => {
                    const donorUserId = item.donor?.user?._id || item.donor?.user?.id;
                    const ping = pingsMap[donorUserId];
                    const isNotifying = notifyingDonorId === donorUserId;

                    return (
                      <div
                        key={index}
                        className="p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card border-theme"
                      >
                        <div className="flex items-start space-x-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                          >
                            #{index + 1}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-bold text-primary">
                                {item.donor?.user?.name || 'Candidate Donor'}
                              </h5>
                              <Badge bloodGroup={item.donor?.bloodGroup} />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center font-mono">
                                <MapPin className="w-3.5 h-3.5 mr-1" /> {item.distanceKm} km away
                              </span>
                              {item.donor?.age && (
                                <>
                                  <span>•</span>
                                  <span>Age {item.donor.age}</span>
                                </>
                              )}
                              {item.donor?.user?.phone && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center font-mono">
                                    <Phone className="w-3.5 h-3.5 mr-1" /> {item.donor.user.phone}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Rationale badges */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.rationale.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-surface text-secondary border border-theme"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Ping Actions & Match Score */}
                        <div className="flex flex-row md:flex-col items-end justify-between w-full md:w-auto gap-3 shrink-0">
                          <div
                            className="text-right p-2.5 rounded-xl border border-theme bg-surface min-w-[120px]"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider block text-muted">Match Score</span>
                            <span className="text-lg font-black text-rose-600 dark:text-rose-400 block">{item.matchScore}%</span>
                          </div>

                          {/* Ping Status / Contact Controls */}
                          <div className="flex items-center space-x-2">
                            {!ping ? (
                              <button
                                onClick={() => handleContactDonor(matchingData.request._id, donorUserId)}
                                disabled={isNotifying}
                                className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5"
                              >
                                <Send className={`w-3.5 h-3.5 ${isNotifying ? 'animate-spin' : ''}`} />
                                <span>{isNotifying ? 'Pinging...' : 'Contact Donor'}</span>
                              </button>
                            ) : ping.status === 'pending' ? (
                              <span className="px-3 py-1.5 rounded-xl bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30 text-xs flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>Pending Response</span>
                              </span>
                            ) : ping.status === 'accepted' ? (
                              <div className="flex items-center space-x-2">
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-400/10 text-teal-300 font-bold border border-emerald-400/30 text-xs flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                                  <span>Accepted</span>
                                </span>
                                {matchingData.request.status !== 'fulfilled' && (
                                  <button
                                    onClick={() => handleConfirmDonation(matchingData.request._id, donorUserId)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                                  >
                                    Confirm Donation
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-300 font-bold border border-rose-500/30 text-xs flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Declined</span>
                                </span>
                                <button
                                  onClick={() => handleContactDonor(matchingData.request._id, donorUserId)}
                                  disabled={isNotifying}
                                  className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
                                >
                                  Re-Ping
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HospitalDashboard;
