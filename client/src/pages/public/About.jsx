import React from 'react';
import Card from '../../components/common/Card';
import { HeartHandshake, ShieldCheck, Activity, Cpu, MapPin, Zap } from 'lucide-react';
import { DONATION_COOLDOWN_DAYS } from '../../utils/bloodCompatibility';

const features = [
  {
    icon: MapPin,
    title: 'Proximity-Based Matching',
    desc: 'Uses geospatial indexing to locate available donors within precise distance radii from the requesting hospital.',
    color: '#fb7185',
    bg: 'rgba(220,38,38,0.12)',
  },
  {
    icon: Activity,
    title: 'Blood Compatibility Engine',
    desc: 'Enforces strict compatibility rules (O− universal donor, AB+ universal recipient) across all matching queries.',
    color: '#93c5fd',
    bg: 'rgba(59,158,255,0.12)',
  },
  {
    icon: ShieldCheck,
    title: `${DONATION_COOLDOWN_DAYS}-Day Safety Cooldown`,
    desc: `Automatically tracks time since last donation and prevents requests to donors still within their ${DONATION_COOLDOWN_DAYS}-day recovery window.`,
    color: '#5eead4',
    bg: 'rgba(34,200,160,0.12)',
  },
  {
    icon: Cpu,
    title: 'AI Insights Layer',
    desc: 'Generates regional blood reserve analytics and predictive alerts for hospital inventory management.',
    color: '#fcd34d',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    icon: Zap,
    title: 'Real-Time Alerts',
    desc: 'Donors receive high-priority notifications the moment a hospital within their area broadcasts a matching request.',
    color: '#a5b4fc',
    bg: 'rgba(129,140,248,0.12)',
  },
  {
    icon: HeartHandshake,
    title: 'Role-Based Portals',
    desc: 'Three distinct dashboards for Donors, Hospitals, and Admins — each with tailored workflows and data views.',
    color: '#fb7185',
    bg: 'rgba(220,38,38,0.10)',
  },
];

const About = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 page-enter">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="section-label mx-auto w-fit">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>How LifeLink Works</span>
        </div>
        <h1 className="text-4xl font-black text-primary tracking-tight font-heading">
          About <span className="gradient-text-brand">LifeLink</span>
        </h1>
        <p className="text-sm max-w-xl mx-auto leading-relaxed text-secondary">
          LifeLink is a role-based emergency blood donation platform built for speed, safety, and real-time coordination between donors, hospitals, and patients.
        </p>
      </div>

      {/* Mission statement */}
      <div
        className="glass-card p-8 text-center space-y-3 rounded-3xl border-theme"
      >
        <p className="text-lg font-black text-primary font-heading leading-snug">
          "Every second matters in a blood emergency.
          <span className="gradient-text-brand"> LifeLink removes the delay.</span>"
        </p>
        <p className="text-xs text-secondary">
          From broadcast to donor response in under 60 seconds with smart matching.
        </p>
      </div>

      {/* Feature grid */}
      <div>
        <h2 className="text-2xl font-black text-primary mb-6 font-heading text-center">Core Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <Card key={title} hover className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary mb-1 font-heading">{title}</h3>
                <p className="text-xs leading-relaxed text-secondary">{desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works steps */}
      <div>
        <h2 className="text-2xl font-black text-primary mb-6 font-heading text-center">The Request Lifecycle</h2>
        <div className="space-y-3">
          {[
            { step: '01', title: 'Broadcast', desc: 'Patient or hospital submits an emergency request specifying blood group, units, and location.' },
            { step: '02', title: 'Match', desc: 'The engine finds compatible donors within range, filtered by blood type and cooldown eligibility.' },
            { step: '03', title: 'Respond', desc: 'Matched donors receive an alert and can accept or decline the request from their dashboard.' },
            { step: '04', title: 'Fulfil', desc: 'Hospital confirms the donation, updates inventory, and closes the request as fulfilled.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="glass-card p-5 flex items-center gap-5 border-theme">
              <span
                className="text-2xl font-black shrink-0 font-heading"
                style={{ color: 'rgba(220,38,38,0.50)', minWidth: '2.5rem' }}
              >
                {step}
              </span>
              <div>
                <h4 className="text-sm font-bold text-primary font-heading">{title}</h4>
                <p className="text-xs mt-0.5 text-secondary">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;
