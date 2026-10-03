import React, { useState, useEffect } from 'react';
import { requestApi } from '../../api/requestApi';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';

import {
  FileText,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Droplet
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['All', 'critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS = ['All', 'open', 'in-progress', 'fulfilled', 'cancelled'];

const RequestManagement = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [selectedUrgency, setSelectedUrgency] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedBloodGroup !== 'All') params.bloodGroup = selectedBloodGroup;
      if (selectedUrgency !== 'All') params.urgency = selectedUrgency;
      if (selectedStatus !== 'All') params.status = selectedStatus;

      const res = await requestApi.getRequests(params);
      if (res.data && res.data.success) {
        setRequests(res.data.data || []);
      } else {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError('Could not load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedBloodGroup, selectedUrgency, selectedStatus]);

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const res = await requestApi.updateStatus(requestId, newStatus);
      if (res.data?.success || res.status === 200) {
        showToast(`Request status updated to ${newStatus}`, 'success');
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to update request status:', err);
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Filter client side search (patient name, hospital, city)
  const filteredRequests = requests.filter((req) => {
    const hospitalName = req.hospitalName || (req.hospital && typeof req.hospital === 'object' ? req.hospital.name : req.hospital) || '';
    const text = `${req.patientName || ''} ${hospitalName} ${req.city || ''} ${req.location || ''} ${req.address || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header & Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-6">
        <div>
          <h2 className="text-xl font-black text-primary flex items-center gap-2 font-heading">
            <FileText className="w-5 h-5 text-rose-500" />
            Master Blood Requests Directory
          </h2>
          <p className="text-xs mt-1 text-secondary">
            Monitor, inspect, and update emergency blood requests across all facilities.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="btn-secondary text-xs px-4 py-2 rounded-xl flex items-center space-x-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search patient, hospital, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full pl-9 pr-4 py-2.5 text-xs text-primary"
          />
        </div>

        {/* Blood Group Filter */}
        <div>
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            className="glass-input w-full py-2.5 px-3 text-xs font-semibold text-primary"
          >
            <option value="All">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg} className="bg-surface text-primary">{bg}</option>
            ))}
          </select>
        </div>

        {/* Urgency Filter */}
        <div>
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="glass-input w-full py-2.5 px-3 text-xs font-semibold capitalize text-primary"
          >
            {URGENCY_LEVELS.map((urg) => (
              <option key={urg} value={urg} className="bg-surface text-primary">{urg === 'All' ? 'All Urgency Levels' : `${urg.toUpperCase()} Urgency`}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="glass-input w-full py-2.5 px-3 text-xs font-semibold capitalize text-primary"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st} className="bg-surface text-primary">{st === 'All' ? 'All Statuses' : st.replace('-', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <Loader text="Loading blood requests..." />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Blood Requests Found"
          description="Try clearing filters or search queries to view existing request records."
        />
      ) : (
        <Card hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-theme font-bold text-muted uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Patient / Facility</th>
                  <th className="px-5 py-3.5">Blood Group</th>
                  <th className="px-5 py-3.5">Units</th>
                  <th className="px-5 py-3.5">Urgency</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme font-medium">
                {filteredRequests.map((req) => (
                  <tr key={req._id || req.id} className="hover:bg-surface transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-primary">{req.patientName || req.recipientName || 'Emergency Patient'}</div>
                      <div className="text-[11px] text-muted">
                        {req.hospitalName || (req.hospital && typeof req.hospital === 'object' ? req.hospital.name : req.hospital) || 'Regional Hospital'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge bloodGroup={req.bloodGroup} />
                    </td>
                    <td className="px-5 py-4 font-bold text-primary">
                      {req.unitsNeeded || req.unitsRequired || req.units || 1} Unit(s)
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={req.urgencyLevel || req.urgency || 'medium'} />
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={req.status || 'open'} />
                    </td>
                    <td className="px-5 py-4 text-secondary">
                      {req.address || req.city || (typeof req.location === 'string' ? req.location : '') || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-muted font-mono text-[11px]">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <select
                        value={req.status || 'open'}
                        onChange={(e) => handleStatusChange(req._id || req.id, e.target.value)}
                        className="glass-input py-1.5 px-2.5 text-[11px] font-bold text-primary cursor-pointer"
                      >
                        <option value="open" className="bg-surface text-primary">Open</option>
                        <option value="in-progress" className="bg-surface text-primary">In-Progress</option>
                        <option value="fulfilled" className="bg-surface text-primary">Fulfilled</option>
                        <option value="cancelled" className="bg-surface text-primary">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RequestManagement;
