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
    iconClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    icon: Activity,
    title: 'Blood Compatibility Engine',
    desc: 'Enforces strict compatibility rules (O− universal donor, AB+ universal recipient) across all matching queries.',
    iconClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    icon: ShieldCheck,
    title: `${DONATION_COOLDOWN_DAYS}-Day Safety Cooldown`,
    desc: `Automatically tracks time since last donation and prevents requests to donors still within their ${DONATION_COOLDOWN_DAYS}-day recovery window.`,
    iconClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10 border-teal-500/20',
  },
  {
    icon: Cpu,
    title: 'AI Insights Layer',
    desc: 'Generates regional blood reserve analytics and predictive alerts for hospital inventory management.',
    iconClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Zap,
    title: 'Real-Time Alerts',
    desc: 'Donors receive high-priority notifications the moment a hospital within their area broadcasts a matching request.',
    iconClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    icon: HeartHandshake,
    title: 'Role-Based Portals',
    desc: 'Three distinct dashboards for Donors, Hospitals, and Admins — each with tailored workflows and data views.',
    iconClass: 'text-brand-500',
    bgClass: 'bg-brand-500/10 border-brand-500/20',
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
          <HeartHandshake className="w-3.5 h-3.5 text-brand-500" />
          <span>How LifeLink Works</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-primary tracking-tight font-heading">
          About <span className="gradient-text-brand">LifeLink</span>
        </h1>
        <p className="text-xs sm:text-sm max-w-xl mx-auto leading-relaxed text-secondary">
          LifeLink is a role-based emergency blood donation platform built for speed, safety, and real-time coordination between donors, hospitals, and patients.
        </p>
      </div>

      {/* Mission statement */}
      <div className="hero-glass-card p-8 sm:p-10 text-center space-y-3 rounded-3xl border border-glass shadow-card">
        <p className="text-lg sm:text-xl font-black text-primary font-heading leading-snug">
          "Every second matters in a blood emergency.
          <span className="gradient-text-brand"> LifeLink removes the delay.</span>"
        </p>
        <p className="text-xs sm:text-sm text-secondary">
          From broadcast to donor response in under 60 seconds with smart matching.
        </p>
      </div>

      {/* Feature grid */}
      <div>
        <h2 className="text-2xl font-black text-primary mb-6 font-heading text-center">Core Platform Features</h2>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc, iconClass, bgClass }) => (
            <StaggerItem key={title}>
              <Card hover className="flex items-start gap-4 h-full">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${bgClass}`}>
                  <Icon className={`w-5 h-5 ${iconClass}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary mb-1 font-heading">{title}</h3>
                  <p className="text-xs leading-relaxed text-secondary">{desc}</p>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* How it works steps */}
      <div>
        <h2 className="text-2xl font-black text-primary mb-6 font-heading text-center">The Request Lifecycle</h2>
        <StaggerContainer className="space-y-3">
          {steps.map(({ step, title, desc }) => (
            <StaggerItem key={step}>
              <div className="glass-card p-5 flex items-center gap-5 border border-glass rounded-2xl hover:border-brand-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center font-heading font-black text-brand-500 text-lg shrink-0">
                  {step}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary font-heading">{title}</h4>
                  <p className="text-xs mt-0.5 text-secondary">{desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};

export default About;
