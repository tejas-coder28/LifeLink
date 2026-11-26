import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { donorApi } from '../../api/donorApi';
import { hospitalApi } from '../../api/hospitalApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { Users, Building2, ShieldCheck, Phone, MapPin, Check, X, Ban, Eye } from 'lucide-react';

const UserManagement = () => {
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTabParam = searchParams.get('subTab');
  const [subTab, setSubTab] = useState(subTabParam === 'hospitals' ? 'hospitals' : 'donors');

  useEffect(() => {
    if (subTabParam === 'hospitals' || subTabParam === 'donors') {
      setSubTab(subTabParam);
    }
  }, [subTabParam]);

  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const statusParam = searchParams.get('status');
  const displayedDonors = statusParam === 'active'
    ? donors.filter((d) => d.isAvailable === true)
    : donors;

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, hospital: null, loading: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [donorsRes, hospRes] = await Promise.all([
          donorApi.getAllDonors(),
          hospitalApi.getAllHospitals(),
        ]);

        if (donorsRes.data && donorsRes.data.success) {
          setDonors(donorsRes.data.data);
        }
        if (hospRes.data && hospRes.data.success) {
          setHospitals(hospRes.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [actionLoadingId, setActionLoadingId] = useState(null); // tracks which hospital is being acted on

  // Admin: approve or revoke hospital verification — hits PATCH /api/hospitals/:id/verify
  const handleToggleVerification = async (hospId, currentStatus) => {
    setActionLoadingId(hospId);
    try {
      const newStatus = !currentStatus;
      const res = await hospitalApi.verifyHospital(hospId, newStatus);
      if (res.data && res.data.success) {
        // Update the local list with the server-returned hospital object
        setHospitals(prev => prev.map(h => h._id === hospId ? res.data.data : h));
        showSuccess(`Hospital ${newStatus ? 'approved and verified ✅' : 'verification revoked'}`);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update hospital status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin: open delete confirmation dialog
  const handleRequestDelete = (hospital) => {
    setDeleteConfirm({ isOpen: true, hospital, loading: false });
  };

  // Admin: confirm delete hospital record — hits DELETE /api/hospitals/:id
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.hospital) return;
    const hospId = deleteConfirm.hospital._id;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    setActionLoadingId(hospId);
    try {
      await hospitalApi.deleteHospital(hospId);
      setHospitals((prev) => prev.filter((h) => h._id !== hospId));
      showSuccess('Hospital record deleted.');
      setDeleteConfirm({ isOpen: false, hospital: null, loading: false });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete hospital');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Toggle */}
      <div className="flex items-center space-x-2 border-b border-hairline pb-3">
        <button
          onClick={() => {
            setSubTab('donors');
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('subTab');
            setSearchParams(newParams);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            subTab === 'donors'
              ? 'filter-pill-active shadow-sm'
              : 'filter-pill-inactive'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Donors ({donors.length})</span>
        </button>

        <button
          onClick={() => {
            setSubTab('hospitals');
            const newParams = new URLSearchParams(searchParams);
            newParams.set('subTab', 'hospitals');
            setSearchParams(newParams);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            subTab === 'hospitals'
              ? 'filter-pill-active shadow-sm'
              : 'filter-pill-inactive'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Medical Facilities ({hospitals.length})</span>
        </button>
      </div>

      {subTab === 'donors' && statusParam === 'active' && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-info/10 border border-info/30 text-xs text-primary animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-info" />
            <span>Showing only <strong>Active Standby Donors ({displayedDonors.length})</strong></span>
          </div>
          <button
            type="button"
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('status');
              setSearchParams(newParams);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:text-primary cursor-pointer px-2 py-1 rounded-md hover:bg-surface"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear filter</span>
          </button>
        </div>
      )}

      {loading ? (
        <Loader text="Loading directory..." />
      ) : subTab === 'donors' ? (
        /* DONORS DIRECTORY TABLE */
        <Card hover={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="glass-table text-left text-xs">
              <thead>
                <tr>
                  <th className="px-5 py-3.5">Donor Name</th>
                  <th className="px-5 py-3.5">Blood Group</th>
                  <th className="px-5 py-3.5">Contact Phone</th>
                  <th className="px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5">Standby Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme font-medium">
                {displayedDonors.map((item) => (
                  <tr key={item._id} className="hover:bg-surface transition-colors">
                    <td className="px-5 py-3.5 font-bold text-primary">
                      {item.user?.name || 'Registered Donor'}
                      <span className="block text-[10px] font-normal text-muted">
                        {item.user?.email}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge bloodGroup={item.bloodGroup} />
                    </td>
                    <td className="px-5 py-3.5 text-secondary font-mono text-[11px]">{item.contactNumber || item.user?.phone || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-secondary">{item.address || 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        status={item.isAvailable ? 'verified' : 'cancelled'}
                        text={item.isAvailable ? 'ACTIVE STANDBY' : 'OFFLINE'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* HOSPITALS DIRECTORY TABLE */
        <Card hover={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="glass-table text-left text-xs">
              <thead>
                <tr>
                  <th className="px-5 py-3.5">Hospital Name</th>
                  <th className="px-5 py-3.5">License Number</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Verification Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme font-medium">
                {hospitals.map((hosp) => (
                  <tr key={hosp._id} className="hover:bg-surface transition-colors">
                    <td className="px-5 py-3.5 font-bold text-primary">
                      {hosp.name}
                      <span className="block text-[10px] font-normal text-muted">
                        {hosp.address}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-secondary text-[11px]">{hosp.licenseNumber || 'HOSP-2026-REG'}</td>
                    <td className="px-5 py-3.5 text-secondary font-mono text-[11px]">{hosp.phone || 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        status={hosp.suspended ? 'cancelled' : hosp.isVerified ? 'verified' : 'pending'}
                        text={hosp.suspended ? 'SUSPENDED' : hosp.isVerified ? 'VERIFIED' : 'PENDING'}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedHospital(hosp)}
                        title="View Details"
                        aria-label={`View details for ${hosp.name}`}
                        className="btn-secondary p-2 rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleVerification(hosp._id, hosp.isVerified)}
                        disabled={actionLoadingId === hosp._id}
                        title={hosp.isVerified ? 'Revoke Verification' : 'Approve Hospital'}
                        aria-label={hosp.isVerified ? `Revoke verification for ${hosp.name}` : `Approve ${hosp.name}`}
                        className={`p-2 rounded-xl transition-colors disabled:opacity-40 cursor-pointer ${
                          hosp.isVerified
                            ? 'btn-secondary'
                            : 'btn-success'
                        }`}
                      >
                        {hosp.isVerified ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleRequestDelete(hosp)}
                        disabled={actionLoadingId === hosp._id}
                        title="Delete Hospital Record"
                        aria-label={`Delete ${hosp.name}`}
                        className="btn-danger p-2 rounded-xl"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Hospital View Modal */}
      <Modal
        isOpen={Boolean(selectedHospital)}
        onClose={() => setSelectedHospital(null)}
        title="Medical Facility Profile Details"
      >
        {selectedHospital && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 border-b border-hairline pb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 bg-info/10 border border-info/20 text-info"
              >
                <Building2 className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{selectedHospital.name}</h3>
                <span className="text-xs text-muted">License: {selectedHospital.licenseNumber}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block font-semibold text-muted">Contact Phone</span>
                <span className="font-bold text-primary font-mono mt-0.5 block">{selectedHospital.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="block font-semibold mb-1 text-muted">Verification Status</span>
                <Badge status={selectedHospital.isVerified ? 'verified' : 'pending'} text={selectedHospital.isVerified ? 'VERIFIED' : 'PENDING'} />
              </div>
              <div className="col-span-2">
                <span className="block font-semibold text-muted">Address</span>
                <span className="font-bold text-primary mt-0.5 block">{selectedHospital.address}</span>
              </div>
            </div>

            {selectedHospital.inventory && (
              <div className="pt-2 border-t border-hairline">
                <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-2 text-muted">
                  Inventory Reserve Breakdown:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {selectedHospital.inventory.map((inv) => {
                    const isCrit = inv.units === 0;
                    const isWarn = inv.units >= 1 && inv.units <= 3;
                    const label = isCrit ? '0 units Critical' : isWarn ? `${inv.units} units Low` : `${inv.units} units Adequate`;
                    const colorClass = isCrit ? 'text-urgency-critical' : isWarn ? 'text-urgency-medium' : 'text-success';
                    return (
                      <div
                        key={inv.bloodGroup}
                        className="p-2.5 rounded-xl text-center bg-surface border border-hairline"
                      >
                        <span className="text-[10px] font-extrabold block text-muted">{inv.bloodGroup}</span>
                        <span className={`text-xs font-black block ${colorClass}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, hospital: null, loading: false })}
        title="Delete Medical Facility Record"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-secondary leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-primary">{deleteConfirm.hospital?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirm({ isOpen: false, hospital: null, loading: false })}
              className="btn-secondary text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteConfirm.loading}
              className="btn-primary text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              {deleteConfirm.loading ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
