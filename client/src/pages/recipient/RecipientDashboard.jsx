import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { PlusCircle, Activity, ChevronRight, MapPin, Calendar, Users } from 'lucide-react';

const RecipientDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await requestApi.getMyRequests();
      if (res.data && res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch user requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-[#151c2e] to-[#151c2e] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white">Recipient Dashboard</h1>
          <p className="text-black text-sm mt-1">
            Broadcast emergency requests and monitor real-time donor matching engine results.
          </p>
        </div>
        <Link
          to="/recipient/create"
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all flex items-center space-x-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New Emergency Request</span>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-indigo-400" />
          Your Broadcast Requests
        </h2>

        {loading ? (
          <Loader text="Fetching your requests..." />
        ) : requests.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <p className="text-black text-sm mb-4">You have not created any emergency requests yet.</p>
            <Link
              to="/recipient/create"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs"
            >
              Create Request Now
            </Link>
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
                        <span className="text-xs text-black">{req.unitsNeeded} unit(s)</span>
                      </div>
                    </div>
                    <Badge status={req.status} />
                  </div>

                  <div className="space-y-2 text-xs text-black mt-4 border-t border-slate-200 pt-3">
                    <div className="flex items-center text-black">
                      <MapPin className="w-4 h-4 mr-2 text-rose-400 shrink-0" />
                      <span>{req.address}</span>
                    </div>
                    <div className="flex items-center text-black">
                      <Users className="w-4 h-4 mr-2 text-sky-400 shrink-0" />
                      <span>Matched Donors: {req.matchedDonorsCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-black">Urgency: {req.urgency.toUpperCase()}</span>
                  <Link
                    to={`/recipient/track/${req._id}`}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center"
                  >
                    <span>Track Live Matching</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipientDashboard;
