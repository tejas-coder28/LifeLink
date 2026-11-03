import React from 'react';
import Card from '../../components/common/Card';
import PageTransition from '../../components/common/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/common/StaggerList';
import { HeartHandshake, ShieldCheck, Activity, Cpu, MapPin, Zap, CheckCircle2 } from 'lucide-react';
import { DONATION_COOLDOWN_DAYS } from '../../utils/bloodCompatibility';

const features = [
  {
    icon: MapPin,
    title: 'Proximity-Based Matching',
    desc: 'Uses geospatial indexing to locate available donors within precise distance radii from the requesting hospital.',
    iconClass: 'text-info',
    bgClass: 'bg-info/10 border-info/20',
  },
  {
    icon: Activity,
    title: 'Blood Compatibility Engine',
    desc: 'Enforces strict compatibility rules (O− universal donor, AB+ universal recipient) across all matching queries.',
    iconClass: 'text-danger',
    bgClass: 'bg-danger/10 border-danger/20',
  },
  {
    icon: ShieldCheck,
    title: `${DONATION_COOLDOWN_DAYS}-Day Safety Cooldown`,
    desc: `Automatically tracks time since last donation and prevents requests to donors still within their ${DONATION_COOLDOWN_DAYS}-day recovery window.`,
    iconClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
  },
  {
    icon: Cpu,
    title: 'AI Insights Layer',
    desc: 'Generates regional blood reserve analytics and predictive alerts for hospital inventory management.',
    iconClass: 'text-info',
    bgClass: 'bg-info/10 border-info/20',
  },
  {
    icon: Zap,
    title: 'Real-Time Alerts',
    desc: 'Donors receive high-priority notifications the moment a hospital within their area broadcasts a matching request.',
    iconClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  {
    icon: HeartHandshake,
    title: 'Role-Based Portals',
    desc: 'Three distinct dashboards for Donors, Hospitals, and Admins — each with tailored workflows and data views.',
    iconClass: 'text-info',
    bgClass: 'bg-info/10 border-info/20',
  },
];

const steps = [
  { step: '01', title: 'Broadcast', desc: 'Patient or hospital submits an emergency request specifying blood group, units, and location.' },
  { step: '02', title: 'Match', desc: 'The engine finds compatible donors within range, filtered by blood type and cooldown eligibility.' },
  { step: '03', title: 'Respond', desc: 'Matched donors receive an alert and can accept or decline the request from their dashboard.' },
  { step: '04', title: 'Fulfil', desc: 'Hospital confirms the donation, updates inventory, and closes the request as fulfilled.' },
];

const About = () => {
  return (
    <PageTransition className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="section-label mx-auto w-fit">
          <HeartHandshake className="w-3.5 h-3.5 text-danger" />
          <span>How LifeLink Works</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight font-heading">
          About <span className="text-danger">LifeLink</span>
        </h1>
        <p className="text-sm sm:text-base text-secondary max-w-2xl mx-auto leading-relaxed">
          LifeLink is an emergency response web application that connects standby blood donors, individuals in urgent need, and hospital blood banks with real-time geospatial matching, compatibility verification, and cooldown tracking.
        </p>
      </div>

      {/* Core Features */}
      <div>
        <h2 className="text-xl font-black text-primary mb-6 font-heading">Core Capabilities</h2>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <StaggerItem key={i}>
                <Card hover className="h-full flex flex-col justify-between">
                  <div>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border ${f.bgClass}`}>
                      <Icon className={`w-5 h-5 ${f.iconClass}`} />
                    </div>
                    <h3 className="text-base font-bold text-primary mb-2 font-heading">{f.title}</h3>
                    <p className="text-xs leading-relaxed text-secondary">{f.desc}</p>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>

      {/* 4-Step Pipeline */}
      <div>
        <h2 className="text-xl font-black text-primary mb-6 font-heading">The Lifesaving Loop</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="glass-card p-5 flex items-center gap-5 border border-hairline rounded-2xl hover:border-info/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/30 flex items-center justify-center font-heading font-black text-info text-lg shrink-0">
                {s.step}
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">{s.title}</h4>
                <p className="text-xs text-secondary mt-0.5 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Safety Standards */}
      <Card hover={false} className="p-6 sm:p-8 bg-surface border border-hairline">
        <h3 className="text-base font-bold text-primary mb-2 font-heading flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-success" />
          Clinical Guidelines &amp; Recovery Rules
        </h3>
        <p className="text-xs leading-relaxed text-secondary mb-4">
          LifeLink adheres to universal blood banking protocols. A strict {DONATION_COOLDOWN_DAYS}-day waiting period is enforced between whole blood donations to protect donor health. Our matching algorithms automatically omit unavailable or recovering donors from query results, ensuring hospitals only connect with medically eligible candidates.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-primary">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-hairline font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> ABO &amp; Rh Compatibility
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-hairline font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> {DONATION_COOLDOWN_DAYS}-Day Cooldown Enforcement
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-hairline font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Real-Time Geographic Radius
          </span>
        </div>
      </Card>
    </PageTransition>
  );
};

export default About;
