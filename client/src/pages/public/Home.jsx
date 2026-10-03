import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../api/analyticsApi';
import { requestApi } from '../../api/requestApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import RequestCard from '../../components/cards/RequestCard';
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
  PhoneCall,
  Search,
  ChevronRight
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
    <div className="space-y-16 pb-12">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="section-label">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Smart Emergency Blood Match Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-primary tracking-tight leading-none font-heading">
              Connecting blood donors with <br className="hidden sm:block" />
              <span className="gradient-text-brand">those who need them.</span>
            </h1>

            <p className="text-base sm:text-lg font-medium max-w-2xl mx-auto leading-relaxed text-secondary">
              LifeLink connects standby donors, hospital blood banks, and patients through real-time smart matching, blood compatibility checks, and safe donor cooldown tracking.
            </p>

            {/* CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={user ? '/donor/dashboard' : '/register'}
                className="btn-primary w-full sm:w-auto px-8 py-4 text-sm"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Donate Blood Now</span>
              </Link>

              <Link
                to="/emergency-request"
                className="btn-secondary w-full sm:w-auto px-8 py-4 text-sm"
              >
                <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Request Emergency Blood</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTICS COUNTER SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden border border-theme shadow-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <span className="text-3xl sm:text-4xl font-black block font-heading text-rose-600 dark:text-rose-400">
                {stats?.totalDonors || 10}+
              </span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1 block text-muted">
                Registered Donors
              </span>
            </div>

            <div>
              <span className="text-3xl sm:text-4xl font-black block font-heading text-teal-600 dark:text-teal-400">
                {stats?.availableDonors || 8}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1 block text-muted">
                Active Donors
              </span>
            </div>

            <div>
              <span className="text-3xl sm:text-4xl font-black block font-heading text-sky-600 dark:text-sky-400">
                {stats?.fulfilledRequests || 1}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1 block text-muted">
                Requests Fulfilled
              </span>
            </div>

            <div>
              <span className="text-3xl sm:text-4xl font-black block font-heading text-amber-600 dark:text-amber-400">
                {stats?.totalRequests || 2}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1 block text-muted">
                Total Requests
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW LIFELINK WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-primary tracking-tight font-heading">How LifeLink Works</h2>
          <p className="text-sm max-w-xl mx-auto text-secondary">
            A single connected loop — from emergency broadcast to fulfilled donation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { num: 1, color: '#e11d48', bg: 'rgba(220,38,38,0.12)', title: 'Emergency Broadcast', desc: 'A patient or hospital submits a blood request with blood group, units needed, and location.' },
            { num: 2, color: '#0284c7', bg: 'rgba(59,158,255,0.12)', title: 'Smart Matching', desc: `The engine ranks compatible nearby donors by proximity, blood type, and ${DONATION_COOLDOWN_DAYS}-day safety cooldown.` },
            { num: 3, color: '#d97706', bg: 'rgba(245,158,11,0.12)', title: 'Donor Response', desc: 'Matched donors accept the request and pledge blood directly to the hospital.' },
            { num: 4, color: '#0d9488', bg: 'rgba(34,200,160,0.12)', title: 'Request Fulfilled', desc: 'Hospital confirms the donation, updates inventory, and marks the request complete.' },
          ].map(({ num, color, bg, title, desc }) => (
            <Card key={num} hover className="relative">
              <div className="w-10 h-10 rounded-2xl font-black flex items-center justify-center mb-4 text-sm" style={{ background: bg, color }}>
                {num}
              </div>
              <h3 className="text-base font-bold text-primary mb-2 font-heading">{title}</h3>
              <p className="text-xs leading-relaxed text-secondary">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* EMERGENCY BLOOD REQUESTS LIVE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="section-label mb-2">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Live Emergency Broadcast</span>
            </div>
            <h2 className="text-2xl font-black text-primary font-heading">Urgent Active Demands</h2>
          </div>
          <Link
            to="/emergency-request"
            className="text-xs font-bold flex items-center transition-colors text-rose-600 dark:text-rose-400 hover:underline"
          >
            <span>Create Emergency Request</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {pledgeMsg && (
          <div className="p-4 rounded-2xl text-sm font-semibold flex items-center bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300">
            <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 text-teal-600 dark:text-teal-400" />
            {pledgeMsg}
          </div>
        )}

        {loading ? (
          <Loader text="Fetching open emergency requests..." />
        ) : openRequests.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <p className="text-muted text-sm">No open blood requests currently broadcast.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {openRequests.map((req) => (
              <RequestCard
                key={req._id}
                request={req}
                onPledge={handlePledge}
                isPledging={pledgingId === req._id}
                pledgeText="Pledge Donation"
              />
            ))}
          </div>
        )}
      </section>

      {/* WHY DONATE BLOOD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-primary tracking-tight font-heading">Why Donate with LifeLink?</h2>
          <p className="text-sm max-w-lg mx-auto text-secondary">
            Directly impact emergency surgeries, trauma care, and recovery in your community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hover title="Save Up to 3 Lives" icon={Heart}>
            <p className="text-xs leading-relaxed mt-2 text-secondary">
              One whole blood donation separates into red cells, plasma, and platelets — helping up to three patients.
            </p>
          </Card>

          <Card hover title={`${DONATION_COOLDOWN_DAYS}-Day Safety Cooldown`} icon={ShieldCheck}>
            <p className="text-xs leading-relaxed mt-2 text-secondary">
              LifeLink automatically tracks your last donation date and enforces a {DONATION_COOLDOWN_DAYS}-day recovery period to keep you safe.
            </p>
          </Card>

          <Card hover title="Real-Time Alerts" icon={Zap}>
            <p className="text-xs leading-relaxed mt-2 text-secondary">
              Get notified the moment a hospital near you needs your blood group — every second counts in an emergency.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
