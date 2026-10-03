import React, { useState, useEffect } from 'react';
import { donorApi } from '../../api/donorApi';
import { hospitalApi } from '../../api/hospitalApi';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import DonorCard from '../../components/cards/DonorCard';
import { Search, MapPin, Phone, Building2, User, ShieldCheck } from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const FindDonors = () => {
  const [tab, setTab]               = useState('donors');
  const [bloodGroup, setBloodGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [donors, setDonors]         = useState([]);
  const [hospitals, setHospitals]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (tab === 'donors') {
          const res = await donorApi.searchDonors({ bloodGroup: bloodGroup === 'ALL' ? undefined : bloodGroup, availableOnly: true });
          if (res.data?.success) setDonors(res.data.data);
        } else {
          const res = await hospitalApi.getAllHospitals();
          if (res.data?.success) setHospitals(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch search data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab, bloodGroup]);

  const filteredDonors = donors.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (d.user?.name || '').toLowerCase().includes(q) || (d.address || '').toLowerCase().includes(q);
  });

  const filteredHospitals = hospitals.filter((h) => {
    const q = searchQuery.toLowerCase();
    return (h.name || '').toLowerCase().includes(q) || (h.address || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 page-enter">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="section-label mx-auto w-fit">
          <Search className="w-3.5 h-3.5" />
          <span>Verified Regional Directory</span>
        </div>
        <h1 className="text-3xl font-black text-primary tracking-tight font-heading">
          Find Donors &amp; Hospitals
        </h1>
        <p className="text-sm text-secondary">
          Search standby registered blood donors, blood bank inventory levels, and verified medical facilities.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tab Switch */}
          <div className="tab-list w-full md:w-auto">
            <button
              onClick={() => setTab('donors')}
              className={`tab-item flex-1 md:flex-initial ${tab === 'donors' ? 'active' : ''}`}
            >
              <User className="w-3.5 h-3.5" />
              Standby Donors ({donors.length})
            </button>
            <button
              onClick={() => setTab('hospitals')}
              className={`tab-item flex-1 md:flex-initial ${tab === 'hospitals' ? 'active' : ''}`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Hospitals &amp; Camps ({hospitals.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 pointer-events-none text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tab === 'donors' ? 'Search donor name or city...' : 'Search hospital name or address...'}
              className="glass-input w-full pl-10 text-xs px-3.5 py-2.5 text-primary"
            />
          </div>
        </div>

        {/* Blood Group Filter */}
        {tab === 'donors' && (
          <div className="flex items-center space-x-2 overflow-x-auto pt-3 border-t border-theme">
            <span className="text-[10px] font-extrabold uppercase tracking-wider shrink-0 mr-1 text-muted">
              Blood Group:
            </span>
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setBloodGroup(bg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all border cursor-pointer ${
                  bloodGroup === bg
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'glass-card text-secondary border-theme hover:border-slate-400'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <Loader text={`Loading ${tab === 'donors' ? 'standby donors' : 'medical facilities'}...`} />
      ) : tab === 'donors' ? (
        filteredDonors.length === 0 ? (
          <EmptyState icon={User} title="No Standby Donors Found"
            description="No active donors match your filter criteria. Try selecting another blood group or clearing your search." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonors.map((item) => (
              <DonorCard key={item._id} donor={item} searchedBloodGroup={bloodGroup} />
            ))}
          </div>
        )
      ) : filteredHospitals.length === 0 ? (
        <EmptyState icon={Building2} title="No Hospitals Found"
          description="No registered medical centers match your search criteria." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHospitals.map((hosp) => (
            <div
              key={hosp._id}
              className="glass-card glass-card-hover flex flex-col justify-between h-full rounded-2xl overflow-hidden border border-theme transition-all duration-200"
            >
              {/* Header with p-5 sm:p-6 */}
              <div className="p-5 sm:p-6 pb-4 sm:pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25"
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-primary font-heading truncate">
                        {hosp.name}
                      </h3>
                      <span className="text-xs text-muted block truncate">
                        {hosp.licenseNumber || 'Verified Medical Facility'}
                      </span>
                    </div>
                  </div>
                  <Badge status={hosp.isVerified ? 'verified' : 'pending'} text={hosp.isVerified ? 'VERIFIED' : 'PENDING'} />
                </div>
              </div>

              {/* Full Width Divider */}
              <div className="w-full border-t border-theme" />

              {/* Details with p-5 sm:p-6 */}
              <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-2.5 text-xs text-secondary">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="truncate">{hosp.address || 'Medical Facility Address'}</span>
                </div>
                {hosp.phone && (
                  <div className="flex items-center gap-2.5 font-bold text-teal-600 dark:text-teal-400">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{hosp.phone}</span>
                  </div>
                )}

                {/* Inventory pills */}
                {hosp.inventory?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-2 text-muted">
                      Reserve Inventory Stock:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hosp.inventory.map((inv) => (
                        <span
                          key={inv.bloodGroup}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-surface border border-theme text-secondary"
                        >
                          {inv.bloodGroup}: <span className="text-rose-600 dark:text-rose-400 font-black">{inv.units}</span>u
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Full Width Divider and Footer */}
              {hosp.phone && (
                <>
                  <div className="w-full border-t border-theme" />
                  <div className="p-5 sm:p-6 pt-4 sm:pt-5">
                    <a
                      href={`tel:${hosp.phone}`}
                      className="btn-secondary w-full py-2 text-xs rounded-xl justify-center font-bold flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Contact Facility Desk</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FindDonors;
