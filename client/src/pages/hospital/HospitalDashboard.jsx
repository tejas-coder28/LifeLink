import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import { requestApi } from '../../api/requestApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Building2, Package, CheckCircle2, Activity, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const HospitalDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHospitalData = async () => {
    setLoading(true);
    try {
      const [hospRes, reqRes, donRes] = await Promise.all([
        analyticsApi.getHospitals(),
        requestApi.getRequests(),
        requestApi.getDonationHistory(),
      ]);

      if (hospRes.data && hospRes.data.success && hospRes.data.data.length > 0) {
        setProfile(hospRes.data.data[0]);
      }
      if (reqRes.data && reqRes.data.success) {
        setRequests(reqRes.data.data);
      }
      if (donRes.data && donRes.data.success) {
        setDonations(donRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load hospital data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalData();
  }, []);

  const handleCompleteDonation = async (donationId) => {
    try {
      const res = await requestApi.completeDonation(donationId);
      if (res.data && res.data.success) {
        alert('Donation verified and completed! Inventory updated.');
        fetchHospitalData();
      }
    } catch (err) {
      alert('Failed to complete donation');
    }
  };

  if (loading) return <Loader text="Loading hospital management console..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-sky-950/60 via-[#151c2e] to-[#151c2e] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 mb-1">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Hospital & Blood Bank Management</span>
          </div>
          <h1 className="text-3xl font-black text-white">{profile?.name || 'City General Medical Center'}</h1>
          <p className="text-black text-xs mt-1">License: {profile?.licenseNumber || 'HOSP-VERIFIED-2026'}</p>
        </div>

        <Link
          to="/hospital/inventory"
          className="px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-xl shadow-sky-600/30 transition-all flex items-center space-x-2"
        >
          <Package className="w-5 h-5" />
          <span>Manage Inventory</span>
        </Link>
      </div>

      {/* Inventory Quick Overview Grid */}
      {profile?.inventory && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-sky-400" />
            Current On-Hand Blood Inventory
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {profile.inventory.map((item, i) => (
              <div key={i} className="glass-panel p-4 rounded-2xl border border-slate-200 bg-[#151c2e] text-center">
                <span className="text-xs font-bold text-black block mb-1">{item.bloodGroup}</span>
                <span className="text-2xl font-black text-sky-400 block">{item.units}</span>
                <span className="text-[10px] text-black block mt-1">Units</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Requests List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-rose-500" />
          System Emergency Requests Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.slice(0, 4).map((req) => (
            <Card key={req._id} hover={false} className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Badge bloodGroup={req.bloodGroup} />
                  <span className="font-bold text-white text-sm">{req.patientName}</span>
                </div>
                <div className="text-xs text-black flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-rose-400" />
                  <span>{req.address}</span>
                </div>
              </div>
              <Badge status={req.status} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
