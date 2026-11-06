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
import PageTransition from '../../components/common/PageTransition';
import SlidingTabs from '../../components/common/SlidingTabs';
import StatCard from '../../components/cards/StatCard';
import RequestCard from '../../components/cards/RequestCard';
import RequestForm from '../../components/forms/RequestForm';
import InventoryForm from '../../components/forms/InventoryForm';
import { compatibleDonorGroups } from '../../utils/bloodCompatibility';
import { canSeekDonors } from '../../utils/requestRules';
import { createSmartPolling } from '../../utils/networkHealth';

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
  Lock,
  Inbox,
  Droplet,
  CheckCheck,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // State Data
  const [hospitalProfile, setHospitalProfile] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [hospitalPledges, setHospitalPledges] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);

  // Loaders
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingPledges, setLoadingPledges] = useState(true);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState(null);
  const [issuingPatientRequestId, setIssuingPatientRequestId] = useState(null);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [updatingInventory, setUpdatingInventory] = useState(false);

  // Filters
  const [incomingFilter, setIncomingFilter] = useState('pending'); // 'pending' | 'all'

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMatchRequestId, setSelectedMatchRequestId] = useState(null);
  const [matchingData, setMatchingData] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [pingsMap, setPingsMap] = useState({});
  const [notifyingDonorId, setNotifyingDonorId] = useState(null);

  // Rejection Modal
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    request: null,
    reason: '',
    submitting: false,
  });

  // Compatible Units Modal
  const [compatibleModal, setCompatibleModal] = useState({
    isOpen: false,
    request: null,
    selectedGroup: '',
    units: 1,
    submitting: false,
  });

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

  const fetchHospitalPledges = async () => {
    setLoadingPledges(true);
    try {
      const res = await requestApi.getHospitalPledges();
      if (res.data && res.data.success) {
        setHospitalPledges(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch hospital pledges:', err);
    } finally {
      setLoadingPledges(false);
    }
  };

  const fetchIncomingRequests = async () => {
    setLoadingIncoming(true);
    try {
      const res = await requestApi.getIncomingHospitalRequests();
      if (res.data && res.data.success) {
        setIncomingRequests(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch incoming hospital requests:', err);
    } finally {
      setLoadingIncoming(false);
    }
  };

  const fetchInventoryTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await hospitalApi.getInventoryTransactions();
      if (res.data && res.data.success) {
        setInventoryTransactions(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch inventory transactions:', err);
    } finally {
      setLoadingTransactions(false);
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
    fetchHospitalPledges();
    fetchIncomingRequests();
    fetchInventoryTransactions();
  }, []);

  // Polling for live donor ping responses when matching modal is open
  useEffect(() => {
    if (!selectedMatchRequestId) return;
    fetchRequestPings(selectedMatchRequestId);

    const cancelPolling = createSmartPolling(() => {
      fetchRequestPings(selectedMatchRequestId);
    }, 5000);

    return cancelPolling;
  }, [selectedMatchRequestId]);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleCreateRequest = async (formData) => {
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
        fetchInventoryTransactions();
      }
    } catch (err) {
      showError('Failed to update inventory');
    } finally {
      setUpdatingInventory(false);
    }
  };

  // Accept incoming request workflow
  const handleAcceptRequest = async (requestId) => {
    setAcceptingRequestId(requestId);
    try {
      const res = await requestApi.acceptRequest(requestId);
      if (res.data && res.data.success) {
        const { unitsFromStock, unitsFromDonors, status } = res.data.data;
        if (status === 'fulfilled' || unitsFromDonors === 0) {
          showSuccess(`Request accepted! Fulfilled all ${unitsFromStock} unit(s) directly from hospital inventory.`);
        } else if (unitsFromStock > 0) {
          showSuccess(`Request accepted! Allocated ${unitsFromStock} unit(s) from stock; remaining ${unitsFromDonors} unit(s) broadcast to donors.`);
        } else {
          showSuccess(`Request accepted! Out of stock; all ${unitsFromDonors} unit(s) broadcast to nearby compatible donors.`);
        }
        await Promise.all([
          fetchIncomingRequests(),
          fetchHospitalRequests(),
          fetchHospitalProfile(),
          fetchInventoryTransactions(),
          fetchHospitalPledges(),
        ]);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setAcceptingRequestId(null);
    }
  };

  // Open rejection modal
  const handleOpenRejectModal = (request) => {
    setRejectModal({
      isOpen: true,
      request,
      reason: '',
      submitting: false,
    });
  };

  // Submit rejection
  const handleRejectSubmit = async () => {
    if (!rejectModal.reason || rejectModal.reason.trim().length < 3) {
      showError('Please provide a rejection reason of at least 3 characters.');
      return;
    }
    setRejectModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await requestApi.rejectRequest(rejectModal.request._id, rejectModal.reason.trim());
      if (res.data && res.data.success) {
        showSuccess('Request rejected. Requester has been notified.');
        setRejectModal({ isOpen: false, request: null, reason: '', submitting: false });
        await Promise.all([
          fetchIncomingRequests(),
          fetchHospitalRequests(),
        ]);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject request');
      setRejectModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Open compatible units modal
  const handleOpenCompatibleModal = (request) => {
    const compGroups = compatibleDonorGroups(request.bloodGroup);
    // Find first compatible group with units available, or default to first
    const defaultGrp = compGroups.find((g) => {
      const inv = hospitalProfile?.inventory?.find((i) => i.bloodGroup === g);
      return inv && inv.units > 0;
    }) || compGroups[0] || request.bloodGroup;

    setCompatibleModal({
      isOpen: true,
      request,
      selectedGroup: defaultGrp,
      units: 1,
      submitting: false,
    });
  };

  // Submit compatible units
  const handleIssueCompatibleSubmit = async () => {
    const inv = hospitalProfile?.inventory?.find((i) => i.bloodGroup === compatibleModal.selectedGroup);
    const available = inv ? inv.units : 0;
    if (available < compatibleModal.units) {
      showError(`Insufficient stock in ${compatibleModal.selectedGroup}. Available: ${available} units.`);
      return;
    }

    setCompatibleModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await requestApi.issueCompatibleUnits(
        compatibleModal.request._id,
        compatibleModal.selectedGroup,
        Number(compatibleModal.units)
      );
      if (res.data && res.data.success) {
        showSuccess(`Successfully issued ${compatibleModal.units} unit(s) of compatible group ${compatibleModal.selectedGroup}!`);
        setCompatibleModal({ isOpen: false, request: null, selectedGroup: '', units: 1, submitting: false });
        await Promise.all([
          fetchHospitalProfile(),
          fetchHospitalRequests(),
          fetchIncomingRequests(),
          fetchInventoryTransactions(),
        ]);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to issue compatible units');
      setCompatibleModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Issue units to patient from stock (for donor shortfall / arrived donations)
  const handleIssuePatientUnits = async (requestId, units = 1) => {
    setIssuingPatientRequestId(requestId);
    try {
      const res = await requestApi.issuePatientUnits(requestId, units);
      if (res.data && res.data.success) {
        showSuccess(`Issued ${units} unit(s) to patient from hospital stock!`);
        await Promise.all([
          fetchHospitalProfile(),
          fetchHospitalRequests(),
          fetchIncomingRequests(),
          fetchInventoryTransactions(),
        ]);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to issue units to patient');
    } finally {
      setIssuingPatientRequestId(null);
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
        const count = matchesRes.data.data.matchesCount ?? matchesRes.data.data.matches?.length;
        if (count !== undefined) {
          setMyRequests((prev) =>
            prev.map((r) => (r._id === requestId ? { ...r, matchedDonorsCount: count } : r))
          );
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        const reqObj =
          myRequests.find((r) => r._id === requestId) ||
          incomingRequests.find((r) => r._id === requestId) ||
          { _id: requestId, status: 'fulfilled' };
        setMatchingData({
          isFulfilled: true,
          message: err.response?.data?.message || 'Request is already fulfilled',
          request: reqObj,
          matches: [],
        });
      } else {
        showError('Failed to fetch matching donors');
      }
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

  const handleConfirmDonation = async (donationId, requestId) => {
    setActionInProgressId(donationId);
    try {
      const res = await requestApi.completeDonation(donationId);
      if (res.data && res.data.success) {
        showSuccess('Donation confirmed! 1 unit added to hospital inventory. Donor profile updated.');
        await Promise.all([
          fetchHospitalRequests(),
          fetchHospitalPledges(),
          fetchHospitalProfile(),
          fetchInventoryTransactions(),
        ]);
        if (selectedMatchRequestId === requestId) {
          handleViewMatches(requestId);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to confirm donation');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeclineDonation = async (donationId, requestId) => {
    setActionInProgressId(donationId);
    try {
      const res = await requestApi.declineDonation(donationId);
      if (res.data && res.data.success) {
        showSuccess('Pledge marked as declined / no-show. Donor notified.');
        await Promise.all([
          fetchHospitalRequests(),
          fetchHospitalPledges(),
        ]);
        if (selectedMatchRequestId === requestId) {
          handleViewMatches(requestId);
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to decline pledge');
    } finally {
      setActionInProgressId(null);
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
  const pendingIncomingCount = incomingRequests.filter(
    (r) => r.status === 'pending_hospital_review'
  ).length;
  const activeRequestsCount = myRequests.filter(
    (r) => r.status === 'open' || r.status === 'matching' || r.status === 'partially_fulfilled'
  ).length;
  const completedRequestsCount = myRequests.filter((r) => r.status === 'fulfilled').length;
  const totalPledgesCount = hospitalPledges.length;
  const pendingPledgesCount = hospitalPledges.filter((p) => p.status === 'pledged').length;
  const totalInventoryUnits = (hospitalProfile?.inventory || []).reduce(
    (acc, curr) => acc + (curr.units || 0),
    0
  );

  const displayedIncoming = incomingFilter === 'pending'
    ? incomingRequests.filter((r) => r.status === 'pending_hospital_review')
    : incomingRequests;

  const hospitalTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    {
      id: 'incoming-requests',
      label: 'Incoming Demands',
      icon: Inbox,
      badge: pendingIncomingCount > 0 ? pendingIncomingCount : null,
      badgePulse: pendingIncomingCount > 0,
    },
    {
      id: 'active-requests',
      label: 'Active Requests',
      icon: Layers,
      count: myRequests.length,
    },
    {
      id: 'inventory',
      label: 'Inventory Reserves',
      icon: Building2,
      count: `${totalInventoryUnits}u`,
    },
  ];

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ⚠️ Pending Approval Banner — shown when hospital is not yet verified by admin */}
      {hospitalProfile && !hospitalProfile.isVerified && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-warning/10 border-2 border-warning/40 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-warning/20 border border-warning/30 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-primary">Account Pending Admin Approval</h3>
            <p className="text-xs text-secondary mt-0.5 leading-relaxed">
              Your hospital registration is under review. An admin must verify your facility before patients can direct emergency requests to you, or before you can broadcast blood requests. You can manage your inventory while you wait.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-warning/20 text-warning border border-warning/30 font-extrabold text-[10px] uppercase tracking-wider shrink-0">
            Awaiting Verification
          </span>
        </div>
      )}

      {/* Banner */}
      <div className="hero-glass-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading">Hospital Command Center</h1>
            <Badge accountType="hospital" />
            <Badge
              status={hospitalProfile?.isVerified ? 'verified' : 'pending'}
              text={hospitalProfile?.isVerified ? 'VERIFIED FACILITY' : 'PENDING'}
            />
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            {hospitalProfile?.name || `${user?.name} Medical Center`} • Review incoming emergency demands, allocate inventory stock, and coordinate donor shortfalls.
          </p>
        </div>

        {/* New Request button — disabled and locked for unverified hospitals */}
        {hospitalProfile?.isVerified ? (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary px-5 py-3 rounded-2xl text-xs flex items-center space-x-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Blood Request</span>
          </button>
        ) : (
          <div className="relative group shrink-0">
            <button
              disabled
              className="px-5 py-3 rounded-2xl bg-surface border border-hairline text-muted font-extrabold text-xs flex items-center space-x-2 cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>New Blood Request</span>
            </button>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg glass-modal border border-glass text-primary text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Requires admin verification
            </span>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <SlidingTabs
        tabs={hospitalTabs}
        activeTab={activeTab}
        onChange={(id) => setTab(id)}
        layoutId="hospital-dashboard-tabs"
      />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Urgent Incoming Demands Callout Banner */}
          {pendingIncomingCount > 0 && (
            <div className="p-5 rounded-2xl bg-danger/10 border-2 border-danger/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-danger-solid text-white flex items-center justify-center font-black shrink-0">
                  <Inbox className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-primary">
                    {pendingIncomingCount} Emergency Blood Demand{pendingIncomingCount > 1 ? 's' : ''} Awaiting Review
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Patients have addressed urgent blood requests directly to your facility. Check your blood bank reserves to accept and issue units or broadcast donor shortfall.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTab('incoming-requests')}
                className="btn-primary text-xs px-4 py-2.5 rounded-xl shrink-0 flex items-center space-x-1.5"
              >
                <span>Review Demands ({pendingIncomingCount})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Incoming Demands"
              value={pendingIncomingCount}
              icon={Inbox}
              description={pendingIncomingCount > 0 ? `${pendingIncomingCount} pending review` : 'All demands reviewed'}
              color="rose"
            />
            <StatCard
              title="Active Blood Requests"
              value={activeRequestsCount}
              icon={Activity}
              description="Open & matching demands"
              color="sky"
            />
            <StatCard
              title="Total Donor Pledges"
              value={totalPledgesCount}
              icon={Users}
              description={pendingPledgesCount > 0 ? `${pendingPledgesCount} awaiting confirmation` : 'All pledges confirmed'}
              color="emerald"
            />
            <StatCard
              title="Inventory Reserves"
              value={`${totalInventoryUnits} Units`}
              icon={Building2}
              description="Across 8 RBC blood types"
              color="amber"
            />
          </div>

          {/* Active Hospital Requests Feed Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-primary flex items-center font-heading">
                <Activity className="w-5 h-5 mr-2 text-info" />
                Active Hospital Broadcasts & Shortfalls
              </h2>
              {hospitalProfile?.isVerified && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-xs font-bold text-info hover:underline cursor-pointer"
                >
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
                {myRequests.slice(0, 4).map((req) => {
                  const stockItem = hospitalProfile?.inventory?.find((i) => i.bloodGroup === req.bloodGroup);
                  const currentStock = stockItem ? stockItem.units : 0;
                  return (
                    <RequestCard
                      key={req._id}
                      request={req}
                      currentStock={currentStock}
                      pledges={hospitalPledges.filter((p) => (p.request?._id || p.request) === req._id)}
                      onConfirmDonation={handleConfirmDonation}
                      onDeclineDonation={handleDeclineDonation}
                      actionInProgressId={actionInProgressId}
                    extraAction={
                      <div className="flex flex-wrap items-center gap-2">
                        {req.status !== 'fulfilled' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCompatibleModal(req)}
                            className="btn-secondary px-3 py-1.5 text-xs font-bold text-secondary flex items-center justify-center cursor-pointer rounded-xl"
                          >
                            <Droplet className="w-3.5 h-3.5 mr-1 text-info" />
                            <span>Compatible Stock</span>
                          </button>
                        )}
                        {canSeekDonors(req) && (
                          <button
                            type="button"
                            onClick={() => handleViewMatches(req._id)}
                            className="btn-secondary px-3 py-1.5 text-xs font-bold text-info flex items-center justify-center cursor-pointer rounded-xl"
                          >
                            <Cpu className="w-3.5 h-3.5 mr-1" />
                            <span>View Matches</span>
                          </button>
                        )}
                      </div>
                    }
                  />
                );
              })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING REQUESTS */}
      {activeTab === 'incoming-requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-primary font-heading tracking-tight">
                Incoming Emergency Blood Demands
              </h2>
              <p className="text-xs text-secondary">
                Review blood requests addressed directly to your hospital. Allocate from reserve inventory first; shortfalls will open donor requests.
              </p>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center space-x-2 bg-surface p-1 rounded-xl border border-hairline">
              <button
                onClick={() => setIncomingFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  incomingFilter === 'pending'
                    ? 'bg-surface text-primary border border-hairline shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Pending Review ({pendingIncomingCount})
              </button>
              <button
                onClick={() => setIncomingFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  incomingFilter === 'all'
                    ? 'bg-surface text-primary border border-hairline shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                All Demands ({incomingRequests.length})
              </button>
            </div>
          </div>

          {loadingIncoming ? (
            <Loader text="Loading incoming emergency demands..." />
          ) : displayedIncoming.length === 0 ? (
            <Card hover={false} className="text-center py-12">
              <EmptyState
                icon={Inbox}
                title={incomingFilter === 'pending' ? 'No Pending Emergency Demands' : 'No Incoming Demands'}
                description={
                  incomingFilter === 'pending'
                    ? 'Your hospital has reviewed all emergency blood demands addressed to you.'
                    : 'No emergency requests have been directed to your facility yet.'
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedIncoming.map((req) => {
                const stockItem = hospitalProfile?.inventory?.find((i) => i.bloodGroup === req.bloodGroup);
                const currentStock = stockItem ? stockItem.units : 0;
                const isFullStock = currentStock >= req.unitsNeeded;
                const isPartialStock = currentStock > 0 && currentStock < req.unitsNeeded;
                const isZeroStock = currentStock === 0;
                const isPending = req.status === 'pending_hospital_review';

                return (
                  <div
                    key={req._id}
                    className={`glass-card p-6 rounded-3xl border transition-all space-y-4 shadow-sm hover:shadow-md ${
                      req.urgency === 'critical' && isPending
                        ? 'border-danger/40 bg-danger/5'
                        : 'border-hairline'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <Badge bloodGroup={req.bloodGroup} />
                        <div>
                          <h3 className="text-base font-extrabold text-primary font-heading">
                            {req.patientName}
                          </h3>
                          <span className="text-xs text-muted">
                            Requested by {req.requester?.name || 'Patient/Caregiver'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <Badge urgency={req.urgency} />
                        <Badge status={req.status} />
                      </div>
                    </div>

                    {/* Critical urgency indicator */}
                    {req.urgency === 'critical' && isPending && (
                      <div className="px-3 py-1.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-danger animate-ping shrink-0" />
                        <span>Critical Emergency: Requires immediate review (15-min timeout rule applies)</span>
                      </div>
                    )}

                    {/* Request Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-surface/80 border border-theme">
                      <div>
                        <span className="text-muted block font-semibold text-[10px] uppercase">Units Needed</span>
                        <span className="font-extrabold text-primary text-sm">{req.unitsNeeded} unit(s)</span>
                      </div>
                      <div>
                        <span className="text-muted block font-semibold text-[10px] uppercase">Required By</span>
                        <span className="font-bold text-secondary">
                          {req.requiredByDate ? new Date(req.requiredByDate).toLocaleString() : 'Immediate'}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-theme flex items-center justify-between text-muted text-[11px]">
                        <span>Contact: <strong>{req.requester?.phone || 'No phone provided'}</strong></span>
                        <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Hospital Stock Assessment Box */}
                    <div
                      className="p-3.5 rounded-2xl border flex flex-col space-y-2 bg-silver/10 border-silver/30 text-primary"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Your Blood Bank Inventory ({req.bloodGroup})</span>
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-surface/90 border border-theme">
                          {currentStock} Available
                        </span>
                      </div>

                      <p className="text-[11px] leading-relaxed">
                        {isFullStock && (
                          <span className="text-primary font-semibold">
                            ✓ <strong>Sufficient stock.</strong> Accepting will immediately allocate all {req.unitsNeeded} unit(s) from your inventory and fulfill the request.
                          </span>
                        )}
                        {isPartialStock && (
                          <span className="text-secondary font-semibold">
                            ⚠️ <strong>Partial stock.</strong> Accepting will allocate {currentStock} unit(s) from inventory and broadcast remaining {req.unitsNeeded - currentStock} unit(s) to donors.
                          </span>
                        )}
                        {isZeroStock && (
                          <span className="text-danger font-semibold">
                            ✗ <strong>Zero stock available.</strong> Accepting will broadcast all {req.unitsNeeded} unit(s) directly to nearby verified donors.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions for Pending Requests */}
                    {isPending ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          onClick={() => handleAcceptRequest(req._id)}
                          disabled={acceptingRequestId === req._id}
                          className="btn-primary text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 flex-1 justify-center"
                        >
                          <Check className="w-4 h-4" />
                          <span>{acceptingRequestId === req._id ? 'Accepting...' : 'Accept & Allocate Stock'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenCompatibleModal(req)}
                          className="btn-secondary text-xs px-3 py-2.5 rounded-xl flex items-center space-x-1 text-secondary"
                        >
                          <Droplet className="w-3.5 h-3.5 text-info" />
                          <span>Compatible</span>
                        </button>

                        <button
                          onClick={() => handleOpenRejectModal(req)}
                          className="px-3.5 py-2.5 rounded-xl border border-danger/30 hover:bg-danger/10 text-danger font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      /* Status details for already reviewed requests */
                      <div className="pt-2 text-xs flex items-center justify-between text-secondary">
                        <span>Allocated from stock: <strong>{req.unitsFromStock || 0}</strong></span>
                        <span>Shortfall to donors: <strong>{req.unitsFromDonors || 0}</strong></span>
                        <span>Fulfilled: <strong>{req.unitsFulfilled || 0}/{req.unitsNeeded}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE REQUESTS */}
      {activeTab === 'active-requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-primary font-heading tracking-tight">
                Hospital Request Directory & Shortfalls
              </h2>
              <p className="text-xs text-secondary">
                Manage ongoing blood broadcasts, view rule-based donor matching engine scores, and issue units to patients.
              </p>
            </div>
            {hospitalProfile?.isVerified && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Request</span>
              </button>
            )}
          </div>

          {loadingRequests ? (
            <Loader text="Loading request directory..." />
          ) : myRequests.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Requests Broadcast"
              description="Your hospital has not broadcast or accepted any active blood requests."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myRequests.map((req) => {
                const stockItem = hospitalProfile?.inventory?.find((i) => i.bloodGroup === req.bloodGroup);
                const currentStock = stockItem ? stockItem.units : 0;
                const reqPledges = hospitalPledges.filter((p) => (p.request?._id || p.request) === req._id);

                return (
                  <RequestCard
                    key={req._id}
                    request={req}
                    currentStock={currentStock}
                    pledges={reqPledges}
                    onConfirmDonation={handleConfirmDonation}
                    onDeclineDonation={handleDeclineDonation}
                    actionInProgressId={actionInProgressId}
                    extraAction={
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {/* If pending hospital review, offer immediate accept & allocate action */}
                        {req.status === 'pending_hospital_review' && (
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req._id)}
                            disabled={acceptingRequestId === req._id}
                            className="btn-primary px-3 py-1.5 text-xs font-bold flex items-center justify-center cursor-pointer rounded-xl"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            <span>{acceptingRequestId === req._id ? 'Accepting...' : 'Accept & Allocate'}</span>
                          </button>
                        )}

                        {/* Issue 1 Unit to Patient if stock exists and request not fulfilled */}
                        {req.status !== 'fulfilled' && currentStock > 0 && (
                          <button
                            type="button"
                            onClick={() => handleIssuePatientUnits(req._id, 1)}
                            disabled={issuingPatientRequestId === req._id}
                            className="btn-primary px-3 py-1.5 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center space-x-1"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>{issuingPatientRequestId === req._id ? 'Issuing...' : 'Issue 1 Unit to Patient'}</span>
                          </button>
                        )}

                        {/* Issue Compatible Stock */}
                        {req.status !== 'fulfilled' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCompatibleModal(req)}
                            className="btn-secondary px-3 py-1.5 text-xs font-bold text-secondary flex items-center justify-center cursor-pointer rounded-xl"
                          >
                            <Droplet className="w-3.5 h-3.5 mr-1 text-info" />
                            <span>Compatible Stock</span>
                          </button>
                        )}

                        {/* View Matches */}
                        {canSeekDonors(req) && (
                          <button
                            type="button"
                            onClick={() => handleViewMatches(req._id)}
                            className="btn-secondary px-3 py-1.5 text-xs font-bold text-info flex items-center justify-center cursor-pointer rounded-xl"
                          >
                            <Cpu className="w-3.5 h-3.5 mr-1" />
                            <span>View Matches</span>
                          </button>
                        )}

                        {/* Mark Fulfilled */}
                        {req.status !== 'fulfilled' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(req._id, 'fulfilled')}
                            className="btn-secondary text-xs px-3 py-1.5"
                          >
                            Mark Fulfilled
                          </button>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary font-heading tracking-tight">
              Hospital Blood Inventory Reserves & Ledger
            </h2>
            <p className="text-xs text-secondary">
              Manage current stock packets across all 8 red blood cell compatibility groups, with complete audit transaction trail.
            </p>
          </div>

          {/* Form */}
          <Card title="Blood Bank Inventory Stock Manager" icon={Building2} hover={false}>
            <InventoryForm
              initialInventory={hospitalProfile?.inventory || []}
              onSubmit={handleUpdateInventory}
              loading={updatingInventory}
            />
          </Card>

          {/* Transaction History Audit Trail */}
          <Card
            title="Blood Bank Transaction Ledger"
            icon={FileText}
            hover={false}
            action={
              <button
                onClick={fetchInventoryTransactions}
                disabled={loadingTransactions}
                className="btn-secondary text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTransactions ? 'animate-spin' : ''}`} />
                <span>Refresh Ledger</span>
              </button>
            }
          >
            {loadingTransactions ? (
              <Loader text="Loading inventory ledger..." />
            ) : inventoryTransactions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Transactions Recorded"
                description="Inventory adjustments, issued units, and donations received will appear here automatically."
              />
            ) : (
              <div className="space-y-3 overflow-x-auto">
                <div className="min-w-[600px] divide-y divide-theme">
                  {inventoryTransactions.map((tx) => {
                    const isPositive = tx.change > 0;
                    const reasonLabels = {
                      donation_received: 'Donation Received',
                      issued: 'Issued to Request',
                      issued_to_patient: 'Issued to Patient',
                      compatible_issued: 'Compatible Unit Issued',
                      manual_update: 'Manual Stock Update',
                    };

                    const reasonColors = {
                      donation_received: 'bg-success/15 text-success border-success/30',
                      issued: 'bg-surface text-secondary border-hairline',
                      issued_to_patient: 'bg-surface text-secondary border-hairline',
                      compatible_issued: 'bg-info/10 text-info border-info/25',
                      manual_update: 'bg-surface text-secondary border-hairline',
                    };

                    return (
                      <div key={tx._id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPositive
                                ? 'bg-success/15 text-success'
                                : 'bg-surface text-secondary border border-hairline'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge bloodGroup={tx.bloodGroup} />
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                                  reasonColors[tx.reason] || reasonColors.manual_update
                                }`}
                              >
                                {reasonLabels[tx.reason] || tx.reason}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted block mt-0.5">
                              {tx.notes || (tx.request ? 'Associated with emergency blood demand' : 'Inventory update')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-black block font-mono ${
                              isPositive ? 'text-success' : 'text-secondary'
                            }`}
                          >
                            {isPositive ? `+${tx.change}` : tx.change} Unit{Math.abs(tx.change) !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-muted block font-mono">
                            {new Date(tx.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, request: null, reason: '', submitting: false })}
        title="Reject Emergency Blood Request"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs leading-relaxed">
            You are rejecting the blood request for <strong>{rejectModal.request?.patientName}</strong> ({rejectModal.request?.unitsNeeded} units of {rejectModal.request?.bloodGroup}). The requester will be notified and can redirect their emergency demand to another hospital.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-primary block">
              Reason for Rejection <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Blood bank depleted, emergency trauma surgery in progress, redirection advised..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-hairline bg-surface text-primary text-xs focus:outline-none focus:border-danger resize-none"
            />
            <span className="text-[11px] text-muted">Minimum 3 characters required.</span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setRejectModal({ isOpen: false, request: null, reason: '', submitting: false })}
              className="btn-secondary text-xs px-4 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectSubmit}
              disabled={rejectModal.submitting || rejectModal.reason.trim().length < 3}
              className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>{rejectModal.submitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Compatible Units Modal */}
      <Modal
        isOpen={compatibleModal.isOpen}
        onClose={() => setCompatibleModal({ isOpen: false, request: null, selectedGroup: '', units: 1, submitting: false })}
        title="Issue Compatible Stock Units"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-surface border border-theme flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge bloodGroup={compatibleModal.request?.bloodGroup} />
              <div>
                <h4 className="text-sm font-bold text-primary">{compatibleModal.request?.patientName}</h4>
                <span className="text-xs text-muted">Patient blood group: {compatibleModal.request?.bloodGroup}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-secondary">
              Needs {compatibleModal.request?.unitsNeeded} units
            </span>
          </div>

          {/* Compatible Stock Grid */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-secondary block">
              Compatible Blood Groups in Your Inventory:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {compatibleModal.request && compatibleDonorGroups(compatibleModal.request.bloodGroup).map((grp) => {
                const invItem = hospitalProfile?.inventory?.find((i) => i.bloodGroup === grp);
                const units = invItem ? invItem.units : 0;
                const isSelected = compatibleModal.selectedGroup === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setCompatibleModal((prev) => ({ ...prev, selectedGroup: grp }))}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-info bg-info/10 text-primary ring-2 ring-info/30'
                        : units > 0
                        ? 'border-hairline bg-surface hover:border-info/40 text-primary'
                        : 'border-hairline bg-surface/50 text-muted opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">{grp}</span>
                      <span className={`text-[11px] font-bold ${units > 0 ? 'text-primary font-mono' : 'text-muted'}`}>
                        {units} u
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit Quantity Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">Selected Blood Group</label>
              <input
                type="text"
                readOnly
                value={compatibleModal.selectedGroup}
                className="w-full px-3 py-2 rounded-xl border border-hairline bg-surface font-extrabold text-xs text-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">Units to Issue</label>
              <input
                type="number"
                min={1}
                max={hospitalProfile?.inventory?.find((i) => i.bloodGroup === compatibleModal.selectedGroup)?.units || 1}
                value={compatibleModal.units}
                onChange={(e) => setCompatibleModal((prev) => ({ ...prev, units: Math.max(1, Number(e.target.value)) }))}
                className="w-full px-3 py-2 rounded-xl border border-hairline bg-surface font-bold text-xs text-primary focus:outline-none focus:border-info"
              />
            </div>
          </div>

          <p className="text-[11px] text-secondary leading-relaxed">
            Issuing compatible units will atomically deduct from your blood bank inventory and count toward the patient's fulfilled quota.
          </p>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setCompatibleModal({ isOpen: false, request: null, selectedGroup: '', units: 1, submitting: false })}
              className="btn-secondary text-xs px-4 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleIssueCompatibleSubmit}
              disabled={
                compatibleModal.submitting ||
                (hospitalProfile?.inventory?.find((i) => i.bloodGroup === compatibleModal.selectedGroup)?.units || 0) < compatibleModal.units
              }
              className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5"
            >
              <Droplet className="w-4 h-4" />
              <span>{compatibleModal.submitting ? 'Issuing Units...' : `Issue ${compatibleModal.units} Unit(s)`}</span>
            </button>
          </div>
        </div>
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
            {matchingData.request && (
              <div className="p-4 rounded-2xl bg-surface border border-theme flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {matchingData.request.bloodGroup && <Badge bloodGroup={matchingData.request.bloodGroup} />}
                  <div>
                    <h3 className="text-sm font-bold text-primary">{matchingData.request.patientName || 'Blood Request'}</h3>
                    <span className="text-xs text-muted">
                      {matchingData.request.unitsNeeded || 1} unit(s) • {matchingData.request.address || ''}
                    </span>
                  </div>
                </div>
                <Badge status={matchingData.request.status || (matchingData.isFulfilled ? 'fulfilled' : 'open')} />
              </div>
            )}

            {/* Fulfilled Notice & Disabled Contact Action */}
            {(matchingData.isFulfilled || !canSeekDonors(matchingData.request)) ? (
              <div className="p-6 rounded-2xl bg-surface border border-hairline text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <h4 className="text-base font-extrabold text-primary font-heading">Blood Request is Fulfilled</h4>
                <p className="text-xs text-secondary max-w-md mx-auto">
                  {matchingData.message || 'This emergency blood request is already fulfilled. Donor seeking is closed and candidate contact pings are disabled.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-xl bg-surface border border-hairline text-muted font-bold text-xs cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Contact Donor (Disabled - Request Fulfilled)</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Compatible Blood Inventory Reserves */}
                {(() => {
                  const compGroups = compatibleDonorGroups(matchingData.request?.bloodGroup || 'O+');
                  return (
                    <div className="p-4 rounded-2xl bg-surface border border-hairline space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                          Compatible Hospital Blood Reserves ({compGroups.join(', ')})
                        </span>
                        <span className="text-[11px] text-muted">
                          Patient Requirement: <strong className="text-primary font-mono">{matchingData.request?.bloodGroup}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {compGroups.map((grp) => {
                          const invItem = hospitalProfile?.inventory?.find((i) => i.bloodGroup === grp);
                          const units = invItem ? invItem.units : 0;
                          const isExact = grp === matchingData.request?.bloodGroup;
                          return (
                            <div
                              key={grp}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                units > 0
                                  ? isExact
                                    ? 'bg-info/15 border-info/30 text-info font-bold'
                                    : 'bg-surface border-hairline text-primary'
                                  : 'bg-surface/50 border border-hairline text-muted opacity-50'
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
                        className="p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card border-hairline"
                      >
                        <div className="flex items-start space-x-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 bg-info/10 border border-info/25 text-info"
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
                              <span className="font-semibold text-info flex items-center font-mono">
                                <MapPin className="w-3.5 h-3.5 mr-1 text-muted" /> {item.distanceKm} km away
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
                                  <span className="font-bold text-secondary flex items-center font-mono">
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
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-surface text-secondary border border-hairline"
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
                            className="text-right p-2.5 rounded-xl border border-hairline bg-surface min-w-[120px]"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider block text-muted">Match Score</span>
                            <span className="text-lg font-black text-primary block">{item.matchScore}%</span>
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
                              <span className="px-3 py-1.5 rounded-xl bg-surface text-secondary font-bold border border-hairline text-xs flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-spin text-muted" />
                                <span>Pending Response</span>
                              </span>
                            ) : ping.status === 'accepted' ? (
                              <div className="flex items-center space-x-2">
                                <span className="px-3 py-1.5 rounded-xl bg-success/10 text-success font-bold border border-success/30 text-xs flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                  <span>Accepted</span>
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="px-3 py-1.5 rounded-xl bg-danger/10 text-danger font-bold border border-danger/30 text-xs flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5 text-danger" />
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
          </>
        )}
      </div>
    )}
      </Modal>
    </PageTransition>
  );
};

export default HospitalDashboard;
