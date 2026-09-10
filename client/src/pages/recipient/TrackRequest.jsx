import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Activity, CheckCircle2, Cpu, MapPin, Phone, User, ShieldCheck, AlertCircle } from 'lucide-react';

const TrackRequest = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackData = async () => {
    setLoading(true);
    try {
      const [reqRes, matchRes] = await Promise.all([
        requestApi.getRequestById(id),
        requestApi.getMatches(id),
      ]);

      if (reqRes.data && reqRes.data.success) {
        setRequest(reqRes.data.data);
      }
      if (matchRes.data && matchRes.data.success) {
        setMatches(matchRes.data.data.matches || []);
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
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <Loader text="Querying live matching engine & donor pool..." />;
  if (!request) return <div className="text-center py-12 text-black">Request not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Request Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-[#151c2e] border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Badge bloodGroup={request.bloodGroup} />
            <div>
              <h1 className="text-2xl font-black text-white">{request.patientName}</h1>
              <p className="text-xs text-black">Request ID: {request._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge status={request.urgency} />
            <Badge status={request.status} />
          </div>
        </div>

        {/* Lifecycle Steps Indicator */}
        <div className="pt-4 border-t border-slate-200">
          <span className="text-xs font-bold text-black uppercase tracking-wider block mb-3">
            Request Lifecycle Status
          </span>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {['open', 'matching', 'fulfilled', 'cancelled'].map((st) => (
              <div
                key={st}
                className={`py-2 rounded-xl border transition-all ${
                  request.status === st
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                    : 'bg-lightbg/60 text-black border-slate-200'
                }`}
              >
                {st.toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-black pt-4 border-t border-slate-200">
          <div>
            <span className="text-black block">Required Units</span>
            <span className="font-bold text-white text-sm">{request.unitsNeeded} Unit(s)</span>
          </div>
          <div>
            <span className="text-black block">Hospital / Location</span>
            <span className="font-bold text-white text-sm">{request.address}</span>
          </div>
          <div>
            <span className="text-black block">Actions</span>
            {request.status !== 'fulfilled' && (
              <button
                onClick={() => handleUpdateStatus('fulfilled')}
                className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
              >
                Mark as Fulfilled
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Smart Matching Engine Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Smart Donor Matching Engine</h2>
              <p className="text-xs text-black">Rule-based scoring: Compatibility + Cooldown + Distance + Health Flags</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full text-xs font-extrabold">
            {matches.length} Top Candidate Donors Ranked
          </span>
        </div>

        {matches.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <p className="text-black text-sm">No compatible standby donors found within radius.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((res, index) => (
              <Card key={index} hover={false} className="border-slate-200 bg-[#151c2e]/90">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex flex-col items-center justify-center text-rose-400 shrink-0">
                      <span className="text-[10px] uppercase font-bold text-black">Rank</span>
                      <span className="text-lg font-black leading-none">#{index + 1}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white">
                          {res.donor?.user?.name || 'Candidate Donor'}
                        </h3>
                        <Badge bloodGroup={res.donor?.bloodGroup} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-black">
                        <span className="flex items-center text-rose-400 font-semibold">
                          <MapPin className="w-3.5 h-3.5 mr-1" /> {res.distanceKm} km away
                        </span>
                        <span>•</span>
                        <span>Age {res.donor?.age || '25'}</span>
                        <span>•</span>
                        {res.donor?.user?.phone && (
                          <span className="flex items-center text-emerald-400">
                            <Phone className="w-3.5 h-3.5 mr-1" /> {res.donor.user.phone}
                          </span>
                        )}
                      </div>

                      {/* Rationale badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {res.rationale.map((r, rIdx) => (
                          <span key={rIdx} className="px-2 py-0.5 rounded bg-lightbg text-[10px] font-medium text-black border border-slate-200">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Match Score Display */}
                  <div className="text-right shrink-0 bg-lightbg/80 p-3 rounded-2xl border border-slate-200 min-w-[140px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-black block">Match Score</span>
                    <span className="text-2xl font-black text-rose-400 block mt-0.5">{res.matchScore}%</span>
                    <div className="text-[10px] text-black mt-1">
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
