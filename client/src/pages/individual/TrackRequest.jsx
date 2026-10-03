import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Activity, CheckCircle2, Cpu, MapPin, Phone, User, Heart, ShieldCheck, Clock } from 'lucide-react';

const TrackRequest = () => {
  const { id } = useParams();
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
        requestApi.getMatches(id),
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
        showSuccess('Donation marked as completed! Request status updated to fulfilled.');
        await fetchTrackData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to mark donation as completed');
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return <Loader text="Querying live matching engine & donor pool..." />;
  if (!request) return <div className="text-center py-12 text-slate-600">Request not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Request Header */}
      <div className="hero-glass-card rounded-3xl p-6 sm:p-8 border border-theme space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Badge bloodGroup={request.bloodGroup} />
            <div>
              <h1 className="text-2xl font-black text-primary">{request.patientName}</h1>
              <p className="text-xs text-muted">Request ID: {request._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge status={request.urgency} />
            <Badge status={request.status} />
          </div>
        </div>

        {/* Lifecycle Steps Indicator */}
        <div className="pt-4 border-t border-theme">
          <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">
            Request Lifecycle Status
          </span>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {['open', 'matching', 'fulfilled', 'cancelled'].map((st) => (
              <div
                key={st}
                className={`py-2 rounded-xl border transition-all ${
                  request.status === st
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-secondary border-theme'
                }`}
              >
                {st.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-secondary pt-4 border-t border-theme">
          <div>
            <span className="text-muted block">Required Units</span>
            <span className="font-bold text-primary text-sm">{request.unitsNeeded} Unit(s)</span>
          </div>
          <div>
            <span className="text-muted block">Hospital / Location</span>
            <span className="font-bold text-primary text-sm">{request.address}</span>
          </div>
          <div>
            <span className="text-muted block">Actions</span>
            {request.status !== 'fulfilled' && (
              <button
                onClick={() => handleUpdateStatus('fulfilled')}
                className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Mark as Fulfilled
              </button>
            )}
          </div>
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
