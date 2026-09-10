import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartHandshake, 
  Activity, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  MapPin, 
  Clock,
  ArrowRight,
  CheckCircle2,
  Syringe,
  AlertCircle,
  BarChart3,
  Users
} from 'lucide-react';
import AIChatWidget from '../../components/ai/AIChatWidget';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-white border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-50 via-white to-white -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold uppercase tracking-wider mb-6">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>AI-Driven Emergency Blood Matching</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                Connecting Lifesaving Donors to Emergency Needs in <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-rose-400">Real Time</span>.
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                LifeLink intelligently matches eligible blood donors with urgent requests using blood compatibility, location proximity, donor availability, and smart matching technology.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
                <Link
                  to="/emergency-request"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-base shadow-lg shadow-rose-600/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
                >
                  <Activity className="w-5 h-5 animate-pulse" />
                  <span>Create Emergency Request</span>
                </Link>

                <Link
                  to="/find-donors"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 font-bold text-base transition-all flex items-center justify-center space-x-2"
                >
                  <Search className="w-5 h-5 text-slate-400" />
                  <span>Find a Donor</span>
                </Link>
              </div>

              {/* Trust Row */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" /> Smart Matching</div>
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" /> Verified Donors</div>
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" /> Hospital Connected</div>
                <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" /> Emergency Ready</div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="block mt-12 lg:mt-0 relative h-64 lg:h-full w-full max-w-sm mx-auto lg:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-100 to-rose-50 rounded-[3rem] transform rotate-3 scale-105 opacity-50"></div>
              <div className="relative bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-8 h-full flex flex-col justify-center items-center">
                <div className="relative w-64 h-64 [perspective:1000px]">
                  {/* Outer Spinning Circle with Nodes */}
                  <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full animate-spin-slow">
                    {/* Network Nodes (Now they orbit with the circle) */}
                    <div className="absolute top-0 left-1/2 -mt-3 -ml-3 w-6 h-6 bg-white border-4 border-rose-500 rounded-full"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 bg-white border-4 border-amber-500 rounded-full"></div>
                    <div className="absolute bottom-12 left-2 w-6 h-6 bg-white border-4 border-sky-500 rounded-full"></div>
                  </div>

                  {/* Inner Spinning Circle */}
                  <div className="absolute inset-4 border-2 border-dashed border-rose-200 rounded-full animate-spin-reverse-slow"></div>
                  
                  {/* Center Heart Icon (Flipping left to right) */}
                  <div className="absolute inset-0 flex items-center justify-center [perspective:1000px]">
                    <div className="animate-flip-y">
                      <div className="w-20 h-20 bg-rose-600 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-rose-600/30">
                        <HeartHandshake className="w-10 h-10 text-white -rotate-45" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE PLATFORM IMPACT */}
      <section className="py-10 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center divide-x divide-slate-800">
            <div className="px-2">
              <p className="text-xl md:text-2xl font-black text-white mb-1">24/7</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Emergency Matching</p>
            </div>
            <div className="px-2">
              <p className="text-xl md:text-2xl font-black text-rose-400 mb-1">Smart</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blood Compatibility</p>
            </div>
            <div className="px-2">
              <p className="text-xl md:text-2xl font-black text-amber-400 mb-1">Location</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Based Matching</p>
            </div>
            <div className="px-2">
              <p className="text-xl md:text-2xl font-black text-emerald-400 mb-1">56-Day</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Donation Validation</p>
            </div>
            <div className="px-2 col-span-2 md:col-span-1 border-l-0 md:border-l border-slate-800 mt-4 md:mt-0">
              <p className="text-xl md:text-2xl font-black text-sky-400 mb-1">AI</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Powered Insights</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TWO USER PATHS */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">How Can LifeLink Help You?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Need Blood Card */}
            <div className="bg-white rounded-3xl p-10 border border-rose-100 shadow-xl shadow-rose-100/50 flex flex-col items-center text-center transform transition-transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">I Need Blood</h3>
              <p className="text-slate-600 mb-8 flex-1">
                For patients, families, and hospitals requesting urgent blood. Find a compatible donor within your geographical proximity instantly.
              </p>
              <Link
                to="/emergency-request"
                className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-md"
              >
                Create Emergency Request
              </Link>
            </div>

            {/* Want to Donate Card */}
            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center transform transition-transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mb-6">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">I Want to Donate</h3>
              <p className="text-slate-600 mb-8 flex-1">
                Join the LifeLink network and become available when someone needs you. Get notified when your blood type is required nearby.
              </p>
              <Link
                to="/register"
                className="w-full py-4 rounded-xl bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-bold transition-colors shadow-sm"
              >
                Become a Donor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW LIFELINK WORKS */}
      <section id="how-it-works" className="py-24 bg-white border-t border-slate-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-rose-600 uppercase tracking-widest mb-2">The Process</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">How LifeLink Works</h3>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 relative z-10">
              {[
                { step: '01', title: 'Emergency Request', desc: 'Hospital or recipient logs urgent blood need.', icon: Activity },
                { step: '02', title: 'Smart Matching', desc: 'Evaluates compatibility, distance & eligibility.', icon: Cpu },
                { step: '03', title: 'Donor Alert', desc: 'Eligible donors receive immediate notifications.', icon: Zap },
                { step: '04', title: 'Donation Pledged', desc: 'Donor accepts and confirms availability.', icon: HeartHandshake },
                { step: '05', title: 'Hospital Verification', desc: 'The hospital verifies the donation locally.', icon: ShieldCheck },
                { step: '06', title: 'Impact Logged', desc: 'Donation recorded, inventory updated.', icon: BarChart3 }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:border-rose-200 group-hover:text-rose-600 transition-colors shadow-sm mb-4 bg-clip-padding relative z-10">
                    <item.icon className="w-6 h-6" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {item.step}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SMART MATCHING ENGINE */}
      <section className="py-24 bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-2">Technology</h2>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">Built for Every Second That Matters</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mb-6 border border-rose-500/20">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Rule-Based Matching</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Evaluates blood compatibility, GeoJSON proximity, 56-day donation cooldown rules, and donor eligibility to find the perfect match instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">AI Intelligence Layer</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Analyzes network activity and generates narrative logistics insights, demand trends, and risk warnings to optimize regional supply.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mb-6 border border-sky-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Role-Based Dashboards</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Dedicated secure experiences tailored for Donors, Recipients, Hospitals, and Administrators to streamline the entire donation lifecycle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY LIFELINK */}
      <section className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
                Designed for Trust. <br className="hidden sm:block" />
                <span className="text-rose-600">Built for Emergencies.</span>
              </h2>
              <p className="text-slate-600 text-lg mb-8">
                In critical situations, reliability is everything. LifeLink removes the friction from blood donation by automating the validation and matching process.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                {[
                  'Smart Donor Matching',
                  'Blood Compatibility Validation',
                  'Location-Based Prioritization',
                  'Verified Hospital Workflow',
                  'Donation Cooldown Protection',
                  'Secure Role-Based Access'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="min-w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-12 shadow-sm">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex items-start space-x-4">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1">O- Negative Required</h5>
                  <p className="text-xs text-slate-500 mb-2">City Hospital · 2.4 miles away</p>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[10px] font-bold uppercase">Critical</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm flex items-start space-x-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1">Donor Match Found</h5>
                  <p className="text-xs text-slate-500 mb-2">Donor accepted and is en route.</p>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase">Pledged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. EMERGENCY CTA */}
      <section className="py-20 bg-rose-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Syringe className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-6">
            Need Blood Urgently?
          </h2>
          <p className="text-rose-100 text-lg mb-10 max-w-2xl mx-auto">
            Create an emergency request immediately. LifeLink will instantly identify and notify eligible donors in your network based on location and compatibility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/emergency-request"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-rose-600 hover:bg-slate-50 font-bold text-base shadow-xl transition-colors"
            >
              Create Emergency Request
            </Link>
            <Link
              to="/find-donors"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-rose-700/50 hover:bg-rose-700 text-white border border-rose-500/50 font-bold text-base transition-colors"
            >
              Find Available Donors
            </Link>
          </div>
        </div>
      </section>

      {/* Floating AI Chat Assistant */}
      <AIChatWidget />
    </div>
  );
};

export default Home;
