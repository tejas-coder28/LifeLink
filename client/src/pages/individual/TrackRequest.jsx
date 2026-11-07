import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../api/requestApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatUnits } from '../../constants/bloodUnits';
import {
  Activity,
  CheckCircle2,
  Cpu,
  MapPin,
  Phone,
  User,
  Heart,
  ShieldCheck,
  Clock,
  Building2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Edit2,
  Trash2,
  Ban,
} from 'lucide-react';

const TrackRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);

  // Modals for requester actions
  const [editModal, setEditModal] = useState({
    isOpen: false,
    patientName: '',
    unitsNeeded: 1,
    minAllowedUnits: 1,
    urgency: 'high',
    requiredByDate: '',
    notes: '',
    submitting: false,
  });

  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    pledgedCount: 0,
    fulfilledCount: 0,
    reason: 'created_by_mistake',
    note: '',
    submitting: false,
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    submitting: false,
  });

  const fetchTrackData = async () => {
    setLoading(true);
    try {
      const [reqRes, matchRes, donRes] = await Promise.all([
        requestApi.getRequestById(id),
        requestApi.getMatches(id).catch(() => ({ data: { success: false, data: {} } })),
        requestApi.getDonationsByRequest(id).catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (reqRes.data && reqRes.data.success) {
        setRequest(reqRes.data.data);
      }
      if (matchRes.data && matchRes.data.success) {
        setMatches(matchRes.data.data.matches || []);
      }
      if (donRes.data && donRes.data.success) {
        setDonations(donRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackData();
  }, [id]);

  const handleTryAnotherHospital = async () => {
    try {
      await requestApi.updateStatus(id, 'cancelled');
    } catch (e) {
      console.error('Failed to cancel request:', e);
    }
    navigate('/emergency-request', {
      state: {
        prefill: {
          patientName: request.patientName,
          bloodGroup: request.bloodGroup,
          unitsNeeded: request.unitsNeeded,
          urgency: request.urgency,
          notes: request.notes,
        },
      },
    });
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await requestApi.updateStatus(id, newStatus);
      if (res.data && res.data.success) {
        setRequest(res.data.data);
        showSuccess(`Request status updated to ${newStatus}`);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCompleteDonation = async (donationId) => {
    setCompletingId(donationId);
    try {
      const res = await requestApi.completeDonation(donationId);
      if (res.data && res.data.success) {
        showSuccess('Donation confirmed! Donor profile updated and notified.');
        await fetchTrackData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to confirm donation');
    } finally {
      setCompletingId(null);
    }
  };

  const isOwner =
    user &&
    request &&
    (user.accountType === 'admin' ||
      (request.requester?._id && request.requester._id.toString() === user._id.toString()) ||
      (request.requester && request.requester.toString() === user._id.toString()));

  const isCreatedRecent =
    request &&
    request.createdAt &&
    Date.now() - new Date(request.createdAt).getTime() < 5 * 60 * 1000;
  const hasPledges =
    (request?.unitsPledged || 0) > 0 ||
    donations.some((d) => d.status === 'pledged' || d.status === 'confirmed');
  const hasFulfilled =
    (request?.unitsReceived || 0) > 0 ||
    (request?.unitsFulfilled || 0) > 0 ||
    donations.some((d) => d.status === 'fulfilled' || d.status === 'completed');
  const isClosedOrCancelled =
    request &&
    (request.status === 'cancelled' ||
      request.status === 'closed' ||
      request.status === 'rejected');
  const canUndoDelete = isCreatedRecent && !hasPledges && !hasFulfilled && !isClosedOrCancelled;
  const canCancel = !isClosedOrCancelled;
  const canEdit = !isClosedOrCancelled;

  const handleOpenEditModal = () => {
    const minUnits = Math.max(1, (request.unitsReceived || 0) + (request.unitsPledged || 0));
    setEditModal({
      isOpen: true,
      patientName: request.patientName || '',
      unitsNeeded: request.unitsNeeded || minUnits,
      minAllowedUnits: minUnits,
      urgency: request.urgency || 'high',
      requiredByDate: request.requiredByDate ? request.requiredByDate.substring(0, 10) : '',
      notes: request.notes || '',
      submitting: false,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!request) return;
    if (editModal.unitsNeeded < editModal.minAllowedUnits) {
      showError(`Units needed cannot be less than pledged + received (${editModal.minAllowedUnits}).`);
      return;
    }
    setEditModal((prev) => ({ ...prev, submitting: true }));
    try {
      const payload = {
        patientName: editModal.patientName,
        unitsNeeded: Number(editModal.unitsNeeded),
        urgency: editModal.urgency,
        notes: editModal.notes,
      };
      if (editModal.requiredByDate) {
        payload.requiredByDate = editModal.requiredByDate;
      }
      const res = await requestApi.editRequest(request._id, payload);
      if (res.data && res.data.success) {
        showSuccess('Request updated successfully');
        setEditModal((prev) => ({ ...prev, isOpen: false }));
        fetchTrackData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update request');
    } finally {
      setEditModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleOpenCancelModal = () => {
    setCancelModal({
      isOpen: true,
      pledgedCount: request.unitsPledged || 0,
      fulfilledCount: request.unitsReceived || 0,
      reason: 'created_by_mistake',
      note: '',
      submitting: false,
    });
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!request) return;
    setCancelModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await requestApi.cancelRequest(request._id, {
        reason: cancelModal.reason,
        note: cancelModal.note,
      });
      if (res.data && res.data.success) {
        showSuccess('Request has been cancelled and pledges released.');
        setCancelModal((prev) => ({ ...prev, isOpen: false }));
        fetchTrackData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancelModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleCloseRequest = async () => {
    const confirm = window.confirm(
      'Are you sure you want to close this request? No new pledges will be accepted, but all received units will remain recorded.'
    );
    if (!confirm) return;
    try {
      const res = await requestApi.closeRequest(request._id, { reason: 'Requester closed request' });
      if (res.data && res.data.success) {
        showSuccess('Request closed successfully.');
        fetchTrackData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to close request');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!request) return;
    setDeleteModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await requestApi.deleteRequest(request._id);
      if (res.data && res.data.success) {
        showSuccess('Request deleted successfully.');
        setDeleteModal((prev) => ({ ...prev, isOpen: false }));
        navigate('/emergency-request');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete request');
    } finally {
      setDeleteModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) return <Loader text="Querying live matching engine & hospital status..." />;
  if (!request) return <EmptyState title="Request Not Found" description="The requested emergency blood broadcast could not be retrieved." />;

  const isPendingReview = request.status === 'pending_hospital_review';
  const isTimedOut =
    request.status === 'hospital_no_response' ||
    (isPendingReview &&
      request.urgency === 'critical' &&
      Date.now() - new Date(request.createdAt).getTime() >= 15 * 60 * 1000);

  const targetHosp = request.targetHospital || request.hospital;

  // Compute step progression
  const getStepState = (stepIndex) => {
    if (request.status === 'rejected') return 'error';
    if (request.status === 'hospital_no_response' || isTimedOut) return stepIndex === 1 ? 'error' : stepIndex === 0 ? 'complete' : 'pending';
    if (request.status === 'fulfilled') return 'complete';

    if (stepIndex === 0) return 'complete'; // Sent to hospital
    if (stepIndex === 1) {
      // Under Review
      if (isPendingReview) return 'active';
      return 'complete';
    }
    if (stepIndex === 2) {
      // Stock Check
      if (isPendingReview) return 'pending';
      return 'complete';
    }
    if (stepIndex === 3) {
      // Donors needed / Fulfilled
      if (['open', 'matching', 'partially_fulfilled'].includes(request.status)) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 page-enter">
      {/* ⚠️ Hospital Timeout Banner if critical request passed 15 minutes */}
      {isTimedOut && (
        <div className="p-5 rounded-2xl bg-warning/10 border-2 border-warning/40 text-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-primary">Hospital Response Window Expired (15 Minutes)</h4>
              <p className="text-xs text-secondary mt-0.5">
                The target hospital has not responded to this critical request in 15 minutes. You can cancel this request and reroute it to another verified hospital immediately.
              </p>
            </div>
          </div>
          <button
            onClick={handleTryAnotherHospital}
            className="btn-primary text-xs px-4 py-2.5 rounded-xl whitespace-nowrap shrink-0 shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Another Hospital</span>
          </button>
        </div>
      )}

      {/* ❌ Rejection Banner */}
      {request.status === 'rejected' && (
        <div className="p-5 rounded-2xl bg-danger/10 border-2 border-danger/40 text-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-danger">Request Declined by Hospital</h4>
              <p className="text-xs text-secondary mt-0.5">
                Reason provided: <strong className="text-primary">{request.rejectionReason || 'Unable to accept request at this time.'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleTryAnotherHospital}
            className="btn-primary text-xs px-4 py-2.5 rounded-xl whitespace-nowrap shrink-0 shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Select Another Hospital</span>
          </button>
        </div>
      )}

      {/* Request Header */}
      <div className="hero-glass-card rounded-3xl p-6 sm:p-8 border border-hairline space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Badge bloodGroup={request.bloodGroup} />
            <div>
              <h1 className="text-2xl font-black text-primary font-heading">{request.patientName}</h1>
              <p className="text-xs text-muted">Request ID: {request._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {request.isEdited && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-info/10 text-info border border-info/30">
                Edited
              </span>
            )}
            <Badge status={request.urgency} />
            <Badge status={request.status} />
          </div>
        </div>

        {/* 4-Step Lifecycle Tracker */}
        <div className="pt-4 border-t border-hairline">
          <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-3">
            Emergency Request Lifecycle Flow
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              { label: '1. Sent to Hospital', sub: targetHosp?.name || 'Target Hospital' },
              { label: '2. Under Review', sub: isPendingReview ? 'Reviewing now...' : 'Reviewed ✓' },
              { label: '3. Stock Check', sub: request.unitsFromStock > 0 ? `${request.unitsFromStock} units from stock` : '0 in stock' },
              { label: '4. Donors / Fulfilled', sub: request.status === 'fulfilled' ? 'Fulfilled ✓' : request.unitsFromDonors > 0 ? `${request.unitsFromDonors} donor units needed` : 'Pending review' },
            ].map((step, idx) => {
              const state = getStepState(idx);
              let badgeBg = 'bg-surface border-hairline text-secondary';
              if (state === 'complete') badgeBg = 'bg-success/15 border-success/30 text-success font-extrabold';
              else if (state === 'active') badgeBg = 'bg-info/15 border-info/35 text-info font-extrabold animate-pulse';
              else if (state === 'error') badgeBg = 'bg-danger/15 border-danger/35 text-danger font-extrabold';

              return (
                <div key={idx} className={`p-3 rounded-2xl border transition-all text-center ${badgeBg}`}>
                  <span className="block font-bold text-xs">{step.label}</span>
                  <span className="block text-[10px] text-muted mt-0.5 truncate">{step.sub}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Hospital & Units Breakdown Cards */}
        <div className="space-y-4 pt-4 border-t border-hairline">
          <div className="p-3.5 rounded-2xl bg-surface border border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Assigned Target Hospital</span>
                <span className="font-extrabold text-primary text-sm">{targetHosp?.name || 'Local Hospital Center'}</span>
                <p className="text-[11px] text-muted truncate">{targetHosp?.address || request.address}</p>
              </div>
            </div>
            {targetHosp?.phone && (
              <span className="px-3 py-1.5 rounded-xl bg-surface border border-theme font-mono text-secondary text-xs">
                {targetHosp.phone}
              </span>
            )}
          </div>

          {/* Five Unit Metrics Breakdown Box */}
          {(() => {
            const totalNeeded = request.unitsNeeded || 1;
            const fromStock = request.unitsFromStock || 0;
            const neededFromDonors = request.unitsFromDonors !== undefined && request.unitsFromDonors !== null && request.unitsFromDonors > 0
              ? request.unitsFromDonors
              : request.status === 'pending_hospital_review'
              ? 0
              : Math.max(0, totalNeeded - fromStock);
            const pledgedUnits = donations.filter(d => d.status === 'pledged').reduce((sum, d) => sum + (d.unitsDonated || 1), 0);
            const receivedUnits = request.unitsFulfilled !== undefined
              ? request.unitsFulfilled
              : donations.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.unitsDonated || 1), 0);
            const pctReceived = Math.min(100, Math.round((receivedUnits / (totalNeeded || 1)) * 100));
            const pctPledged = Math.min(100 - pctReceived, Math.round((pledgedUnits / (totalNeeded || 1)) * 100));

            return (
              <div className="p-4 rounded-2xl bg-surface border border-hairline space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-surface border border-hairline">
                    <span className="text-[10px] text-muted uppercase font-bold block">Total needed</span>
                    <span className="font-black text-primary text-base sm:text-lg">{totalNeeded}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-hairline">
                    <span className="text-[10px] text-muted uppercase font-bold block">From hospital stock</span>
                    <span className="font-black text-primary text-base sm:text-lg">{fromStock}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-hairline">
                    <span className="text-[10px] text-muted uppercase font-bold block">Needed from donors</span>
                    <span className={`font-black text-base sm:text-lg ${neededFromDonors > 0 ? 'text-danger' : 'text-primary'}`}>{neededFromDonors}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-hairline">
                    <span className="text-[10px] text-muted uppercase font-bold block">Pledged</span>
                    <span className="font-black text-info text-base sm:text-lg">{pledgedUnits}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-hairline">
                    <span className="text-[10px] text-muted uppercase font-bold block">Received</span>
                    <span className="font-black text-success text-base sm:text-lg">{receivedUnits}</span>
                  </div>
                </div>

                {/* Small Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-surface border border-hairline h-2.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${pctReceived}%` }}
                      className="bg-success h-full transition-all"
                      title={`Received: ${receivedUnits}/${totalNeeded}`}
                    />
                    <div
                      style={{ width: `${pctPledged}%` }}
                      className="bg-info/60 h-full transition-all"
                      title={`Pledged: ${pledgedUnits}/${totalNeeded}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted font-medium">
                    <span className="text-success font-bold">{pctReceived}% Received ({receivedUnits}/{totalNeeded})</span>
                    {pledgedUnits > 0 && <span className="text-info font-bold">+{pledgedUnits} Pledged</span>}
                    <span>Target: {totalNeeded} unit(s)</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Requester Action Buttons (Edit, Cancel, Delete, Close) */}
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-hairline">
            <span className="text-xs text-muted">
              {isClosedOrCancelled ? 'This request is closed/withdrawn.' : 'Manage your emergency request:'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="btn-secondary px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
              {canUndoDelete ? (
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: true, submitting: false })}
                  className="btn-danger px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Request</span>
                </button>
              ) : hasFulfilled && canCancel ? (
                <button
                  type="button"
                  onClick={handleCloseRequest}
                  className="btn-secondary px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Close Request</span>
                </button>
              ) : canCancel ? (
                <button
                  type="button"
                  onClick={handleOpenCancelModal}
                  className="btn-danger px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Request</span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>


      {/* Pledged Donors & Fulfillments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-2xl shadow-sm shrink-0 bg-info/10 border border-info/20 text-info">
              <Heart className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-primary font-heading">Pledged Donors & Fulfillments</h2>
              <p className="text-xs text-secondary">Donors who have stepped up to donate for this request</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-surface text-primary border border-hairline rounded-full text-xs font-bold">
            {donations.length} Active Pledge(s)
          </span>
        </div>

        {donations.length === 0 ? (
          <Card hover={false} className="text-center py-8">
            <p className="text-xs text-secondary">No pledges received for this request yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {donations.map((don) => (
              <Card key={don._id} hover={false}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-info/10 border border-info/20 text-info"
                    >
                      <User className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-primary">{don.donor?.name || 'Registered Donor'}</h3>
                        <Badge status={don.status} />
                      </div>
                      <div className="flex items-center space-x-3 text-xs mt-0.5 text-secondary">
                        <span>Pledged: {don.unitsDonated} unit(s)</span>
                        <span>•</span>
                        {don.donor?.phone && (
                          <span className="flex items-center text-secondary font-semibold font-mono">
                            <Phone className="w-3 h-3 mr-1" /> {don.donor.phone}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-mono text-[11px]">Date: {new Date(don.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {don.status === 'pledged' && (
                    <button
                      onClick={() => handleCompleteDonation(don._id)}
                      disabled={completingId === don._id}
                      className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{completingId === don._id ? 'Completing...' : 'Mark Donation Completed'}</span>
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Smart Matching Engine Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className="p-2.5 rounded-2xl shadow-sm shrink-0 bg-info/10 border border-info/20 text-info"
            >
              <Cpu className="w-5 h-5 animate-pulse text-info" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-primary font-heading">Smart Donor Matching Engine</h2>
              <p className="text-xs text-secondary">Rule-based scoring: Compatibility + Cooldown + Distance + Health Flags</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-info/10 text-info border border-info/20 rounded-full text-xs font-bold">
            {matches.length} Top Candidate Donors Ranked
          </span>
        </div>

        {matches.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <p className="text-xs text-secondary">No compatible standby donors found within radius.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((res, index) => (
              <Card key={index} hover={false}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 bg-info/10 border border-info/20 text-info"
                    >
                      <span className="text-[9px] uppercase font-bold text-muted">Rank</span>
                      <span className="text-lg font-black leading-none text-primary">#{index + 1}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-primary">
                          {res.donor?.user?.name || 'Candidate Donor'}
                        </h3>
                        <Badge bloodGroup={res.donor?.bloodGroup} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                        <span className="flex items-center text-info font-semibold font-mono">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-muted" /> {res.distanceKm} km away
                        </span>
                        {res.donor?.age && (
                          <>
                            <span>•</span>
                            <span>Age {res.donor.age}</span>
                          </>
                        )}
                        <span>•</span>
                        {res.donor?.user?.phone && (
                          <span className="flex items-center text-secondary font-mono">
                            <Phone className="w-3.5 h-3.5 mr-1" /> {res.donor.user.phone}
                          </span>
                        )}
                      </div>

                      {/* Rationale badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {res.rationale.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-medium border border-hairline bg-surface text-secondary"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Match Score Display */}
                  <div
                    className="text-right shrink-0 p-3 rounded-2xl min-w-[140px] border border-hairline bg-surface"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-muted">Match Score</span>
                    <span className="text-2xl font-black text-primary block mt-0.5">{res.matchScore}%</span>
                    <div className="text-[10px] text-muted mt-1 font-mono">
                      Compat: {res.breakdown?.compatibilityScore} | Geo: {res.breakdown?.geoScore}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Request Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        title="Edit Blood Request"
      >
        {request && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-info/10 border border-info/30 text-xs text-primary">
              <span className="font-bold">Blood Group:</span>
              <Badge bloodGroup={request.bloodGroup} />
              <span className="text-[11px] text-secondary ml-auto">
                Blood group & hospital cannot be changed.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">
                Patient Name
              </label>
              <input
                type="text"
                required
                value={editModal.patientName}
                onChange={(e) => setEditModal({ ...editModal, patientName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary uppercase mb-1">
                  Units Needed
                </label>
                <input
                  type="number"
                  min={editModal.minAllowedUnits}
                  max={50}
                  required
                  value={editModal.unitsNeeded}
                  onChange={(e) => setEditModal({ ...editModal, unitsNeeded: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-[11px] text-secondary mt-1 block">
                  {formatUnits(editModal.unitsNeeded)}
                  {editModal.minAllowedUnits > 1 && (
                    <span className="text-warning ml-1">(Min {editModal.minAllowedUnits} due to pledges/received)</span>
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase mb-1">
                  Urgency Level
                </label>
                <select
                  value={editModal.urgency}
                  onChange={(e) => setEditModal({ ...editModal, urgency: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  <option value="critical">Critical (Immediate)</option>
                  <option value="high">High (Urgent)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="low">Low (Flexible)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">
                Required By Date
              </label>
              <input
                type="date"
                value={editModal.requiredByDate}
                onChange={(e) => setEditModal({ ...editModal, requiredByDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">
                Notes / Directions
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={editModal.notes}
                onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                placeholder="Hospital room/bed directions, contact notes..."
                className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-theme">
              <button
                type="button"
                onClick={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editModal.submitting}
                className="btn-primary px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {editModal.submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Request Modal */}
      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal((prev) => ({ ...prev, isOpen: false }))}
        title="Cancel Blood Request"
      >
        {request && (
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Withdraw Blood Request</span>
              </div>
              <p className="text-secondary leading-relaxed">
                Cancelling this request will immediately mark it as cancelled, withdraw it from active matching, and release any active donor pledges.
              </p>
              {cancelModal.pledgedCount > 0 && (
                <div className="p-2.5 rounded-lg bg-warning/15 border border-warning/30 text-warning font-semibold text-xs">
                  ⚠️ <strong>{cancelModal.pledgedCount} donor(s)</strong> have currently pledged to this request.
                  Their pledges will be released back to standby, and their eligibility cooldown will NOT be penalised.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">
                Reason for Cancellation <span className="text-danger">*</span>
              </label>
              <select
                required
                value={cancelModal.reason}
                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="created_by_mistake">Created by mistake</option>
                <option value="wrong_details">Wrong details</option>
                <option value="patient_recovered">Patient no longer needs blood</option>
                <option value="need_met_elsewhere">Need met elsewhere</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-1">
                Optional Note (max 200 chars)
              </label>
              <textarea
                rows={2}
                maxLength={200}
                value={cancelModal.note}
                onChange={(e) => setCancelModal({ ...cancelModal, note: e.target.value })}
                placeholder="Optional explanation..."
                className="w-full px-4 py-2.5 rounded-xl border border-theme bg-surface-elevated text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-[10px] text-muted block text-right">
                {cancelModal.note.length}/200
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-theme">
              <button
                type="button"
                onClick={() => setCancelModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                Keep Request
              </button>
              <button
                type="submit"
                disabled={cancelModal.submitting}
                className="btn-danger px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{cancelModal.submitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Request Modal (Undo-Create) */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        title="Delete Blood Request"
      >
        {request && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Undo / Delete Request</span>
              </div>
              <p className="text-secondary leading-relaxed">
                This request was created less than 5 minutes ago and has received no donor pledges.
                Deleting it will permanently remove the record and any initial match notifications.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-theme">
              <button
                type="button"
                onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleteModal.submitting}
                className="btn-danger px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteModal.submitting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TrackRequest;
