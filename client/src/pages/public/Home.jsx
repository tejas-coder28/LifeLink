import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../api/analyticsApi';
import { requestApi } from '../../api/requestApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import RequestCard from '../../components/cards/RequestCard';
import PageTransition from '../../components/common/PageTransition';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import Skeleton from '../../components/common/Skeleton';
import { StaggerContainer, StaggerItem } from '../../components/common/StaggerList';
import Button from '../../components/common/Button';
import { DONATION_COOLDOWN_DAYS } from '../../utils/bloodCompatibility';
import {
  HeartHandshake,
  Activity,
  Heart,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
  Building2,
  Search,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [openRequests, setOpenRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pledgingId, setPledgingId] = useState(null);
  const [pledgeMsg, setPledgeMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, requestsRes] = await Promise.all([
          analyticsApi.getSummary(),
          requestApi.getRequests({ status: 'open' }),
        ]);

        if (analyticsRes.data && analyticsRes.data.success) {
          setStats(analyticsRes.data.data.summary);
        }
        if (requestsRes.data && requestsRes.data.success) {
          setOpenRequests(requestsRes.data.data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load landing page analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePledge = async (requestId) => {
    if (!user) {
      navigate('/login?redirect=/');
      return;
    }

    setPledgingId(requestId);
    setPledgeMsg('');
    try {
      const res = await requestApi.pledgeDonation({ requestId, unitsDonated: 1 });
      if (res.data && res.data.success) {
        setPledgeMsg('Donation pledged! Thank you for stepping up to save a life.');
        const updated = await requestApi.getRequests({ status: 'open' });
        if (updated.data && updated.data.success) {
          setOpenRequests(updated.data.data.slice(0, 4));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pledge donation');
    } finally {
      setPledgingId(null);
    }
  };

  return (
    <PageTransition className="space-y-16 sm:space-y-20 pb-16">
      {/* ── 1. HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-4 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="section-label mx-auto">
              <Activity className="w-3.5 h-3.5 animate-pulse text-brand-500" />
              <span>Smart Emergency Blood Match Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-primary tracking-tight leading-none font-heading">
              Connecting blood donors with <br className="hidden sm:block" />
              <span className="gradient-text-brand">those who need them.</span>
            </h1>

            <p className="text-sm sm:text-lg font-medium max-w-2xl mx-auto leading-relaxed text-secondary">
              LifeLink bridges standby volunteer donors, hospital blood banks, and emergency patients through real-time geospatial matching, compatibility verification, and medical recovery tracking.
            </p>

            {/* Action CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={user ? '/donor/dashboard' : '/register'}
                className="w-full sm:w-auto"
              >
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto shadow-glow-brand"
                  icon={Heart}
                >
                  Donate Blood Now
                </Button>
              </Link>

              <Link
                to="/emergency-request"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                  icon={Activity}
                >
                  Request Emergency Blood
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. GLASS STATS METRIC COUNTERS ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-glass shadow-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-theme">
            <div className="pt-3 sm:pt-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black block font-heading text-brand-500">
                <AnimatedCounter value={stats?.totalDonors || 12} />+
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1.5 block text-muted">
                Registered Donors
              </span>
            </div>

            <div className="pt-3 sm:pt-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black block font-heading text-teal-400">
                <AnimatedCounter value={stats?.availableDonors || 9} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1.5 block text-muted">
                Standby Donors Ready
              </span>
            </div>

            <div className="pt-3 sm:pt-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black block font-heading text-sky-400">
                <AnimatedCounter value={stats?.fulfilledRequests || 3} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1.5 block text-muted">
                Requests Fulfilled
              </span>
            </div>

            <div className="pt-3 sm:pt-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black block font-heading text-amber-400">
                <AnimatedCounter value={stats?.totalRequests || 4} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1.5 block text-muted">
                Total Broadcasts
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW LIFELINK WORKS (4-STEP CONNECTED LOOP) ──────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <div className="section-label mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Connected Medical Pipeline</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight font-heading">
            How LifeLink Coordinates Surgeries
          </h2>
          <p className="text-xs sm:text-sm max-w-xl mx-auto text-secondary">
            From hospital emergency broadcast to confirmed bedside donation in a single unified workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { num: '01', color: 'text-brand-500', bg: 'bg-brand-500/10 border-brand-500/20', title: 'Emergency Broadcast', desc: 'Patient or hospital issues an urgent blood request with ABO/Rh group, units needed, and geo-coordinates.' },
            { num: '02', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', title: 'Smart Proximity Match', desc: `Algorithm scores nearby donors against blood compatibility rules and the ${DONATION_COOLDOWN_DAYS}-day medical recovery cooldown.` },
            { num: '03', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', title: 'Donor Response', desc: 'Matched standby donors receive high-priority alerts and pledge their donation directly to the hospital.' },
            { num: '04', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20', title: 'Bedside Fulfilment', desc: 'Hospital confirms the donation receipt, automatically updates inventory records, and closes the request.' },
          ].map(({ num, color, bg, title, desc }) => (
            <Card key={num} hover className="relative flex flex-col justify-between">
              <div>
                <div className={`w-10 h-10 rounded-2xl font-black flex items-center justify-center mb-4 text-xs border ${bg} ${color}`}>
                  {num}
                </div>
                <h3 className="text-base font-bold text-primary mb-2 font-heading">{title}</h3>
                <p className="text-xs leading-relaxed text-secondary">{desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 4. LIVE EMERGENCY BROADCASTS SECTION ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="section-label mb-2">
              <Activity className="w-3.5 h-3.5 animate-pulse text-brand-500" />
              <span>Live Emergency Stream</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-primary font-heading">
              Urgent Active Broadcasts
            </h2>
          </div>
          <Link
            to="/emergency-request"
            className="text-xs font-bold flex items-center transition-colors text-brand-400 hover:text-brand-500 hover:underline"
          >
            <span>Broadcast New Request</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {pledgeMsg && (
          <div className="p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <CheckCircle2 className="w-5 h-5 mr-2.5 shrink-0 text-teal-400" />
            <span>{pledgeMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : openRequests.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-teal-500/10 text-teal-400 mb-3 border border-teal-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-primary">All Emergency Needs Met</h3>
            <p className="text-muted text-xs mt-1">There are currently no open blood requests awaiting donors.</p>
          </Card>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {openRequests.map((req) => (
              <StaggerItem key={req._id}>
                <RequestCard
                  request={req}
                  onPledge={handlePledge}
                  isPledging={pledgingId === req._id}
                  pledgeText="Pledge Donation"
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </section>

      {/* ── 5. WHY DONATE SECTION ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight font-heading">
            Why Standby Donors Matter
          </h2>
          <p className="text-xs sm:text-sm max-w-lg mx-auto text-secondary">
            Your single donation provides the critical buffer in trauma, intensive care, and neonatal surgeries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hover title="Save Up to 3 Lives" icon={Heart}>
            <p className="text-xs leading-relaxed mt-2 text-secondary">
              A single whole blood donation is fractionated into concentrated red cells, fresh frozen plasma, and platelets — supporting up to three distinct medical patients.
            </p>
          </Card>

          <Card hover title={`${DONATION_COOLDOWN_DAYS}-Day Safety Recovery`} icon={ShieldCheck}>
            <p className="text-xs leading-relaxed mt-2 text-secondary">
              LifeLink automatically calculates recovery windows from your last recorded donation date, protecting donor cardiovascular health through programmatic cooldowns.
            </p>
          </Card>

          <Card hover title="Zero Spam Notifications" icon={Zap}>
            <p className="text-xs leading-relaxed mt-2 text-secondary">
              You only receive alerts when a verified hospital within your target radius requests your compatible blood type, keeping communications high-priority and actionable.
            </p>
          </Card>
        </div>
      </section>
    </PageTransition>
  );
};

export default Home;
