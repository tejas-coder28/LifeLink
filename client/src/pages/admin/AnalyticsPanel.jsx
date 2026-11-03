import React from 'react';
import Card from '../../components/common/Card';
import StatCard from '../../components/cards/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { useTheme } from '../../context/ThemeContext';
import useChartTheme from '../../hooks/useChartTheme';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';

import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  CheckCircle2,
  Clock,
  Droplet,
  Users
} from 'lucide-react';

const AnalyticsPanel = ({ data }) => {
  const { gridStroke, axisStroke, tooltipStyle, colors } = useChartTheme();

  const urgencyColors = {
    CRITICAL: colors.crimson,
    HIGH: colors.warning,
    MEDIUM: colors.info,
    LOW: colors.teal || colors.success,
    STANDARD: colors.silver,
  };
  const summary = data?.summary || {
    totalDonors: 0,
    availableDonors: 0,
    totalRequests: 0,
    openRequests: 0,
    fulfilledRequests: 0,
    fulfillmentRate: 0,
    totalDonations: 0
  };

  const bloodGroupData = (data?.bloodGroupDistribution || data?.byBloodGroup || []).map(item => ({
    group: item.bloodGroup || item.group,
    donors: item.donors || 0,
    requests: item.requests || 0,
  }));

  const monthlyTrends = data?.monthlyTrends || [];

  const urgencyBreakdown = (data?.urgencyDistribution || data?.byUrgency || []).map((item) => {
    const name = (item.urgency || item.name || 'Standard').toUpperCase();
    return {
      name,
      value: item.count || item.value || 0,
      color: urgencyColors[name] || colors.info,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary flex items-center gap-2 font-heading">
            <BarChart3 className="w-5 h-5 text-info" />
            Regional Blood Analytics & Supply Insights
          </h2>
          <p className="text-xs mt-1 text-secondary">
            Real-time visual breakdown of blood demand, donor availability, and emergency response performance.
          </p>
        </div>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Fulfillment Rate"
          value={`${summary.fulfillmentRate || 0}%`}
          icon={CheckCircle2}
          description={`${summary.fulfilledRequests || 0} of ${summary.totalRequests || 0} requests`}
          color="emerald"
        />
        <StatCard
          title="Active Demands"
          value={summary.openRequests || 0}
          icon={Activity}
          description="Open emergency requests"
          color="rose"
        />
        <StatCard
          title="Donor Readiness"
          value={`${summary.totalDonors > 0 ? Math.round((summary.availableDonors / summary.totalDonors) * 100) : 0}%`}
          icon={Users}
          description={`${summary.availableDonors || 0} donors ready on standby`}
          color="sky"
        />
        <StatCard
          title="Total Blood Units Given"
          value={summary.totalDonations || 0}
          icon={Droplet}
          description="Verified hospital units"
          color="amber"
        />
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Donation & Request Trends Area Chart */}
        <Card
          title="Monthly Requests vs Donations"
          subtitle="Real activity timeline comparison"
          icon={TrendingUp}
          hover={false}
          className="lg:col-span-2"
        >
          {monthlyTrends.length === 0 ? (
            <div className="h-72 flex items-center justify-center">
              <EmptyState title="No Monthly Activity" description="No monthly request activity logged yet." />
            </div>
          ) : (
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.info} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={colors.info} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.silver} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={colors.silver} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="month" stroke={axisStroke} fontSize={11} tickLine={false} />
                  <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    formatter={(value) => <span className="text-primary font-semibold text-xs ml-1">{value}</span>}
                  />
                  <Area type="monotone" dataKey="requests" name="Blood Demands" stroke={colors.silver} fillOpacity={1} fill="url(#colorRequests)" strokeWidth={2} />
                  <Area type="monotone" dataKey="donations" name="Fulfilled Donations" stroke={colors.info} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorDonations)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Urgency Distribution Pie Chart */}
        <Card
          title="Emergency Urgency Split"
          subtitle="Breakdown of emergency request urgency levels"
          icon={PieIcon}
          hover={false}
        >
          {urgencyBreakdown.length === 0 ? (
            <div className="h-72 flex items-center justify-center">
              <EmptyState title="No Urgency Data" description="No active emergency requests." />
            </div>
          ) : (
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {urgencyBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || colors.info} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => <span className="text-primary font-semibold text-xs ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Main Charts Row 2 */}
      <Card
        title="Blood Group Supply vs Demand Distribution"
        subtitle="Comparison of active standby donors vs emergency requests by blood type"
        icon={Droplet}
        hover={false}
      >
        {bloodGroupData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <EmptyState title="No Blood Group Data" description="No registered blood group distribution available." />
          </div>
        ) : (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bloodGroupData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="group" stroke={axisStroke} fontSize={12} fontWeight="bold" tickLine={false} />
                <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-primary font-semibold text-xs ml-1">{value}</span>}
                />
                <Bar dataKey="donors" name="Registered Donors" fill={colors.info} radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="requests" name="Blood Requests" fill={colors.silver} radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AnalyticsPanel;
