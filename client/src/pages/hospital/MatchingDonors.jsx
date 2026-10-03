import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { pingApi } from '../../api/pingApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import {
  Cpu,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const MatchingDonorsPage = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pingsMap, setPingsMap] = useState({});
  const [notifyingDonorId, setNotifyingDonorId] = useState(null);

  const fetchMatchesAndPings = async () => {
    try {
      const [matchesRes, pingsRes] = await Promise.all([
        requestApi.getMatches(id),
        pingApi.getRequestPings(id),
      ]);

      if (matchesRes.data && matchesRes.data.success) {
        setData(matchesRes.data.data);
      }
      if (pingsRes.data && pingsRes.data.success) {
        const map = {};
        (pingsRes.data.data || []).forEach((ping) => {
          const dId = ping.donorId?._id || ping.donorId;
          map[dId] = ping;
        });
        setPingsMap(map);
      }
    } catch (err) {
      console.error('Failed to load donor matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchesAndPings();

    // 5-second live polling interval
    const interval = setInterval(() => {
      pingApi.getRequestPings(id).then((pingsRes) => {
        if (pingsRes.data && pingsRes.data.success) {
          const map = {};
          (pingsRes.data.data || []).forEach((ping) => {
            const dId = ping.donorId?._id || ping.donorId;
            map[dId] = ping;
          });
          setPingsMap(map);
        }
      }).catch(err => console.error(err));
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const handleContactDonor = async (donorUserId) => {
    setNotifyingDonorId(donorUserId);
    try {
      const res = await pingApi.notifyDonor(id, donorUserId);
      if (res.data && res.data.success) {
        showSuccess('Candidate donor notified! In-app ping sent.');
        fetchMatchesAndPings();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to ping donor');
    } finally {
      setNotifyingDonorId(null);
    }
  };

  const handleConfirmDonation = async (donorUserId) => {
    try {
      const res = await requestApi.pledgeDonation({ requestId: id, donorId: donorUserId, unitsDonated: 1 });
      if (res.data && res.data.success) {
        await requestApi.updateStatus(id, 'fulfilled');
        showSuccess('Donation confirmed & request fulfilled!');
        fetchMatchesAndPings();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to log donation');
    }
  };

  if (loading) return <Loader text="Executing rule-based matching engine scoring algorithm..." />;
  if (!data) return <EmptyState title="Request Not Found" description="Could not load candidate donor matches." />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 page-enter">
      <Link to="/hospital/dashboard" className="inline-flex items-center text-xs font-bold text-muted hover:text-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        <span>Back to Hospital Portal</span>
      </Link>

      {/* Header Bar */}
      <div className="hero-glass-card relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 relative z-10">
          <Badge bloodGroup={data.request.bloodGroup} />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-heading">{data.request.patientName}</h1>
            <span className="text-xs text-secondary">ID: {data.request._id} • {data.request.address}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 relative z-10">
          <Badge status={data.request.urgency} />
          <Badge status={data.request.status} />
        </div>
      </div>

      {/* Matching Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-lg sm:text-xl font-black text-primary font-heading">Smart Matching Donor Rankings</h2>
          </div>
          <span className="text-xs font-semibold text-secondary">
            {data.matchesCount} Top Candidate Donors Ranked
          </span>
        </div>

        {data.matches.length === 0 ? (
          <EmptyState title="No Compatible Standby Donors" description="No candidate donors met compatibility and cooldown criteria." />
        ) : (
          <div className="space-y-3">
            {data.matches.map((item, index) => {
              const donorUserId = item.donor?.user?._id || item.donor?.user?.id;
              const ping = pingsMap[donorUserId];
              const isNotifying = notifyingDonorId === donorUserId;

              return (
                <Card key={index} hover={false} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                      style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fb7185' }}
                    >
                      #{index + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-primary">
                          {item.donor?.user?.name || 'Candidate Donor'}
                        </h3>
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

                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.rationale.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-surface border border-theme text-secondary"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Score */}
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
                          onClick={() => handleContactDonor(donorUserId)}
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
                          {data.request.status !== 'fulfilled' && (
                            <button
                              onClick={() => handleConfirmDonation(donorUserId)}
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
                            onClick={() => handleContactDonor(donorUserId)}
                            disabled={isNotifying}
                            className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
                          >
                            Re-Ping
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchingDonorsPage;
