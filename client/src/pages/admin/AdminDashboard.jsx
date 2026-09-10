import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import BloodGroupBarChart from '../../components/charts/BloodGroupBarChart';
import TrendLineChart from '../../components/charts/TrendLineChart';
import StatusPie from '../../components/charts/StatusPie';
import { ShieldCheck, Users, Activity, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsApi.getSummary();
        if (res.data && res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <Loader text="Compiling network analytics & telemetry..." />;

  const { summary, bloodGroupDistribution, urgencyDistribution, monthlyTrends } = data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-950/60 via-[#151c2e] to-[#151c2e] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Superadmin Intelligence Command</span>
          </div>
          <h1 className="text-3xl font-black text-white">System Analytics & Executive Overview</h1>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-xl glass-panel text-black hover:text-rose-500 border border-slate-200 text-xs font-bold transition-all flex items-center space-x-1"
          >
            <Users className="w-4 h-4 mr-1 text-sky-400" />
            <span>User Management</span>
          </Link>
          <Link
            to="/admin/ai-insights"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-1"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            <span>AI Insights Panel</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hover={false} className="bg-lightbg/60">
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Registered Donors</span>
          <span className="text-3xl font-black text-white block mt-1">{summary?.totalDonors || 0}</span>
          <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
            {summary?.availableDonors || 0} Active Standby
          </span>
        </Card>

        <Card hover={false} className="bg-lightbg/60">
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Emergency Requests</span>
          <span className="text-3xl font-black text-rose-500 block mt-1">{summary?.totalRequests || 0}</span>
          <span className="text-[11px] text-amber-400 font-semibold block mt-1">
            {summary?.openRequests || 0} Active Broadcasts
          </span>
        </Card>

        <Card hover={false} className="bg-lightbg/60">
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Fulfillment Rate</span>
          <span className="text-3xl font-black text-emerald-400 block mt-1">{summary?.fulfillmentRate || 0}%</span>
          <span className="text-[11px] text-black block mt-1">Target &gt; 80%</span>
        </Card>

        <Card hover={false} className="bg-lightbg/60">
          <span className="text-xs font-semibold text-black uppercase tracking-wider block">Completed Donations</span>
          <span className="text-3xl font-black text-sky-400 block mt-1">{summary?.totalDonations || 0}</span>
          <span className="text-[11px] text-black block mt-1">Verified In-Hospital</span>
        </Card>
      </div>

      {/* Recharts Analytics Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Donor Pool vs Demand by Blood Group" icon={Activity} hover={false}>
          <BloodGroupBarChart data={bloodGroupDistribution} />
        </Card>

        <Card title="Monthly Donation & Request Trends" icon={TrendingUp} hover={false}>
          <TrendLineChart data={monthlyTrends} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Emergency Request Urgency Distribution" icon={Heart} hover={false} className="lg:col-span-1">
          <StatusPie data={urgencyDistribution} />
        </Card>

        {/* Live System Activity Feed */}
        <Card title="AI Intelligence Summary" icon={Sparkles} hover={false} className="lg:col-span-2">
          <p className="text-black text-sm leading-relaxed mb-4">
            LifeLink's dedicated AI Service continuously analyzes regional demand spikes, rare blood group shortages, and fulfillment rates to generate actionable recommendations for network administrators.
          </p>
          <Link
            to="/admin/ai-insights"
            className="inline-flex items-center text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Open Full AI Insights Panel
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
