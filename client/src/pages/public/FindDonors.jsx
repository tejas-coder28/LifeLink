import React, { useState, useEffect } from 'react';
import { donorApi } from '../../api/donorApi';
import { ALL_BLOOD_GROUPS, getCompatibleDonorGroups } from '../../utils/bloodCompatibility';
import { Search, MapPin, User, CheckCircle2, AlertCircle, Phone, Calendar } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';

const FindDonors = () => {
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDonors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedBloodGroup !== 'All') {
        params.bloodGroup = selectedBloodGroup;
      }
      const res = await donorApi.searchDonors(params);
      if (res.data && res.data.success) {
        setDonors(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search donors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [selectedBloodGroup]);

  // Filter based on recipient compatibility filter if selected
  const filteredDonors = donors.filter((d) => {
    if (!recipientFilter) return true;
    const compatibleGroups = getCompatibleDonorGroups(recipientFilter);
    return compatibleGroups.includes(d.bloodGroup);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-black">Standby Donor Directory</h1>
        <p className="text-black text-sm max-w-xl mx-auto">
          Search registered donors by blood type or filter compatible donors for your recipient blood group.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white/80 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-black mb-2">Filter by Exact Donor Blood Group</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBloodGroup('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedBloodGroup === 'All'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-lightbg text-black border border-slate-200 hover:bg-white'
              }`}
            >
              All Types
            </button>
            {ALL_BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBloodGroup(bg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedBloodGroup === bg
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-lightbg text-black border border-slate-200 hover:bg-white'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black mb-2">
            Find Compatible Donors for Recipient Type:
          </label>
          <select
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
            className="w-full bg-lightbg text-black text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          >
            <option value="">No Recipient Filter (Show All Selected)</option>
            {ALL_BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                Recipient {bg} (Compatible Donors Only)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Donors List */}
      {loading ? (
        <Loader text="Searching regional donor registry..." />
      ) : error ? (
        <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-600 text-sm flex items-center justify-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-2xl bg-white shadow-sm border border-slate-200">
          <p className="text-black text-sm">No donors found matching the specified filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonors.map((donor) => (
            <Card key={donor._id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-extrabold text-sm">
                      {donor.bloodGroup}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-black leading-tight">
                        {donor.user?.name || 'Registered Donor'}
                      </h3>
                      <span className="text-xs text-black">
                        Age {donor.age || 'N/A'} • {donor.gender || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Badge status={donor.isAvailable ? 'completed' : 'cancelled'} text={donor.isAvailable ? 'AVAILABLE' : 'OFFLINE'} />
                </div>

                <div className="space-y-2 text-xs text-black mt-4 border-t border-slate-200/80 pt-3">
                  <div className="flex items-center text-black">
                    <MapPin className="w-4 h-4 mr-2 text-rose-400 shrink-0" />
                    <span>{donor.address || 'Delhi NCR Region'}</span>
                  </div>
                  <div className="flex items-center text-black">
                    <Calendar className="w-4 h-4 mr-2 text-sky-400 shrink-0" />
                    <span>
                      Last Donation:{' '}
                      {donor.lastDonationDate
                        ? new Date(donor.lastDonationDate).toLocaleDateString()
                        : 'No prior recorded donation'}
                    </span>
                  </div>
                  {donor.contactNumber && (
                    <div className="flex items-center text-black">
                      <Phone className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
                      <span>{donor.contactNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-black">Total Pledges: {donor.totalDonations || 0}</span>
                <span className="text-emerald-400 font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified Donor
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FindDonors;
