import React, { useState, useEffect } from 'react';
import { donorApi } from '../../api/donorApi';
import { hospitalApi } from '../../api/hospitalApi';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import DonorCard from '../../components/cards/DonorCard';
import PageTransition from '../../components/common/PageTransition';
import SlidingTabs from '../../components/common/SlidingTabs';
import Skeleton from '../../components/common/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/common/StaggerList';
import { Search, MapPin, Phone, Building2, User, Sparkles } from 'lucide-react';

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
        const [donorsRes, hospRes] = await Promise.all([
          donorApi.searchDonors({
            bloodGroup: bloodGroup === 'ALL' ? undefined : bloodGroup,
            availableOnly: true,
          }),
          hospitalApi.getVerifiedHospitals(),
        ]);

        if (donorsRes.data?.success) {
          setDonors(donorsRes.data.data || []);
        }
        if (hospRes.data?.success) {
          setHospitals(hospRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch search data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bloodGroup]);

  const filteredDonors = donors.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (d.user?.name || '').toLowerCase().includes(q) ||
      (d.address || '').toLowerCase().includes(q);
    const matchesBlood = bloodGroup === 'ALL' || d.bloodGroup === bloodGroup;
    return matchesSearch && matchesBlood;
  });

  const filteredHospitals = hospitals.filter((h) => {
    if (h.isVerified === false) return false;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (h.name || '').toLowerCase().includes(q) ||
      (h.address || '').toLowerCase().includes(q);

    const matchesBlood =
      bloodGroup === 'ALL' ||
      (Array.isArray(h.inventory) &&
        h.inventory.some((inv) => inv.bloodGroup === bloodGroup && inv.units > 0));

    return matchesSearch && matchesBlood;
  });

  const tabOptions = [
    { id: 'donors', label: 'Standby Donors', icon: User, count: filteredDonors.length },
    { id: 'hospitals', label: 'Hospitals & Blood Banks', icon: Building2, count: filteredHospitals.length },
  ];

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="section-label mx-auto">
          <Search className="w-3.5 h-3.5 text-brand-500" />
          <span>Verified Regional Directory</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight font-heading">
          Find Donors &amp; Hospitals
        </h1>
        <p className="text-xs sm:text-sm text-secondary">
          Live standby volunteer donors and certified medical facility inventory levels ready for emergency dispatch.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-5 sm:p-6 space-y-4 border border-glass shadow-card">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Animated Sliding Tabs */}
          <SlidingTabs
            tabs={tabOptions}
            activeTab={tab}
            onChange={setTab}
            className="w-full md:w-auto"
          />

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 pointer-events-none text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tab === 'donors' ? 'Search donor name or city...' : 'Search hospital or address...'}
              className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-2.5 text-primary"
            />
          </div>
        </div>

        {/* Blood Group Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-4 border-t border-theme">
          <span className="text-[10px] font-extrabold uppercase tracking-wider shrink-0 mr-1 text-muted">
            Blood Group:
          </span>
          {BLOOD_GROUPS.map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => setBloodGroup(bg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all border cursor-pointer ${
                bloodGroup === bg
                  ? 'bg-brand-500 text-white border-brand-500 shadow-glow-brand'
                  : 'bg-surface/60 text-secondary border-theme hover:bg-surface'
              }`}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : tab === 'donors' ? (
        filteredDonors.length === 0 ? (
          <EmptyState
            icon={User}
            title="No Standby Donors Found"
            description="No active donors match your filter criteria. Try selecting another blood group or clearing your search."
          />
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonors.map((item) => (
              <StaggerItem key={item._id}>
                <DonorCard donor={item} searchedBloodGroup={bloodGroup} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )
      ) : filteredHospitals.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Verified Hospitals Found"
          description="No registered medical centers match your search criteria."
        />
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHospitals.map((hosp) => (
            <StaggerItem key={hosp._id}>
              <div className="glass-card glass-card-hover flex flex-col justify-between h-full rounded-2xl overflow-hidden border border-glass transition-all duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 pb-4 sm:pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-sky-500/15 text-sky-400 border border-sky-500/25">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-extrabold text-primary font-heading truncate">
                          {hosp.name}
                        </h3>
                        <span className="text-xs text-muted block truncate">
                          {hosp.licenseNumber
                            ? `License: ${hosp.licenseNumber}`
                            : hosp.isVerified
                            ? 'Verified Emergency Center'
                            : 'Medical Facility'}
                        </span>
                      </div>
                    </div>
                    <Badge
                      status={hosp.isVerified ? 'verified' : 'pending'}
                      text={hosp.isVerified ? 'VERIFIED' : 'PENDING'}
                    />
                  </div>
                </div>

                <div className="w-full border-t border-theme" />

                {/* Details */}
                <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-2.5 text-xs text-secondary">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 shrink-0 text-brand-400" />
                    <span className="truncate">{hosp.address || 'Medical Facility Address'}</span>
                  </div>
                  {hosp.phone && (
                    <div className="flex items-center gap-2.5 font-bold text-teal-400">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{hosp.phone}</span>
                    </div>
                  )}

                  {/* Inventory stock pills */}
                  {hosp.inventory?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-2 text-muted">
                        Live Reserve Stock:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {hosp.inventory.map((inv) => (
                          <span
                            key={inv.bloodGroup}
                            className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-surface border border-theme text-secondary"
                          >
                            {inv.bloodGroup}:{' '}
                            <span className="text-brand-400 font-black">{inv.units}</span>u
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Footer */}
                {hosp.phone && (
                  <>
                    <div className="w-full border-t border-theme" />
                    <div className="p-5 sm:p-6 pt-4 sm:pt-5">
                      <a
                        href={`tel:${hosp.phone}`}
                        className="btn-secondary w-full py-2.5 text-xs rounded-xl justify-center font-bold flex items-center gap-2"
                      >
                        <Phone className="w-3.5 h-3.5 text-brand-400" />
                        <span>Call Facility Desk</span>
                      </a>
                    </div>
                  </>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PageTransition>
  );
};

export default FindDonors;
