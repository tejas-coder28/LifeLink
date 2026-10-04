import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
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
  ArrowRight
} from 'lucide-react';

const TrackRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);

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

  if (loading) return <Loader text="Querying live matching engine & hospital status..." />;
  if (!request) return <div className="text-center py-12 text-slate-600">Request not found.</div>;

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
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
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
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-rose-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-rose-700 dark:text-rose-300">Request Declined by Hospital</h4>
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
      <div className="hero-glass-card rounded-3xl p-6 sm:p-8 border border-theme space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Badge bloodGroup={request.bloodGroup} />
            <div>
              <h1 className="text-2xl font-black text-primary font-heading">{request.patientName}</h1>
              <p className="text-xs text-muted">Request ID: {request._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge status={request.urgency} />
            <Badge status={request.status} />
          </div>
        </div>

        {/* 4-Step Lifecycle Tracker */}
        <div className="pt-4 border-t border-theme">
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
              let badgeBg = 'bg-surface border-theme text-secondary';
              if (state === 'complete') badgeBg = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-extrabold';
              else if (state === 'active') badgeBg = 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-extrabold animate-pulse';
              else if (state === 'error') badgeBg = 'bg-rose-950/20 border-rose-500/40 text-rose-600 dark:text-rose-400 font-extrabold';

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
        <div className="space-y-4 pt-4 border-t border-theme">
          <div className="p-3.5 rounded-2xl bg-surface border border-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Assigned Target Hospital</span>
                <span className="font-extrabold text-primary text-sm">{targetHosp?.name || 'Local Hospital Center'}</span>
                <p className="text-[11px] text-muted truncate">{targetHosp?.address || request.address}</p>
              </div>
            </div>
            {targetHosp?.phone && (
              <span className="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-white/5 font-mono text-teal-600 dark:text-teal-400 text-xs">
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
              <div className="p-4 rounded-2xl bg-surface border border-theme space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-muted uppercase font-bold block">Total needed</span>
                    <span className="font-black text-primary text-base sm:text-lg">{totalNeeded}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-muted uppercase font-bold block">From hospital stock</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">{fromStock}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-muted uppercase font-bold block">Needed from donors</span>
                    <span className="font-black text-sky-600 dark:text-sky-400 text-base sm:text-lg">{neededFromDonors}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-muted uppercase font-bold block">Pledged</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-base sm:text-lg">{pledgedUnits}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-muted uppercase font-bold block">Received</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">{receivedUnits}</span>
                  </div>
                </div>

                {/* Small Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${pctReceived}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Received: ${receivedUnits}/${totalNeeded}`}
                    />
                    <div
                      style={{ width: `${pctPledged}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`Pledged: ${pledgedUnits}/${totalNeeded}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pctReceived}% Received ({receivedUnits}/{totalNeeded})</span>
                    {pledgedUnits > 0 && <span className="text-amber-600 dark:text-amber-400 font-bold">+{pledgedUnits} Pledged</span>}
                    <span>Target: {totalNeeded} unit(s)</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>


      {/* Pledged Donors & Fulfillments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-2xl shadow-lg shrink-0" style={{ background: 'rgba(34,200,160,0.2)', border: '1px solid rgba(34,200,160,0.35)', color: '#0d9488' }}>
              <Heart className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-primary font-heading">Pledged Donors & Fulfillments</h2>
              <p className="text-xs text-secondary">Donors who have stepped up to donate for this request</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
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
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0"
                      style={{ background: 'rgba(34,200,160,0.15)', border: '1px solid rgba(34,200,160,0.3)', color: '#0d9488' }}
                    >
                      <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
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
                          <span className="flex items-center text-teal-600 dark:text-teal-400 font-semibold font-mono">
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
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer shadow-md"
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
              className="p-2.5 rounded-2xl shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(245,158,11,0.15))', border: '1px solid rgba(220,38,38,0.35)', color: '#e11d48' }}
            >
              <Cpu className="w-5 h-5 animate-pulse text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-primary font-heading">Smart Donor Matching Engine</h2>
              <p className="text-xs text-secondary">Rule-based scoring: Compatibility + Cooldown + Distance + Health Flags</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-full text-xs font-bold">
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
                      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#e11d48' }}
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
                        <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold font-mono">
                          <MapPin className="w-3.5 h-3.5 mr-1" /> {res.distanceKm} km away
                        </span>
                        {res.donor?.age && (
                          <>
                            <span>•</span>
                            <span>Age {res.donor.age}</span>
                          </>
                        )}
                        <span>•</span>
                        {res.donor?.user?.phone && (
                          <span className="flex items-center text-teal-600 dark:text-teal-400 font-mono">
                            <Phone className="w-3.5 h-3.5 mr-1" /> {res.donor.user.phone}
                          </span>
                        )}
                      </div>

                      {/* Rationale badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {res.rationale.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-medium border border-theme bg-surface text-secondary"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Match Score Display */}
                  <div
                    className="text-right shrink-0 p-3 rounded-2xl min-w-[140px] border border-theme bg-surface"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-muted">Match Score</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-0.5">{res.matchScore}%</span>
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
    </div>
  );
};

export default TrackRequest;
