import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { donorApi } from '../../api/donorApi';
import { requestApi } from '../../api/requestApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Heart, Activity, Calendar, MapPin, CheckCircle2, AlertCircle, Phone, User, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const DonorDashboard = () => {
  const { user, profile, setProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [pledgingId, setPledgingId] = useState(null);
  const [pledgeMsg, setPledgeMsg] = useState('');

  const fetchDonorProfile = async () => {
    try {
      const res = await donorApi.getProfile();
      if (res.data && res.data.success) {
        setProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const fetchMatchingRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await requestApi.getRequests({ status: 'open' });
      if (res.data && res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchDonorProfile();
    fetchMatchingRequests();
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      const newStatus = !profile.isAvailable;
      const res = await donorApi.updateProfile({ isAvailable: newStatus });
      if (res.data && res.data.success) {
        setProfile(res.data.data);
      }
    } catch (err) {
      alert('Failed to update availability');
    }
  };

  const handlePledge = async (requestId) => {
    setPledgingId(requestId);
    setPledgeMsg('');
    try {
      const res = await requestApi.pledgeDonation({ requestId, unitsDonated: 1 });
      if (res.data && res.data.success) {
        setPledgeMsg('Donation pledged! Thank you for stepping up to save a life.');
        fetchMatchingRequests();
        fetchDonorProfile();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pledge donation');
    } finally {
      setPledgingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-rose-950/60 via-[#151c2e] to-[#151c2e] border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-black text-white">Donor Command Center</h1>
            {profile?.bloodGroup && <Badge bloodGroup={profile.bloodGroup} />}
          </div>
          <p className="text-black text-sm">
            Welcome back, <span className="font-semibold text-white">{user?.name}</span>! Ready to answer emergency blood requests.
          </p>
        </div>

        {/* Availability Toggle Box */}
        {profile && (
          <div className="flex items-center space-x-4 bg-lightbg/90 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs text-black font-medium block">Standby Availability</span>
              <span className={`text-sm font-bold ${profile.isAvailable ? 'text-emerald-400' : 'text-black'}`}>
                {profile.isAvailable ? 'ONLINE (ACTIVE STANDBY)' : 'OFFLINE (INACTIVE)'}
              </span>
            </div>
            <button
              onClick={handleToggleAvailability}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                profile.isAvailable
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-white hover:bg-slate-700 text-black'
              }`}
            >
              Toggle Status
            </button>
          </div>
        )}
      </div>

      {pledgeMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-semibold flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
          {pledgeMsg}
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card hover={false}>
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Registered Blood Group</span>
          <span className="text-2xl font-black text-rose-500 block mt-2">{profile?.bloodGroup || 'Not Set'}</span>
        </Card>

        <Card hover={false}>
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Total Lifesaving Pledges</span>
          <span className="text-2xl font-black text-white block mt-2">{profile?.totalDonations || 0}</span>
        </Card>

        <Card hover={false}>
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Last Donation Date</span>
          <span className="text-base font-bold text-black block mt-2">
            {profile?.lastDonationDate ? new Date(profile.lastDonationDate).toLocaleDateString() : 'None Recorded'}
          </span>
        </Card>

        <Card hover={false}>
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Quick Links</span>
          <div className="flex space-x-2 mt-2">
            <Link to="/donor/profile" className="text-xs text-rose-400 hover:underline font-semibold">Edit Profile</Link>
            <span className="text-black">•</span>
            <Link to="/donor/history" className="text-xs text-rose-400 hover:underline font-semibold">Pledge History</Link>
          </div>
        </Card>
      </div>

      {/* Active Requests List for Donors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-rose-500 animate-pulse" />
            Live Emergency Requests
          </h2>
          <span className="text-xs text-black">Matching nearby hospital & recipient needs</span>
        </div>

        {loadingRequests ? (
          <Loader text="Fetching open emergency blood requests..." />
        ) : requests.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <p className="text-black text-sm">No open blood requests currently broadcast.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map((req) => (
              <Card key={req._id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge bloodGroup={req.bloodGroup} />
                      <div>
                        <h3 className="text-base font-bold text-white">{req.patientName}</h3>
                        <span className="text-xs text-black">
                          {req.unitsNeeded} unit(s) needed
                        </span>
                      </div>
                    </div>
                    <Badge status={req.urgency} />
                  </div>

                  <div className="space-y-2 text-xs text-black mt-4 border-t border-slate-200 pt-3">
                    <div className="flex items-center text-black">
                      <MapPin className="w-4 h-4 mr-2 text-rose-400 shrink-0" />
                      <span>{req.address}</span>
                    </div>
                    <div className="flex items-center text-black">
                      <User className="w-4 h-4 mr-2 text-sky-400 shrink-0" />
                      <span>Requester: {req.requester?.name || 'Emergency Recipient'}</span>
                    </div>
                    {req.notes && (
                      <p className="text-[11px] text-black italic bg-lightbg/60 p-2 rounded-lg mt-2">
                        "{req.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-black">
                    Required by: {new Date(req.requiredByDate).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handlePledge(req._id)}
                    disabled={pledgingId === req._id}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1"
                  >
                    <Heart className="w-3.5 h-3.5 mr-1" />
                    <span>{pledgingId === req._id ? 'Pledging...' : 'Pledge Donation'}</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorDashboard;
