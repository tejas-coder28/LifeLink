import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { analyticsApi } from '../../api/analyticsApi';
import { donorApi } from '../../api/donorApi';
import { hospitalApi } from '../../api/hospitalApi';
import { requestApi } from '../../api/requestApi';
import { aiApi } from '../../api/aiApi';

import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import PageTransition from '../../components/common/PageTransition';
import SlidingTabs from '../../components/common/SlidingTabs';
import StatCard from '../../components/cards/StatCard';
import UserManagement from './UserManagement';
import RequestManagement from './RequestManagement';
import AnalyticsPanel from './AnalyticsPanel';
import AIInsightsPanel from './AIInsightsPanel';

import {
  ShieldCheck,
  Users,
  Building2,
  Activity,
  CheckCircle2,
  Cpu,
  BarChart3,
  FileText,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [summary, setSummary] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, aiRes] = await Promise.all([
          analyticsApi.getSummary(),
          aiApi.getInsights(),
        ]);

        if (analyticsRes.data && analyticsRes.data.success) {
          setSummary(analyticsRes.data.data.summary);
          setAnalyticsData(analyticsRes.data.data);
        }
        if (aiRes.data && aiRes.data.success) {
          setAiInsights(aiRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Donors & Hospitals', icon: Users },
    { id: 'requests', label: 'Blood Request Master', icon: FileText },
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, count: aiInsights.length },
  ];

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="hero-glass-card relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight">
              Admin <span className="gradient-text-brand">Command Center</span>
            </h1>
            <Badge accountType="admin" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-secondary">
            Platform governance, hospital verification, emergency blood request oversight, and AI-powered analytics.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <SlidingTabs
        tabs={adminTabs}
        activeTab={activeTab}
        onChange={(id) => setTab(id)}
        layoutId="admin-dashboard-tabs"
      />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Donors"
              value={summary?.totalDonors || 0}
              icon={Users}
              description={`${summary?.availableDonors || 0} active on standby`}
              color="rose"
            />
            <StatCard
              title="Total Requests"
              value={summary?.totalRequests || 0}
              icon={Activity}
              description={`${summary?.openRequests || 0} open demands`}
              color="sky"
            />
            <StatCard
              title="Fulfillment Rate"
              value={`${summary?.fulfillmentRate || 0}%`}
              icon={CheckCircle2}
              description={`${summary?.fulfilledRequests || 0} fulfilled requests`}
              color="emerald"
            />
            <StatCard
              title="Completed Donations"
              value={summary?.totalDonations || 0}
              icon={ShieldCheck}
              description="Verified hospital records"
              color="amber"
            />
          </div>

          {/* AI Insights Preview Widget */}
          {aiInsights.length > 0 && (
            <Card title="Latest Regional AI Insight" icon={Sparkles} hover={false}>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">{aiInsights[0].title}</h3>
                <p className="text-xs leading-relaxed text-secondary">
                  {aiInsights[0].summary}
                </p>
                {aiInsights[0].recommendations && (
                  <div className="pt-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1 text-muted">
                      System Recommendations:
                    </span>
                    <ul className="space-y-1 text-xs font-medium text-secondary">
                      {aiInsights[0].recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-rose-500 mr-2">•</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* User & Request Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="User & Hospital Operations" icon={Users} hover={false}>
              <p className="text-xs mb-4 text-secondary">
                Verify medical facility credentials, suspend accounts, or manage standby donor profiles.
              </p>
              <button
                onClick={() => setTab('users')}
                className="btn-secondary text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Open User Management →
              </button>
            </Card>

            <Card title="Blood Request Oversight" icon={FileText} hover={false}>
              <p className="text-xs mb-4 text-secondary">
                Inspect active, matching, and fulfilled blood requests across all regional medical centers.
              </p>
              <button
                onClick={() => setTab('requests')}
                className="btn-primary text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Open Request Master →
              </button>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: DONORS & HOSPITALS */}
      {activeTab === 'users' && <UserManagement />}

      {/* TAB 3: BLOOD REQUEST MASTER */}
      {activeTab === 'requests' && <RequestManagement />}

      {/* TAB 4: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && <AnalyticsPanel data={analyticsData} />}

      {/* TAB 5: AI INSIGHTS */}
      {activeTab === 'ai-insights' && <AIInsightsPanel insights={aiInsights} setInsights={setAiInsights} />}
    </PageTransition>
  );
};

export default AdminDashboard;
